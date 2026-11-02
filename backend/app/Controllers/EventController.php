<?php
// backend/app/Controllers/EventController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class EventController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $isCustomer = Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin', 'operations', 'finance');

        $sql = "
            SELECT 
                eb.*,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                u.email as customer_email
            FROM event_bookings eb
            JOIN customers c ON c.id = eb.customer_id
            JOIN users u ON u.id = c.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($isCustomer) {
            $sql .= " AND eb.customer_id = :cid ";
            $params['cid'] = $user['customer_id'];
        }

        $sql .= " ORDER BY eb.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::forbidden('Only registered customers can book bulk event supply.');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'event_name'               => 'required|min:3',
            'event_type'               => 'required|in:wedding,birthday,seminar,corporate,meeting,other',
            'event_date'               => 'required',
            'location_address'         => 'required|min:5',
            'requested_water_quantity' => 'required'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $db = Database::getConnection();
        $code = 'EVT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $stmt = $db->prepare("
            INSERT INTO event_bookings (
                booking_code, customer_id, event_name, event_type, event_date,
                location_address, expected_guests, requested_water_quantity, status, notes
            ) VALUES (
                :code, :cid, :name, :type, :date,
                :addr, :guests, :qty, 'pending', :notes
            )
        ");
        $stmt->execute([
            'code'   => $code,
            'cid'    => $customerId,
            'name'   => trim($data['event_name']),
            'type'   => $data['event_type'],
            'date'   => $data['event_date'],
            'addr'   => trim($data['location_address']),
            'guests' => (int)($data['expected_guests'] ?? 50),
            'qty'    => trim($data['requested_water_quantity']),
            'notes'  => trim($data['notes'] ?? '')
        ]);
        $eventId = (int)$db->lastInsertId();

        Audit::log('create_event_booking', 'event_bookings', $eventId);

        Response::success([
            'id'           => $eventId,
            'booking_code' => $code
        ], 'Bulk event inquiry submitted! Our operations team will prepare a customized quotation.', 201);
    }

    public static function quote(int $id): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $amount = (float)($data['quoted_amount'] ?? 0);
        if ($amount <= 0) {
            Response::error('Please enter a valid quotation amount.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE event_bookings 
            SET quoted_amount = :amt, 
                status = 'quoted', 
                notes = CONCAT(COALESCE(notes, ''), '\n[Quotation Note: ', :notes, ']')
            WHERE id = :id
        ");
        $stmt->execute([
            'amt'   => $amount,
            'notes' => trim($data['notes'] ?? 'Quotation issued'),
            'id'    => $id
        ]);

        Audit::log('quote_event_booking', 'event_bookings', $id, null, ['amount' => $amount]);
        Response::success(null, 'Quotation sent to customer.');
    }

    public static function accept(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM event_bookings WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $event = $stmt->fetch();

        if (!$event) {
            Response::notFound('Event booking not found');
        }

        if (Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin')) {
            if ($event['customer_id'] != $user['customer_id']) {
                Response::forbidden('Access denied');
            }
        }

        $db->prepare("UPDATE event_bookings SET status = 'accepted' WHERE id = :id")->execute(['id' => $id]);
        Audit::log('accept_event_booking', 'event_bookings', $id);
        Response::success(null, 'Quotation accepted! Admin can now generate the bulk order.');
    }

    public static function convertToOrder(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT eb.*, c.user_id as customer_user_id
            FROM event_bookings eb
            JOIN customers c ON c.id = eb.customer_id
            WHERE eb.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $event = $stmt->fetch();

        if (!$event) {
            Response::notFound('Event booking not found');
        }

        if ($event['status'] !== 'accepted' && $event['status'] !== 'quoted') {
            Response::error('Event must be in quoted or accepted status to convert to order.', 400);
        }

        // Get an approved address for customer or create temporary order address
        $addrStmt = $db->prepare("SELECT id FROM addresses WHERE customer_id = :cid AND approval_status = 'approved' LIMIT 1");
        $addrStmt->execute(['cid' => $event['customer_id']]);
        $addr = $addrStmt->fetch();
        $addressId = $addr ? $addr['id'] : 1;

        $totalAmount = (float)($event['quoted_amount'] ?? 1000.00);
        $orderNumber = 'ORD-EVT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $db->beginTransaction();
        try {
            $ordStmt = $db->prepare("
                INSERT INTO orders (
                    order_number, customer_id, address_id, order_status, payment_status,
                    payment_method, subtotal_amount, delivery_fee, deposit_amount,
                    discount_amount, total_amount, delivery_date, time_slot, special_instructions
                ) VALUES (
                    :num, :cid, :aid, 'confirmed', 'pending',
                    'cash_on_delivery', :total, 0.00, 0.00,
                    0.00, :total2, :ddate, 'Special Event Time', :notes
                )
            ");
            $ordStmt->execute([
                'num'    => $orderNumber,
                'cid'    => $event['customer_id'],
                'aid'    => $addressId,
                'total'  => $totalAmount,
                'total2' => $totalAmount,
                'ddate'  => $event['event_date'],
                'notes'  => "Bulk Event Supply: {$event['event_name']} ({$event['requested_water_quantity']}) at {$event['location_address']}"
            ]);
            $orderId = (int)$db->lastInsertId();

            // Order item
            $db->prepare("
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku, volume_ml,
                    unit_price, deposit_per_unit, quantity, total_price, total_deposit
                ) VALUES (
                    :oid, 4, :pname, 'bulk-event-water', 19000,
                    :unit_price, 0.00, 1, :tot_price, 0.00
                )
            ")->execute([
                'oid'        => $orderId,
                'pname'      => "Bulk Event Water Package: {$event['event_name']}",
                'unit_price' => $totalAmount,
                'tot_price'  => $totalAmount
            ]);

            // Update event booking status
            $db->prepare("UPDATE event_bookings SET status = 'order_created' WHERE id = :id")->execute(['id' => $id]);

            $db->commit();
            Audit::log('convert_event_to_order', 'event_bookings', $id, null, ['order_id' => $orderId]);

            Response::success(['order_id' => $orderId, 'order_number' => $orderNumber], 'Event converted to official order successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to convert event: ' . $e->getMessage(), 500);
        }
    }
}
