<?php
// backend/app/Controllers/DeliveryController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class DeliveryController {
    public static function myDeliveries(): void {
        $user = AuthMiddleware::requireRoles('delivery', 'superadmin', 'admin');
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $isStaffOnly = !Auth::hasRole('superadmin', 'admin');

        $sql = "
            SELECT 
                d.*,
                o.order_number,
                o.total_amount,
                o.payment_method,
                o.payment_status,
                o.delivery_date,
                o.time_slot,
                o.special_instructions,
                a.recipient_name,
                a.phone as recipient_phone,
                a.area_name,
                a.street_address,
                a.landmark,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone
            FROM deliveries d
            JOIN orders o ON o.id = d.order_id
            JOIN customers c ON c.id = o.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = o.address_id
            WHERE 1=1
        ";

        $params = [];
        if ($isStaffOnly) {
            $sql .= " AND d.staff_user_id = :staff_id ";
            $params['staff_id'] = $user['id'];
        }
        if ($status) {
            $sql .= " AND d.status = :status ";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY (d.status = 'out_for_delivery') DESC, (d.status = 'assigned') DESC, d.assigned_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function show(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT 
                d.*,
                o.order_number,
                o.total_amount,
                o.subtotal_amount,
                o.delivery_fee,
                o.deposit_amount,
                o.payment_method,
                o.payment_status,
                o.delivery_date,
                o.time_slot,
                o.special_instructions,
                a.recipient_name,
                a.phone as recipient_phone,
                a.area_name,
                a.street_address,
                a.landmark,
                c.id as customer_id,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                rider.name as staff_name,
                rider.phone as staff_phone
            FROM deliveries d
            JOIN orders o ON o.id = d.order_id
            JOIN customers c ON c.id = o.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = o.address_id
            JOIN users rider ON rider.id = d.staff_user_id
            WHERE d.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $delivery = $stmt->fetch();

        if (!$delivery) {
            Response::notFound('Delivery not found');
        }

        // Enforce delivery staff access isolation: staff cannot access other staff's unassigned deliveries
        if (Auth::hasRole('delivery') && !Auth::hasRole('superadmin', 'admin', 'operations', 'finance')) {
            if ($delivery['staff_user_id'] != $user['id']) {
                Response::forbidden('Access restricted. This delivery is assigned to another staff member.');
            }
        }

        // Fetch order items & delivery items
        $itemStmt = $db->prepare("
            SELECT 
                oi.*,
                p.volume_label,
                p.is_reusable,
                COALESCE(di.delivered_quantity, 0) as delivered_quantity
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            LEFT JOIN delivery_items di ON di.order_item_id = oi.id AND di.delivery_id = :did
            WHERE oi.order_id = :oid
        ");
        $itemStmt->execute(['did' => $id, 'oid' => $delivery['order_id']]);
        $delivery['items'] = $itemStmt->fetchAll();

        // Fetch status history
        $histStmt = $db->prepare("
            SELECT dsh.*, u.name as changed_by_name
            FROM delivery_status_history dsh
            LEFT JOIN users u ON u.id = dsh.changed_by
            WHERE dsh.delivery_id = :did
            ORDER BY dsh.created_at ASC
        ");
        $histStmt->execute(['did' => $id]);
        $delivery['status_history'] = $histStmt->fetchAll();

        Response::success($delivery);
    }

    public static function updateStatus(int $id): void {
        $user = AuthMiddleware::requireRoles('delivery', 'superadmin', 'admin');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $newStatus = $data['status'] ?? '';
        $validStatuses = ['out_for_delivery', 'delivered', 'failed'];
        if (!in_array($newStatus, $validStatuses, true)) {
            Response::error('Invalid delivery status.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM deliveries WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $delivery = $stmt->fetch();

        if (!$delivery) {
            Response::notFound('Delivery not found');
        }

        // Delivery rider permission check
        if (Auth::hasRole('delivery') && !Auth::hasRole('superadmin', 'admin')) {
            if ($delivery['staff_user_id'] != $user['id']) {
                Response::forbidden('Access denied. You can only update your own assigned deliveries.');
            }
        }

        $orderId = (int)$delivery['order_id'];
        $notes = trim($data['notes'] ?? '');
        $deliveredBottles = isset($data['delivered_bottles_count']) ? (int)$data['delivered_bottles_count'] : $delivery['delivered_bottles_count'];
        $returnedBottles = isset($data['returned_bottles_count']) ? (int)$data['returned_bottles_count'] : 0;
        $failureReason = trim($data['failure_reason'] ?? '');

        $db->beginTransaction();
        try {
            if ($newStatus === 'out_for_delivery') {
                $updDel = $db->prepare("UPDATE deliveries SET status = 'out_for_delivery', started_at = NOW() WHERE id = :id");
                $updDel->execute(['id' => $id]);

                $updOrd = $db->prepare("UPDATE orders SET order_status = 'out_for_delivery' WHERE id = :oid");
                $updOrd->execute(['oid' => $orderId]);

                $dsh = $db->prepare("INSERT INTO delivery_status_history (delivery_id, status, notes, changed_by) VALUES (:did, 'out_for_delivery', 'Dispatched for delivery', :uid)");
                $dsh->execute(['did' => $id, 'uid' => $user['id']]);

                $osh = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'out_for_delivery', 'Order is out for delivery with rider', :uid)");
                $osh->execute(['oid' => $orderId, 'uid' => $user['id']]);

            } elseif ($newStatus === 'delivered') {
                // Update delivery
                $updDel = $db->prepare("
                    UPDATE deliveries 
                    SET status = 'delivered', 
                        completed_at = NOW(),
                        delivered_bottles_count = :del_count,
                        returned_bottles_count = :ret_count,
                        customer_signature_notes = :sig
                    WHERE id = :id
                ");
                $updDel->execute([
                    'del_count' => $deliveredBottles,
                    'ret_count' => $returnedBottles,
                    'sig'       => $notes,
                    'id'        => $id
                ]);

                // Update order status
                $updOrd = $db->prepare("UPDATE orders SET order_status = 'delivered' WHERE id = :oid");
                $updOrd->execute(['oid' => $orderId]);

                // Consume inventory reservations into actual stock consumption
                $resStmt = $db->prepare("SELECT product_id, quantity FROM inventory_reservations WHERE order_id = :oid AND status = 'active'");
                $resStmt->execute(['oid' => $orderId]);
                $reservations = $resStmt->fetchAll();

                $consumeBal = $db->prepare("
                    UPDATE inventory_balances 
                    SET quantity_on_hand = GREATEST(0, quantity_on_hand - :qty_hand),
                        quantity_reserved = GREATEST(0, quantity_reserved - :qty_res)
                    WHERE product_id = :pid
                ");

                $movStmt = $db->prepare("
                    INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
                    VALUES (:pid, 'order_consumption', :qty, :oid, 'delivery_delivered', 'Stock delivered to customer', :uid)
                ");

                $updRes = $db->prepare("UPDATE inventory_reservations SET status = 'consumed' WHERE order_id = :oid");
                $updRes->execute(['oid' => $orderId]);

                foreach ($reservations as $res) {
                    $consumeBal->execute(['qty_hand' => $res['quantity'], 'qty_res' => $res['quantity'], 'pid' => $res['product_id']]);
                    $movStmt->execute(['qty' => $res['quantity'], 'pid' => $res['product_id'], 'oid' => $orderId, 'uid' => $user['id']]);
                }

                // If returned empty bottles recorded, create return inspection entries
                if ($returnedBottles > 0) {
                    // Fetch customer_id from order
                    $ordCustStmt = $db->prepare("SELECT customer_id FROM orders WHERE id = :oid");
                    $ordCustStmt->execute(['oid' => $orderId]);
                    $custRow = $ordCustStmt->fetch();
                    $cid = $custRow ? $custRow['customer_id'] : null;

                    // Log return movement for reusable 19L product (product_id = 4)
                    $retMov = $db->prepare("
                        INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
                        VALUES (4, 'return_stock', :qty, :oid, 'delivery_return', 'Empty bottles collected by rider upon delivery', :uid)
                    ");
                    $retMov->execute(['qty' => $returnedBottles, 'oid' => $orderId, 'uid' => $user['id']]);
                }

                // History
                $dsh = $db->prepare("INSERT INTO delivery_status_history (delivery_id, status, notes, changed_by) VALUES (:did, 'delivered', :notes, :uid)");
                $dsh->execute(['did' => $id, 'notes' => "Delivered. {$returnedBottles} empty bottles collected.", 'uid' => $user['id']]);

                $osh = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'delivered', 'Order successfully delivered to customer', :uid)");
                $osh->execute(['oid' => $orderId, 'uid' => $user['id']]);

            } elseif ($newStatus === 'failed') {
                $updDel = $db->prepare("
                    UPDATE deliveries 
                    SET status = 'failed', 
                        completed_at = NOW(),
                        failure_reason = :reason 
                    WHERE id = :id
                ");
                $updDel->execute(['reason' => $failureReason, 'id' => $id]);

                $updOrd = $db->prepare("UPDATE orders SET order_status = 'failed' WHERE id = :oid");
                $updOrd->execute(['oid' => $orderId]);

                // Release stock reservation
                $resStmt = $db->prepare("SELECT product_id, quantity FROM inventory_reservations WHERE order_id = :oid AND status = 'active'");
                $resStmt->execute(['oid' => $orderId]);
                $reservations = $resStmt->fetchAll();

                $relBal = $db->prepare("UPDATE inventory_balances SET quantity_reserved = GREATEST(0, quantity_reserved - :qty) WHERE product_id = :pid");
                $relRes = $db->prepare("UPDATE inventory_reservations SET status = 'released' WHERE order_id = :oid");
                $relRes->execute(['oid' => $orderId]);

                foreach ($reservations as $res) {
                    $relBal->execute(['qty' => $res['quantity'], 'pid' => $res['product_id']]);
                }

                $dsh = $db->prepare("INSERT INTO delivery_status_history (delivery_id, status, notes, changed_by) VALUES (:did, 'failed', :reason, :uid)");
                $dsh->execute(['did' => $id, 'reason' => "Delivery failed: {$failureReason}", 'uid' => $user['id']]);

                $osh = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'failed', :reason, :uid)");
                $osh->execute(['oid' => $orderId, 'reason' => "Delivery failed: {$failureReason}", 'uid' => $user['id']]);
            }

            $db->commit();
            Audit::log('update_delivery_status', 'deliveries', $id, null, ['status' => $newStatus]);

            Response::success(null, "Delivery status updated to {$newStatus}.");
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to update delivery status: ' . $e->getMessage(), 500);
        }
    }
}
