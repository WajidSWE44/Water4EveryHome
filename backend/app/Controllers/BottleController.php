<?php
// backend/app/Controllers/BottleController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class BottleController {
    public static function index(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations', 'delivery');
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $search = $_GET['search'] ?? null;

        $sql = "
            SELECT 
                ba.*,
                p.name as product_name,
                c.customer_code,
                u.name as current_customer_name,
                u.phone as current_customer_phone
            FROM bottle_assets ba
            JOIN products p ON p.id = ba.product_id
            LEFT JOIN customers c ON c.id = ba.current_customer_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE 1=1
        ";

        $params = [];
        if ($status) {
            $sql .= " AND ba.current_status = :status ";
            $params['status'] = $status;
        }
        if ($search) {
            $sql .= " AND (ba.serial_number LIKE :s OR ba.qr_code LIKE :s) ";
            $params['s'] = "%{$search}%";
        }

        $sql .= " ORDER BY ba.updated_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function scan(string $code): void {
        AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT 
                ba.*,
                p.name as product_name,
                p.volume_label,
                c.customer_code,
                u.name as current_customer_name,
                u.phone as current_customer_phone
            FROM bottle_assets ba
            JOIN products p ON p.id = ba.product_id
            LEFT JOIN customers c ON c.id = ba.current_customer_id
            LEFT JOIN users u ON u.id = c.user_id
            WHERE ba.qr_code = :qr_code OR ba.serial_number = :serial_code
            LIMIT 1
        ");
        $stmt->execute(['qr_code' => $code, 'serial_code' => $code]);
        $bottle = $stmt->fetch();

        if (!$bottle) {
            Response::notFound('Bottle asset not found with QR/Serial: ' . $code);
        }

        // Fetch transaction history
        $txStmt = $db->prepare("
            SELECT 
                bt.*,
                u.name as staff_name,
                cust.name as customer_name
            FROM bottle_transactions bt
            LEFT JOIN users u ON u.id = bt.staff_id
            LEFT JOIN customers c ON c.id = bt.customer_id
            LEFT JOIN users cust ON cust.id = c.user_id
            WHERE bt.bottle_id = :bid
            ORDER BY bt.created_at DESC
        ");
        $txStmt->execute(['bid' => $bottle['id']]);
        $bottle['transactions'] = $txStmt->fetchAll();

        // Fetch inspections
        $inspStmt = $db->prepare("
            SELECT bri.*, u.name as inspector_name
            FROM bottle_return_inspections bri
            JOIN users u ON u.id = bri.inspected_by
            WHERE bri.bottle_id = :bid
            ORDER BY bri.created_at DESC
        ");
        $inspStmt->execute(['bid' => $bottle['id']]);
        $bottle['inspections'] = $inspStmt->fetchAll();

        Response::success($bottle);
    }

    public static function store(): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'serial_number' => 'required|min:3',
            'product_id'    => 'required|numeric'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $serial = strtoupper(trim($data['serial_number']));
        $qrCode = !empty($data['qr_code']) ? trim($data['qr_code']) : 'QR-' . $serial;

        $db = Database::getConnection();

        // Check unique
        $chk = $db->prepare("SELECT id FROM bottle_assets WHERE serial_number = :s OR qr_code = :q LIMIT 1");
        $chk->execute(['s' => $serial, 'q' => $qrCode]);
        if ($chk->fetch()) {
            Response::error('A bottle with this serial number or QR code already exists.', 409);
        }

        $stmt = $db->prepare("
            INSERT INTO bottle_assets (
                serial_number, qr_code, product_id, current_status, cycle_count, manufacture_date, notes
            ) VALUES (
                :s, :q, :pid, :status, 0, :mfg, :notes
            )
        ");
        $stmt->execute([
            's'      => $serial,
            'q'      => $qrCode,
            'pid'    => (int)$data['product_id'],
            'status' => $data['current_status'] ?? 'warehouse_filled',
            'mfg'    => $data['manufacture_date'] ?? date('Y-m-d'),
            'notes'  => trim($data['notes'] ?? 'New asset intake')
        ]);
        $bottleId = (int)$db->lastInsertId();

        $tx = $db->prepare("INSERT INTO bottle_transactions (bottle_id, transaction_type, staff_id, notes) VALUES (:bid, 'intake', :uid, 'Asset registered into fleet')");
        $tx->execute(['bid' => $bottleId, 'uid' => $user['id']]);

        Audit::log('create_bottle_asset', 'bottle_assets', $bottleId);

        Response::success(['id' => $bottleId, 'serial_number' => $serial, 'qr_code' => $qrCode], 'Bottle asset registered successfully.', 201);
    }

    public static function updateStatus(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations', 'delivery');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $newStatus = $data['current_status'] ?? '';
        $allowed = [
            'warehouse_empty', 'warehouse_filled', 'reserved',
            'delivered_to_customer', 'returned', 'inspection',
            'washing', 'refilling', 'quality_check',
            'damaged', 'lost', 'retired'
        ];

        if (!in_array($newStatus, $allowed, true)) {
            Response::error('Invalid bottle status.', 422);
        }

        $db = Database::getConnection();
        $bottleStmt = $db->prepare("SELECT * FROM bottle_assets WHERE id = :id LIMIT 1");
        $bottleStmt->execute(['id' => $id]);
        $bottle = $bottleStmt->fetch();

        if (!$bottle) {
            Response::notFound('Bottle not found');
        }

        $notes = trim($data['notes'] ?? '');
        $customerId = isset($data['customer_id']) ? (int)$data['customer_id'] : null;

        // If returned or entering warehouse, clear customer assignment
        if (in_array($newStatus, ['warehouse_empty', 'washing', 'refilling', 'retired', 'warehouse_filled'])) {
            $customerId = null;
        } elseif ($newStatus === 'delivered_to_customer' && !$customerId) {
            $customerId = $bottle['current_customer_id'];
        }

        $cycleIncrement = ($newStatus === 'warehouse_filled') ? 1 : 0;

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                UPDATE bottle_assets 
                SET current_status = :status,
                    current_customer_id = :cid,
                    cycle_count = cycle_count + :cycle_inc,
                    notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                'status'    => $newStatus,
                'cid'       => $customerId,
                'cycle_inc' => $cycleIncrement,
                'notes'     => $notes,
                'id'        => $id
            ]);

            // Record transaction
            $tx = $db->prepare("
                INSERT INTO bottle_transactions (bottle_id, transaction_type, customer_id, staff_id, notes)
                VALUES (:bid, :ttype, :cid, :uid, :notes)
            ");
            $tx->execute([
                'bid'   => $id,
                'ttype' => $newStatus,
                'cid'   => $customerId,
                'uid'   => $user['id'],
                'notes' => $notes ?: "Status transition to {$newStatus}"
            ]);

            $db->commit();
            Audit::log('update_bottle_status', 'bottle_assets', $id, null, ['status' => $newStatus]);

            Response::success(null, "Bottle status updated to {$newStatus}.");
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to update bottle: ' . $e->getMessage(), 500);
        }
    }

    public static function inspect(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $condition = $data['condition_status'] ?? 'good';
        $action = $data['action_taken'] ?? 'refill';
        $damageCost = (float)($data['damage_cost'] ?? 0);
        $notes = trim($data['notes'] ?? '');

        $db = Database::getConnection();

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO bottle_return_inspections (
                    bottle_id, condition_status, damage_cost, action_taken, inspected_by, notes
                ) VALUES (
                    :bid, :cond, :cost, :act, :uid, :notes
                )
            ");
            $stmt->execute([
                'bid'   => $id,
                'cond'  => $condition,
                'cost'  => $damageCost,
                'act'   => $action,
                'uid'   => $user['id'],
                'notes' => $notes
            ]);

            // Update bottle status based on inspection action
            $nextStatus = 'washing';
            if ($action === 'retire') {
                $nextStatus = 'retired';
            } elseif ($action === 'repair' || $condition === 'damaged') {
                $nextStatus = 'damaged';
            }

            $upd = $db->prepare("UPDATE bottle_assets SET current_status = :status WHERE id = :id");
            $upd->execute(['status' => $nextStatus, 'id' => $id]);

            $db->commit();
            Response::success(null, 'Inspection recorded successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to record inspection: ' . $e->getMessage(), 500);
        }
    }
}
