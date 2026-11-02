<?php
// backend/app/Controllers/PaymentController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class PaymentController {
    public static function index(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'finance');
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $sql = "
            SELECT 
                p.*,
                o.order_number,
                o.order_status,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                confirmer.name as confirmed_by_name
            FROM payments p
            JOIN orders o ON o.id = p.order_id
            JOIN customers c ON c.id = p.customer_id
            JOIN users u ON u.id = c.user_id
            LEFT JOIN users confirmer ON confirmer.id = p.confirmed_by
            WHERE 1=1
        ";

        $params = [];
        if ($status) {
            $sql .= " AND p.status = :status ";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY p.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function confirmCod(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'finance');
        $db = Database::getConnection();

        $stmt = $db->prepare("SELECT * FROM payments WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::notFound('Payment not found');
        }

        $db->beginTransaction();
        try {
            $updPay = $db->prepare("
                UPDATE payments 
                SET status = 'successful', 
                    confirmed_by = :uid, 
                    confirmed_at = NOW(),
                    notes = 'Cash on Delivery verified by finance'
                WHERE id = :id
            ");
            $updPay->execute(['uid' => $user['id'], 'id' => $id]);

            $updOrd = $db->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = :oid");
            $updOrd->execute(['oid' => $payment['order_id']]);

            // Check if order had refundable deposit included
            $ordStmt = $db->prepare("SELECT deposit_amount, customer_id FROM orders WHERE id = :oid");
            $ordStmt->execute(['oid' => $payment['order_id']]);
            $ord = $ordStmt->fetch();

            if ($ord && (float)$ord['deposit_amount'] > 0) {
                $depAmt = (float)$ord['deposit_amount'];
                $cid = $ord['customer_id'];

                // Update customer deposit balance
                $updCustDep = $db->prepare("
                    UPDATE customer_deposits 
                    SET current_balance = current_balance + :amt 
                    WHERE customer_id = :cid
                ");
                $updCustDep->execute(['amt' => $depAmt, 'cid' => $cid]);

                // Fetch new balance
                $balStmt = $db->prepare("SELECT current_balance FROM customer_deposits WHERE customer_id = :cid");
                $balStmt->execute(['cid' => $cid]);
                $newBal = (float)$balStmt->fetchColumn();

                // Also update customer table
                $db->prepare("UPDATE customers SET bottle_deposit_balance = :b WHERE id = :cid")
                   ->execute(['b' => $newBal, 'cid' => $cid]);

                // Record deposit transaction
                $depTx = $db->prepare("
                    INSERT INTO deposit_transactions (
                        customer_id, order_id, transaction_type, amount, balance_after, notes, created_by
                    ) VALUES (
                        :cid, :oid, 'collected', :amt, :bafter, 'Bottle deposit received via verified payment', :uid
                    )
                ");
                $depTx->execute([
                    'cid'    => $cid,
                    'oid'    => $payment['order_id'],
                    'amt'    => $depAmt,
                    'bafter' => $newBal,
                    'uid'    => $user['id']
                ]);
            }

            $db->commit();
            Audit::log('confirm_cod_payment', 'payments', $id);

            Response::success(null, 'COD payment confirmed and verified.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to confirm COD: ' . $e->getMessage(), 500);
        }
    }

    public static function demoOnlinePay(): void {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $orderId = (int)($data['order_id'] ?? 0);
        if ($orderId <= 0) {
            Response::error('Invalid order ID.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("SELECT * FROM orders WHERE id = :oid LIMIT 1");
        $stmt->execute(['oid' => $orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::notFound('Order not found');
        }

        // Generate simulated transaction reference
        $txRef = 'SIMULATED-TX-' . strtoupper(bin2hex(random_bytes(6)));

        $db->beginTransaction();
        try {
            $updPay = $db->prepare("
                UPDATE payments 
                SET status = 'successful',
                    payment_method = 'online',
                    transaction_reference = :tx,
                    confirmed_at = NOW(),
                    notes = 'Paid via Test Gateway Simulation'
                WHERE order_id = :oid
            ");
            $updPay->execute(['tx' => $txRef, 'oid' => $orderId]);

            $updOrd = $db->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = :oid");
            $updOrd->execute(['oid' => $orderId]);

            // If order included deposit
            if ((float)$order['deposit_amount'] > 0) {
                $depAmt = (float)$order['deposit_amount'];
                $cid = $order['customer_id'];

                $db->prepare("UPDATE customer_deposits SET current_balance = current_balance + :amt WHERE customer_id = :cid")
                   ->execute(['amt' => $depAmt, 'cid' => $cid]);

                $balStmt = $db->prepare("SELECT current_balance FROM customer_deposits WHERE customer_id = :cid");
                $balStmt->execute(['cid' => $cid]);
                $newBal = (float)$balStmt->fetchColumn();

                $db->prepare("UPDATE customers SET bottle_deposit_balance = :b WHERE id = :cid")
                   ->execute(['b' => $newBal, 'cid' => $cid]);

                $db->prepare("
                    INSERT INTO deposit_transactions (
                        customer_id, order_id, transaction_type, amount, balance_after, notes, created_by
                    ) VALUES (
                        :cid, :oid, 'collected', :amt, :bafter, 'Bottle deposit received via test online payment', :uid
                    )
                ")->execute([
                    'cid'    => $cid,
                    'oid'    => $orderId,
                    'amt'    => $depAmt,
                    'bafter' => $newBal,
                    'uid'    => $user['id']
                ]);
            }

            $db->commit();
            Audit::log('demo_online_payment', 'orders', $orderId, null, ['tx_ref' => $txRef]);

            Response::success([
                'transaction_reference' => $txRef,
                'status'                => 'successful',
                'is_simulated'          => true
            ], 'Demonstration payment approved! (Test Mode)');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Payment processing failed: ' . $e->getMessage(), 500);
        }
    }

    public static function deposits(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $isCustomer = Auth::hasRole('customer') && !Auth::hasRole('superadmin', 'admin', 'finance');

        if ($isCustomer) {
            $cid = $user['customer_id'];
            $balStmt = $db->prepare("SELECT current_balance FROM customer_deposits WHERE customer_id = :cid");
            $balStmt->execute(['cid' => $cid]);
            $balance = (float)$balStmt->fetchColumn();

            $txStmt = $db->prepare("
                SELECT dt.*, o.order_number 
                FROM deposit_transactions dt
                LEFT JOIN orders o ON o.id = dt.order_id
                WHERE dt.customer_id = :cid
                ORDER BY dt.created_at DESC
            ");
            $txStmt->execute(['cid' => $cid]);

            Response::success([
                'balance'      => $balance,
                'transactions' => $txStmt->fetchAll()
            ]);
        } else {
            // Admin/Finance view
            $stmt = $db->query("
                SELECT 
                    cd.*,
                    c.customer_code,
                    u.name as customer_name,
                    u.phone as customer_phone
                FROM customer_deposits cd
                JOIN customers c ON c.id = cd.customer_id
                JOIN users u ON u.id = c.user_id
                ORDER BY cd.current_balance DESC
            ");
            Response::success($stmt->fetchAll());
        }
    }

    public static function refundDeposit(): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'finance');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $cid = (int)($data['customer_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $notes = trim($data['notes'] ?? 'Deposit refund upon bottle return inspection');

        if ($cid <= 0 || $amount <= 0) {
            Response::error('Invalid customer or refund amount.', 422);
        }

        $db = Database::getConnection();

        $balStmt = $db->prepare("SELECT current_balance FROM customer_deposits WHERE customer_id = :cid FOR UPDATE");
        $balStmt->execute(['cid' => $cid]);
        $currBal = (float)$balStmt->fetchColumn();

        if ($amount > $currBal) {
            Response::error("Refund amount (Rs. {$amount}) exceeds available customer deposit balance (Rs. {$currBal}).", 400);
        }

        $newBal = round($currBal - $amount, 2);

        $db->beginTransaction();
        try {
            $db->prepare("UPDATE customer_deposits SET current_balance = :nb WHERE customer_id = :cid")
               ->execute(['nb' => $newBal, 'cid' => $cid]);
            $db->prepare("UPDATE customers SET bottle_deposit_balance = :nb WHERE id = :cid")
               ->execute(['nb' => $newBal, 'cid' => $cid]);

            $db->prepare("
                INSERT INTO deposit_transactions (
                    customer_id, transaction_type, amount, balance_after, notes, created_by
                ) VALUES (
                    :cid, 'refunded', :amt, :bafter, :notes, :uid
                )
            ")->execute([
                'cid'    => $cid,
                'amt'    => $amount,
                'bafter' => $newBal,
                'notes'  => $notes,
                'uid'    => $user['id']
            ]);

            $db->commit();
            Audit::log('refund_deposit', 'customer_deposits', $cid, ['previous' => $currBal], ['refunded' => $amount, 'new_balance' => $newBal]);

            Response::success([
                'refunded_amount' => $amount,
                'new_balance'     => $newBal
            ], 'Deposit refund processed successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to process deposit refund: ' . $e->getMessage(), 500);
        }
    }
}
