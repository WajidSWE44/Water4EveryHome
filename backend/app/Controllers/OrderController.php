<?php
// backend/app/Controllers/OrderController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class OrderController {
    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::forbidden('Only registered customers can place orders.');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'address_id'     => 'required|numeric',
            'delivery_date'  => 'required',
            'time_slot'      => 'required',
            'payment_method' => 'required|in:cash_on_delivery,online',
            'items'          => 'required'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $items = $data['items'];
        if (!is_array($items) || empty($items)) {
            Response::error('Order must contain at least one item.', 422);
        }

        $db = Database::getConnection();

        // Validate address: MUST belong to customer AND be 'approved'
        $addrStmt = $db->prepare("
            SELECT a.*, sa.delivery_fee, sa.is_active as area_active 
            FROM addresses a
            JOIN service_areas sa ON sa.id = a.service_area_id
            WHERE a.id = :id AND a.customer_id = :cid
            LIMIT 1
        ");
        $addrStmt->execute([
            'id'  => $data['address_id'],
            'cid' => $customerId
        ]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::error('Selected delivery address was not found.', 404);
        }

        if ($address['approval_status'] !== 'approved') {
            Response::error('Orders can only be placed to an approved delivery address. Current status: ' . $address['approval_status'], 400);
        }

        if (!$address['area_active']) {
            Response::error('This delivery area is temporarily inactive.', 400);
        }

        // Fetch products and validate stock and prices from DB
        $productIds = array_column($items, 'product_id');
        $inClause = implode(',', array_fill(0, count($productIds), '?'));

        $prodStmt = $db->prepare("
            SELECT 
                p.*,
                COALESCE(ib.quantity_on_hand, 0) as quantity_on_hand,
                COALESCE(ib.quantity_reserved, 0) as quantity_reserved,
                GREATEST(0, COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) as available_quantity
            FROM products p
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id
            WHERE p.id IN ($inClause) AND p.is_active = 1
        ");
        $prodStmt->execute($productIds);
        $productsById = [];
        foreach ($prodStmt->fetchAll() as $row) {
            $productsById[$row['id']] = $row;
        }

        // Calculate totals on backend
        $subtotal = 0.00;
        $totalDeposit = 0.00;
        $validatedItems = [];

        foreach ($items as $item) {
            $pid = (int)($item['product_id'] ?? 0);
            $qty = (int)($item['quantity'] ?? 0);

            if ($qty <= 0) {
                Response::error('Item quantity must be greater than zero.', 422);
            }

            if (!isset($productsById[$pid])) {
                Response::error("Product #{$pid} is inactive or not found.", 400);
            }

            $prod = $productsById[$pid];

            // Stock Check
            if ($prod['available_quantity'] < $qty) {
                Response::error("Insufficient stock for '{$prod['name']}'. Available: {$prod['available_quantity']}, Requested: {$qty}", 400);
            }

            $unitPrice = (float)$prod['unit_price'];
            $unitDeposit = (float)$prod['refundable_deposit'];
            $linePrice = round($unitPrice * $qty, 2);
            $lineDeposit = round($unitDeposit * $qty, 2);

            $subtotal += $linePrice;
            $totalDeposit += $lineDeposit;

            $validatedItems[] = [
                'product_id'       => $pid,
                'product_name'     => $prod['name'],
                'product_sku'      => $prod['slug'],
                'volume_ml'        => (int)$prod['volume_ml'],
                'unit_price'       => $unitPrice,
                'deposit_per_unit' => $unitDeposit,
                'quantity'         => $qty,
                'total_price'      => $linePrice,
                'total_deposit'    => $lineDeposit
            ];
        }

        $deliveryFee = (float)$address['delivery_fee'];
        $discount = 0.00;
        $grandTotal = round($subtotal + $deliveryFee + $totalDeposit - $discount, 2);

        $orderNumber = 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
        $paymentMethod = $data['payment_method'];

        $db->beginTransaction();
        try {
            // 1. Create order record
            $orderStmt = $db->prepare("
                INSERT INTO orders (
                    order_number, customer_id, address_id, order_status, payment_status,
                    payment_method, subtotal_amount, delivery_fee, deposit_amount,
                    discount_amount, total_amount, delivery_date, time_slot, special_instructions
                ) VALUES (
                    :order_number, :customer_id, :address_id, 'pending', 'pending',
                    :payment_method, :subtotal, :delivery_fee, :deposit,
                    :discount, :total, :delivery_date, :time_slot, :notes
                )
            ");
            $orderStmt->execute([
                'order_number'   => $orderNumber,
                'customer_id'    => $customerId,
                'address_id'     => $address['id'],
                'payment_method' => $paymentMethod,
                'subtotal'       => $subtotal,
                'delivery_fee'   => $deliveryFee,
                'deposit'        => $totalDeposit,
                'discount'       => $discount,
                'total'          => $grandTotal,
                'delivery_date'  => $data['delivery_date'],
                'time_slot'      => $data['time_slot'],
                'notes'          => trim($data['special_instructions'] ?? '')
            ]);
            $orderId = (int)$db->lastInsertId();

            // 2. Insert order items & reserve inventory
            $itemStmt = $db->prepare("
                INSERT INTO order_items (
                    order_id, product_id, product_name, product_sku, volume_ml,
                    unit_price, deposit_per_unit, quantity, total_price, total_deposit
                ) VALUES (
                    :oid, :pid, :name, :sku, :vol, :price, :dep, :qty, :tprice, :tdep
                )
            ");

            $resStmt = $db->prepare("
                INSERT INTO inventory_reservations (order_id, product_id, quantity, status)
                VALUES (:oid, :pid, :qty, 'active')
            ");

            $updateBal = $db->prepare("
                UPDATE inventory_balances 
                SET quantity_reserved = quantity_reserved + :qty 
                WHERE product_id = :pid
            ");

            $movStmt = $db->prepare("
                INSERT INTO inventory_movements (
                    product_id, movement_type, quantity, reference_id, reference_type, notes, created_by
                ) VALUES (
                    :pid, 'order_reservation', :qty, :oid, 'order', 'Reserved stock for order', :uid
                )
            ");

            foreach ($validatedItems as $item) {
                $item['oid'] = $orderId;
                $itemStmt->execute([
                    'oid'    => $orderId,
                    'pid'    => $item['product_id'],
                    'name'   => $item['product_name'],
                    'sku'    => $item['product_sku'],
                    'vol'    => $item['volume_ml'],
                    'price'  => $item['unit_price'],
                    'dep'    => $item['deposit_per_unit'],
                    'qty'    => $item['quantity'],
                    'tprice' => $item['total_price'],
                    'tdep'   => $item['total_deposit']
                ]);

                // Reserve inventory
                $resStmt->execute(['oid' => $orderId, 'pid' => $item['product_id'], 'qty' => $item['quantity']]);
                $updateBal->execute(['pid' => $item['product_id'], 'qty' => $item['quantity']]);
                $movStmt->execute(['pid' => $item['product_id'], 'qty' => $item['quantity'], 'oid' => $orderId, 'uid' => $user['id']]);
            }

            // 3. Record order status history
            $histStmt = $db->prepare("
                INSERT INTO order_status_history (order_id, status, notes, changed_by)
                VALUES (:oid, 'pending', 'Order placed by customer', :uid)
            ");
            $histStmt->execute(['oid' => $orderId, 'uid' => $user['id']]);

            // 4. Create initial payment record
            $payNumber = 'PAY-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
            $payStmt = $db->prepare("
                INSERT INTO payments (
                    payment_number, order_id, customer_id, amount, payment_method, status, notes
                ) VALUES (
                    :pnum, :oid, :cid, :amt, :pmethod, 'pending', 'Awaiting payment confirmation'
                )
            ");
            $payStmt->execute([
                'pnum'    => $payNumber,
                'oid'     => $orderId,
                'cid'     => $customerId,
                'amt'     => $grandTotal,
                'pmethod' => $paymentMethod
            ]);

            // 5. Notify Admins
            $notif = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, link)
                SELECT id, 'New Water Order Received', :msg, 'order', :link
                FROM users WHERE id IN (SELECT user_id FROM user_roles WHERE role_id IN (1, 2))
            ");
            $notif->execute([
                'msg'  => "Order #{$orderNumber} placed by {$user['name']} for Rs. {$grandTotal}",
                'link' => "/admin/orders/{$orderId}"
            ]);

            $db->commit();
            Audit::log('create_order', 'orders', $orderId, null, ['order_number' => $orderNumber, 'total' => $grandTotal]);

            Response::success([
                'order_id'       => $orderId,
                'order_number'   => $orderNumber,
                'total_amount'   => $grandTotal,
                'deposit_amount' => $totalDeposit,
                'delivery_fee'   => $deliveryFee,
                'subtotal'       => $subtotal,
                'payment_method' => $paymentMethod
            ], 'Order placed successfully! Stock reserved.', 201);

        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to place order: ' . $e->getMessage(), 500);
        }
    }

    public static function myOrders(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::success([]);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT 
                o.*,
                a.recipient_name,
                a.phone as recipient_phone,
                a.area_name,
                a.street_address,
                a.city,
                COUNT(oi.id) as total_items,
                SUM(oi.quantity) as total_bottles,
                d.status as delivery_status,
                d.delivery_number,
                rider.name as delivery_rider_name,
                rider.phone as delivery_rider_phone
            FROM orders o
            JOIN addresses a ON a.id = o.address_id
            JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN deliveries d ON d.order_id = o.id
            LEFT JOIN users rider ON rider.id = d.staff_user_id
            WHERE o.customer_id = :cid
            GROUP BY o.id
            ORDER BY o.created_at DESC
        ");
        $stmt->execute(['cid' => $customerId]);
        Response::success($stmt->fetchAll());
    }

    public static function show(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT 
                o.*,
                a.recipient_name,
                a.phone as recipient_phone,
                a.area_name,
                a.street_address,
                a.city,
                a.landmark,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                d.id as delivery_id,
                d.delivery_number,
                d.status as delivery_status,
                d.staff_user_id,
                rider.name as rider_name,
                rider.phone as rider_phone,
                sp.vehicle_number
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = o.address_id
            LEFT JOIN deliveries d ON d.order_id = o.id
            LEFT JOIN users rider ON rider.id = d.staff_user_id
            LEFT JOIN staff_profiles sp ON sp.user_id = rider.id
            WHERE o.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::notFound('Order not found');
        }

        // Ownership check: Customer can only view their own order
        if (Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin', 'operations', 'delivery', 'finance')) {
            if ($order['customer_id'] != $user['customer_id']) {
                Response::forbidden('Access denied');
            }
        }

        // Delivery staff can only view orders assigned to them
        if (Auth::hasRole('delivery') && !Auth::hasRole('superadmin', 'admin', 'operations', 'finance')) {
            if ($order['staff_user_id'] != $user['id']) {
                Response::forbidden('Access denied to unassigned delivery.');
            }
        }

        // Fetch items
        $itemStmt = $db->prepare("SELECT * FROM order_items WHERE order_id = :oid");
        $itemStmt->execute(['oid' => $id]);
        $order['items'] = $itemStmt->fetchAll();

        // Fetch status history
        $histStmt = $db->prepare("
            SELECT osh.*, u.name as changed_by_name
            FROM order_status_history osh
            LEFT JOIN users u ON u.id = osh.changed_by
            WHERE osh.order_id = :oid
            ORDER BY osh.created_at ASC
        ");
        $histStmt->execute(['oid' => $id]);
        $order['status_history'] = $histStmt->fetchAll();

        // Fetch payments
        $payStmt = $db->prepare("SELECT * FROM payments WHERE order_id = :oid");
        $payStmt->execute(['oid' => $id]);
        $order['payments'] = $payStmt->fetchAll();

        Response::success($order);
    }

    public static function cancel(int $id): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM orders WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::notFound('Order not found');
        }

        // Customer can only cancel their own pending order
        if (!Auth::hasRole('superadmin', 'admin')) {
            if ($order['customer_id'] != $user['customer_id']) {
                Response::forbidden('Access denied');
            }
            if (!in_array($order['order_status'], ['pending', 'confirmed'])) {
                Response::error('Order cannot be cancelled at status: ' . $order['order_status'], 400);
            }
        }

        $db->beginTransaction();
        try {
            // Update order status
            $upd = $db->prepare("UPDATE orders SET order_status = 'cancelled' WHERE id = :id");
            $upd->execute(['id' => $id]);

            // Release inventory reservations
            $resStmt = $db->prepare("SELECT product_id, quantity FROM inventory_reservations WHERE order_id = :oid AND status = 'active'");
            $resStmt->execute(['oid' => $id]);
            $reservations = $resStmt->fetchAll();

            $relStmt = $db->prepare("UPDATE inventory_reservations SET status = 'released' WHERE order_id = :oid");
            $relStmt->execute(['oid' => $id]);

            $balStmt = $db->prepare("UPDATE inventory_balances SET quantity_reserved = GREATEST(0, quantity_reserved - :qty) WHERE product_id = :pid");
            $movStmt = $db->prepare("
                INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
                VALUES (:pid, 'order_cancellation', :qty, :oid, 'order', 'Stock reservation released due to cancellation', :uid)
            ");

            foreach ($reservations as $res) {
                $balStmt->execute(['qty' => $res['quantity'], 'pid' => $res['product_id']]);
                $movStmt->execute(['qty' => $res['quantity'], 'pid' => $res['product_id'], 'oid' => $id, 'uid' => $user['id']]);
            }

            // History
            $hist = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'cancelled', 'Order cancelled', :uid)");
            $hist->execute(['oid' => $id, 'uid' => $user['id']]);

            $db->commit();
            Audit::log('cancel_order', 'orders', $id);

            Response::success(null, 'Order cancelled and stock reservation released successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to cancel order: ' . $e->getMessage(), 500);
        }
    }

    public static function adminList(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations', 'finance');
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $date = $_GET['date'] ?? null;
        $search = $_GET['search'] ?? null;

        $sql = "
            SELECT 
                o.*,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                a.area_name,
                a.street_address,
                d.status as delivery_status,
                d.delivery_number,
                rider.name as delivery_rider_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = o.address_id
            LEFT JOIN deliveries d ON d.order_id = o.id
            LEFT JOIN users rider ON rider.id = d.staff_user_id
            WHERE 1=1
        ";

        $params = [];
        if ($status) {
            $sql .= " AND o.order_status = :status ";
            $params['status'] = $status;
        }
        if ($date) {
            $sql .= " AND o.delivery_date = :date ";
            $params['date'] = $date;
        }
        if ($search) {
            $sql .= " AND (o.order_number LIKE :s OR u.name LIKE :s OR u.phone LIKE :s) ";
            $params['s'] = "%{$search}%";
        }

        $sql .= " ORDER BY o.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function confirm(int $id): void {
        $admin = AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("UPDATE orders SET order_status = 'confirmed' WHERE id = :id AND order_status = 'pending'");
            $stmt->execute(['id' => $id]);

            $hist = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'confirmed', 'Order confirmed by Admin', :uid)");
            $hist->execute(['oid' => $id, 'uid' => $admin['id']]);

            $db->commit();
            Audit::log('confirm_order', 'orders', $id);
            Response::success(null, 'Order confirmed successfully');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to confirm order: ' . $e->getMessage(), 500);
        }
    }

    public static function assignDelivery(int $id): void {
        $admin = AuthMiddleware::requireRoles('superadmin', 'admin');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $staffUserId = (int)($data['staff_user_id'] ?? 0);
        if ($staffUserId <= 0) {
            Response::error('Please select a valid delivery staff member.', 422);
        }

        $db = Database::getConnection();

        // Verify staff member has delivery role
        $roleChk = $db->prepare("
            SELECT u.id, u.name 
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.id = :uid AND r.name = 'delivery'
            LIMIT 1
        ");
        $roleChk->execute(['uid' => $staffUserId]);
        $staffUser = $roleChk->fetch();

        if (!$staffUser) {
            Response::error('Selected user is not assigned to the delivery fleet.', 400);
        }

        $db->beginTransaction();
        try {
            // Check if delivery already exists for this order
            $delCheck = $db->prepare("SELECT id FROM deliveries WHERE order_id = :oid LIMIT 1");
            $delCheck->execute(['oid' => $id]);
            $existing = $delCheck->fetch();

            if ($existing) {
                $upd = $db->prepare("
                    UPDATE deliveries 
                    SET staff_user_id = :staff_id, status = 'assigned', assigned_at = NOW() 
                    WHERE id = :did
                ");
                $upd->execute(['staff_id' => $staffUserId, 'did' => $existing['id']]);
                $deliveryId = $existing['id'];
            } else {
                $delNum = 'DEL-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
                $ins = $db->prepare("
                    INSERT INTO deliveries (delivery_number, order_id, staff_user_id, status, assigned_at)
                    VALUES (:num, :oid, :staff_id, 'assigned', NOW())
                ");
                $ins->execute([
                    'num'      => $delNum,
                    'oid'      => $id,
                    'staff_id' => $staffUserId
                ]);
                $deliveryId = (int)$db->lastInsertId();

                // Add delivery items
                $itemStmt = $db->prepare("SELECT id, quantity FROM order_items WHERE order_id = :oid");
                $itemStmt->execute(['oid' => $id]);
                $diStmt = $db->prepare("INSERT INTO delivery_items (delivery_id, order_item_id, delivered_quantity) VALUES (:did, :oi_id, 0)");
                foreach ($itemStmt->fetchAll() as $item) {
                    $diStmt->execute(['did' => $deliveryId, 'oi_id' => $item['id']]);
                }
            }

            // Update order status to processing / ready
            $ordUpd = $db->prepare("UPDATE orders SET order_status = 'processing' WHERE id = :id");
            $ordUpd->execute(['id' => $id]);

            // History
            $hist = $db->prepare("INSERT INTO order_status_history (order_id, status, notes, changed_by) VALUES (:oid, 'processing', :notes, :uid)");
            $hist->execute([
                'oid'   => $id,
                'notes' => "Assigned to delivery staff {$staffUser['name']}",
                'uid'   => $admin['id']
            ]);

            $delHist = $db->prepare("INSERT INTO delivery_status_history (delivery_id, status, notes, changed_by) VALUES (:did, 'assigned', :notes, :uid)");
            $delHist->execute([
                'did'   => $deliveryId,
                'notes' => "Assigned to {$staffUser['name']}",
                'uid'   => $admin['id']
            ]);

            // Notify staff member
            $notif = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (:uid, 'New Delivery Assigned', 'You have been assigned order delivery for customer.', 'delivery', '/delivery')
            ");
            $notif->execute(['uid' => $staffUserId]);

            $db->commit();
            Audit::log('assign_delivery', 'deliveries', $deliveryId, null, ['staff_user_id' => $staffUserId]);

            Response::success(['delivery_id' => $deliveryId], "Order successfully assigned to {$staffUser['name']}.");
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to assign delivery: ' . $e->getMessage(), 500);
        }
    }
}
