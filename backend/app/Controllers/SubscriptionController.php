<?php
// backend/app/Controllers/SubscriptionController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class SubscriptionController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $isCustomer = Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin', 'operations', 'finance');

        $sql = "
            SELECT 
                s.*,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                a.recipient_name,
                a.area_name,
                a.street_address,
                p.name as product_name,
                p.volume_label,
                si.quantity,
                si.unit_price,
                (si.quantity * si.unit_price) as total_per_cycle
            FROM subscriptions s
            JOIN customers c ON c.id = s.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = s.address_id
            JOIN subscription_items si ON si.subscription_id = s.id
            JOIN products p ON p.id = si.product_id
            WHERE 1=1
        ";

        $params = [];
        if ($isCustomer) {
            $sql .= " AND s.customer_id = :cid ";
            $params['cid'] = $user['customer_id'];
        }

        $sql .= " ORDER BY s.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::forbidden('Only registered customers can create water subscriptions.');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'address_id' => 'required|numeric',
            'product_id' => 'required|numeric',
            'quantity'   => 'required|numeric',
            'frequency'  => 'required|in:daily,weekly,biweekly,monthly,custom',
            'start_date' => 'required'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $db = Database::getConnection();

        // Validate address
        $addrStmt = $db->prepare("SELECT id, approval_status FROM addresses WHERE id = :aid AND customer_id = :cid LIMIT 1");
        $addrStmt->execute(['aid' => $data['address_id'], 'cid' => $customerId]);
        $addr = $addrStmt->fetch();

        if (!$addr || $addr['approval_status'] !== 'approved') {
            Response::error('Subscriptions require an approved delivery address.', 400);
        }

        // Validate product
        $prodStmt = $db->prepare("SELECT id, unit_price FROM products WHERE id = :pid AND is_active = 1 LIMIT 1");
        $prodStmt->execute(['pid' => $data['product_id']]);
        $prod = $prodStmt->fetch();

        if (!$prod) {
            Response::error('Selected product is not available for recurring subscription.', 400);
        }

        $subCode = 'SUB-' . date('Y') . '-' . strtoupper(substr(uniqid(), -5));
        $qty = (int)$data['quantity'];
        $unitPrice = (float)$prod['unit_price'];

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO subscriptions (
                    subscription_code, customer_id, address_id, frequency,
                    preferred_time_slot, start_date, status, special_notes
                ) VALUES (
                    :code, :cid, :aid, :freq, :slot, :sdate, 'active', :notes
                )
            ");
            $stmt->execute([
                'code'  => $subCode,
                'cid'   => $customerId,
                'aid'   => $data['address_id'],
                'freq'  => $data['frequency'],
                'slot'  => $data['preferred_time_slot'] ?? '09:00 AM - 12:00 PM',
                'sdate' => $data['start_date'],
                'notes' => trim($data['special_notes'] ?? '')
            ]);
            $subId = (int)$db->lastInsertId();

            $siStmt = $db->prepare("INSERT INTO subscription_items (subscription_id, product_id, quantity, unit_price) VALUES (:sid, :pid, :qty, :price)");
            $siStmt->execute([
                'sid'   => $subId,
                'pid'   => $data['product_id'],
                'qty'   => $qty,
                'price' => $unitPrice
            ]);

            // Pre-generate the first scheduled occurrence
            $occStmt = $db->prepare("INSERT INTO subscription_occurrences (subscription_id, scheduled_date, status) VALUES (:sid, :sdate, 'scheduled')");
            $occStmt->execute([
                'sid'   => $subId,
                'sdate' => $data['start_date']
            ]);

            $db->commit();
            Audit::log('create_subscription', 'subscriptions', $subId);

            Response::success([
                'id'                => $subId,
                'subscription_code' => $subCode
            ], 'Subscription plan activated successfully.', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to create subscription: ' . $e->getMessage(), 500);
        }
    }

    public static function pause(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $sub = self::findSub($db, $id, $user);
        $db->prepare("UPDATE subscriptions SET status = 'paused' WHERE id = :id")->execute(['id' => $id]);
        Audit::log('pause_subscription', 'subscriptions', $id);
        Response::success(null, 'Subscription paused. Deliveries on hold.');
    }

    public static function resume(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $sub = self::findSub($db, $id, $user);
        $db->prepare("UPDATE subscriptions SET status = 'active' WHERE id = :id")->execute(['id' => $id]);
        Audit::log('resume_subscription', 'subscriptions', $id);
        Response::success(null, 'Subscription resumed.');
    }

    public static function cancel(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $sub = self::findSub($db, $id, $user);
        $db->prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = :id")->execute(['id' => $id]);
        Audit::log('cancel_subscription', 'subscriptions', $id);
        Response::success(null, 'Subscription cancelled.');
    }

    public static function generateOrder(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        // Fetch subscription details
        $stmt = $db->prepare("
            SELECT s.*, si.product_id, si.quantity, si.unit_price, COALESCE(sa.delivery_fee, 0.00) as delivery_fee, p.refundable_deposit
            FROM subscriptions s
            JOIN subscription_items si ON si.subscription_id = s.id
            JOIN addresses a ON a.id = s.address_id
            JOIN service_areas sa ON sa.id = a.service_area_id
            JOIN products p ON p.id = si.product_id
            WHERE s.id = :id AND s.status = 'active'
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $sub = $stmt->fetch();

        if (!$sub) {
            Response::error('Active subscription not found.', 404);
        }

        $scheduledDate = date('Y-m-d');
        // Check uniqueness: SRS FR-06: The system must generate no more than one order for each subscription and scheduled date
        $chkOcc = $db->prepare("SELECT id, order_id FROM subscription_occurrences WHERE subscription_id = :sid AND scheduled_date = :sdate AND order_id IS NOT NULL LIMIT 1");
        $chkOcc->execute(['sid' => $id, 'sdate' => $scheduledDate]);
        if ($chkOcc->fetch()) {
            Response::error("An order for this subscription has already been generated for today ({$scheduledDate}).", 409);
        }

        $orderNumber = 'ORD-SUB-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $qty = (int)$sub['quantity'];
        $unitPrice = (float)$sub['unit_price'];
        $subtotal = round($qty * $unitPrice, 2);
        $deliveryFee = (float)$sub['delivery_fee'];
        $total = round($subtotal + $deliveryFee, 2);

        $db->beginTransaction();
        try {
            $ordStmt = $db->prepare("
                INSERT INTO orders (
                    order_number, customer_id, address_id, order_status, payment_status,
                    payment_method, subtotal_amount, delivery_fee, deposit_amount,
                    discount_amount, total_amount, delivery_date, time_slot, special_instructions
                ) VALUES (
                    :num, :cid, :aid, 'pending', 'pending',
                    'cash_on_delivery', :subtotal, :dfee, 0.00,
                    0.00, :total, :ddate, :slot, 'Generated from Subscription #'
                )
            ");
            $ordStmt->execute([
                'num'      => $orderNumber,
                'cid'      => $sub['customer_id'],
                'aid'      => $sub['address_id'],
                'subtotal' => $subtotal,
                'dfee'     => $deliveryFee,
                'total'    => $total,
                'ddate'    => $scheduledDate,
                'slot'     => $sub['preferred_time_slot']
            ]);
            $orderId = (int)$db->lastInsertId();

            // Order items
            $prodStmt = $db->prepare("SELECT name, slug, volume_ml, refundable_deposit FROM products WHERE id = :pid");
            $prodStmt->execute(['pid' => $sub['product_id']]);
            $prod = $prodStmt->fetch();

            $itemStmt = $db->prepare("
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku, volume_ml,
                    unit_price, deposit_per_unit, quantity, total_price, total_deposit
                ) VALUES (
                    :oid, :pid, :name, :sku, :vol, :price, 0.00, :qty, :tprice, 0.00
                )
            ");
            $itemStmt->execute([
                'oid'    => $orderId,
                'pid'    => $sub['product_id'],
                'name'   => $prod['name'],
                'sku'    => $prod['slug'],
                'vol'    => $prod['volume_ml'],
                'price'  => $unitPrice,
                'qty'    => $qty,
                'tprice' => $subtotal
            ]);

            // Reserve stock
            $db->prepare("INSERT INTO inventory_reservations (order_id, product_id, quantity, status) VALUES (:oid, :pid, :qty, 'active')")
               ->execute(['oid' => $orderId, 'pid' => $sub['product_id'], 'qty' => $qty]);
            $db->prepare("UPDATE inventory_balances SET quantity_reserved = quantity_reserved + :qty WHERE product_id = :pid")
               ->execute(['pid' => $sub['product_id'], 'qty' => $qty]);

            // Record occurrence
            $occ = $db->prepare("
                INSERT INTO subscription_occurrences (subscription_id, scheduled_date, order_id, status)
                VALUES (:sid, :sdate, :oid, 'generated')
                ON DUPLICATE KEY UPDATE order_id = :oid2, status = 'generated'
            ");
            $occ->execute([
                'sid'   => $id,
                'sdate' => $scheduledDate,
                'oid'   => $orderId,
                'oid2'  => $orderId
            ]);

            $db->commit();
            Response::success(['order_id' => $orderId, 'order_number' => $orderNumber], 'Scheduled subscription order created successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to generate subscription order: ' . $e->getMessage(), 500);
        }
    }

    private static function findSub(PDO $db, int $id, array $user): array {
        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $sub = $stmt->fetch();

        if (!$sub) {
            Response::notFound('Subscription not found');
        }

        if (Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin')) {
            if ($sub['customer_id'] != $user['customer_id']) {
                Response::forbidden('Access denied');
            }
        }
        return $sub;
    }
}
