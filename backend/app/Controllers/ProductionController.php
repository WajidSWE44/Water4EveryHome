<?php
// backend/app/Controllers/ProductionController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class ProductionController {
    public static function sources(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM water_sources ORDER BY id ASC");
        Response::success($stmt->fetchAll());
    }

    public static function batches(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT 
                pb.*,
                ws.name as water_source_name,
                creator.name as created_by_name,
                approver.name as approved_by_name,
                COUNT(DISTINCT pbi.id) as total_products_filled,
                SUM(pbi.filled_quantity) as total_units_bottled,
                COUNT(DISTINCT pbqt.id) as tests_recorded,
                SUM(CASE WHEN pbqt.status = 'pass' THEN 1 ELSE 0 END) as tests_passed
            FROM production_batches pb
            JOIN water_sources ws ON ws.id = pb.water_source_id
            JOIN users creator ON creator.id = pb.created_by
            LEFT JOIN users approver ON approver.id = pb.approved_by
            LEFT JOIN production_batch_items pbi ON pbi.batch_id = pb.id
            LEFT JOIN production_batch_quality_tests pbqt ON pbqt.batch_id = pb.id
            GROUP BY pb.id
            ORDER BY pb.created_at DESC
        ");
        Response::success($stmt->fetchAll());
    }

    public static function showBatch(int $id): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT 
                pb.*,
                ws.name as water_source_name,
                ws.source_type,
                creator.name as created_by_name,
                approver.name as approved_by_name
            FROM production_batches pb
            JOIN water_sources ws ON ws.id = pb.water_source_id
            JOIN users creator ON creator.id = pb.created_by
            LEFT JOIN users approver ON approver.id = pb.approved_by
            WHERE pb.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $batch = $stmt->fetch();

        if (!$batch) {
            Response::notFound('Production batch not found');
        }

        // Fetch filled products
        $itemStmt = $db->prepare("
            SELECT pbi.*, p.name as product_name, p.volume_label, p.packaging_type
            FROM production_batch_items pbi
            JOIN products p ON p.id = pbi.product_id
            WHERE pbi.batch_id = :bid
        ");
        $itemStmt->execute(['bid' => $id]);
        $batch['items'] = $itemStmt->fetchAll();

        // Fetch QC tests
        $qcStmt = $db->prepare("
            SELECT 
                pbqt.*,
                qt.test_name,
                qt.parameter,
                qt.unit,
                qt.min_acceptable,
                qt.max_acceptable,
                qt.is_required,
                u.name as tester_name
            FROM production_batch_quality_tests pbqt
            JOIN quality_tests qt ON qt.id = pbqt.quality_test_id
            JOIN users u ON u.id = pbqt.tested_by
            WHERE pbqt.batch_id = :bid
            ORDER BY qt.id ASC
        ");
        $qcStmt->execute(['bid' => $id]);
        $batch['quality_tests'] = $qcStmt->fetchAll();

        Response::success($batch);
    }

    public static function storeBatch(): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'water_source_id'     => 'required|numeric',
            'production_date'     => 'required',
            'water_volume_liters' => 'required|numeric',
            'items'               => 'required'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $items = $data['items'];
        if (!is_array($items) || empty($items)) {
            Response::error('Batch must have at least one product filling item.', 422);
        }

        $db = Database::getConnection();
        $batchNumber = 'BATCH-' . date('Ymd', strtotime($data['production_date'])) . '-' . strtoupper(substr(uniqid(), -4));

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO production_batches (
                    batch_number, water_source_id, production_date, water_volume_liters,
                    status, approval_status, notes, created_by
                ) VALUES (
                    :bnum, :ws_id, :pdate, :volume, 'testing', 'pending', :notes, :created_by
                )
            ");
            $stmt->execute([
                'bnum'       => $batchNumber,
                'ws_id'      => (int)$data['water_source_id'],
                'pdate'      => $data['production_date'],
                'volume'     => (float)$data['water_volume_liters'],
                'notes'      => trim($data['notes'] ?? ''),
                'created_by' => $user['id']
            ]);
            $batchId = (int)$db->lastInsertId();

            $pbiStmt = $db->prepare("
                INSERT INTO production_batch_items (batch_id, product_id, filled_quantity)
                VALUES (:bid, :pid, :qty)
            ");

            foreach ($items as $item) {
                $pid = (int)($item['product_id'] ?? 0);
                $qty = (int)($item['filled_quantity'] ?? 0);
                if ($qty > 0 && $pid > 0) {
                    $pbiStmt->execute(['bid' => $batchId, 'pid' => $pid, 'qty' => $qty]);
                }
            }

            $db->commit();
            Audit::log('create_production_batch', 'production_batches', $batchId);

            Response::success([
                'id'           => $batchId,
                'batch_number' => $batchNumber
            ], 'Production batch created! Quality testing is now required before inventory entry.', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to create batch: ' . $e->getMessage(), 500);
        }
    }

    public static function qualityTests(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM quality_tests ORDER BY id ASC");
        Response::success($stmt->fetchAll());
    }

    public static function recordTest(int $batchId): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'quality_test_id' => 'required|numeric',
            'measured_value'  => 'required',
            'status'          => 'required|in:pass,fail'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $db = Database::getConnection();

        $stmt = $db->prepare("
            INSERT INTO production_batch_quality_tests (
                batch_id, quality_test_id, measured_value, status, tested_by, test_date, laboratory_reference, remarks
            ) VALUES (
                :bid, :qtid, :val, :status, :uid, NOW(), :lab_ref, :remarks
            )
        ");
        $stmt->execute([
            'bid'     => $batchId,
            'qtid'    => (int)$data['quality_test_id'],
            'val'     => trim($data['measured_value']),
            'status'  => $data['status'],
            'uid'     => $user['id'],
            'lab_ref' => trim($data['laboratory_reference'] ?? 'LAB-INTERNAL'),
            'remarks' => trim($data['remarks'] ?? '')
        ]);

        Response::success(null, 'Quality test record added successfully.');
    }

    public static function approveBatch(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'operations');
        $db = Database::getConnection();

        $batchStmt = $db->prepare("SELECT * FROM production_batches WHERE id = :id LIMIT 1");
        $batchStmt->execute(['id' => $id]);
        $batch = $batchStmt->fetch();

        if (!$batch) {
            Response::notFound('Batch not found');
        }

        if ($batch['approval_status'] === 'approved') {
            Response::error('This batch has already been approved and entered into inventory.', 400);
        }

        // FR-09: A production batch must not enter saleable inventory until all configured required quality checks have passed
        $reqTestsStmt = $db->query("SELECT id, test_name FROM quality_tests WHERE is_required = 1");
        $requiredTests = $reqTestsStmt->fetchAll();

        $batchTestsStmt = $db->prepare("
            SELECT quality_test_id, status 
            FROM production_batch_quality_tests 
            WHERE batch_id = :bid
        ");
        $batchTestsStmt->execute(['bid' => $id]);
        $batchTests = $batchTestsStmt->fetchAll();

        $testsPassed = [];
        foreach ($batchTests as $bt) {
            if ($bt['status'] === 'pass') {
                $testsPassed[] = (int)$bt['quality_test_id'];
            }
        }

        foreach ($requiredTests as $req) {
            if (!in_array((int)$req['id'], $testsPassed, true)) {
                Response::error("Cannot approve batch: Required quality test '{$req['test_name']}' has not passed yet.", 400);
            }
        }

        $db->beginTransaction();
        try {
            // Update batch approval
            $updB = $db->prepare("
                UPDATE production_batches 
                SET approval_status = 'approved',
                    status = 'approved',
                    approved_by = :uid,
                    approved_at = NOW()
                WHERE id = :id
            ");
            $updB->execute(['uid' => $user['id'], 'id' => $id]);

            // Add filled product quantities to inventory
            $itemStmt = $db->prepare("SELECT product_id, filled_quantity FROM production_batch_items WHERE batch_id = :bid");
            $itemStmt->execute(['bid' => $id]);
            $items = $itemStmt->fetchAll();

            $updBal = $db->prepare("
                UPDATE inventory_balances 
                SET quantity_on_hand = quantity_on_hand + :qty 
                WHERE product_id = :pid
            ");

            $movStmt = $db->prepare("
                INSERT INTO inventory_movements (
                    product_id, movement_type, quantity, reference_id, reference_type, notes, created_by
                ) VALUES (
                    :pid, 'production_add', :qty, :bid, 'production_batch', :notes, :uid
                )
            ");

            foreach ($items as $item) {
                $updBal->execute(['qty' => $item['filled_quantity'], 'pid' => $item['product_id']]);
                $movStmt->execute([
                    'pid'   => $item['product_id'],
                    'qty'   => $item['filled_quantity'],
                    'bid'   => $id,
                    'notes' => "Stock added from approved batch #{$batch['batch_number']}",
                    'uid'   => $user['id']
                ]);
            }

            $db->commit();
            Audit::log('approve_production_batch', 'production_batches', $id);

            Response::success(null, 'Batch successfully approved! Bottled products have been released to saleable inventory.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to approve batch: ' . $e->getMessage(), 500);
        }
    }

    public static function rejectBatch(int $id): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $reason = trim($data['rejection_reason'] ?? 'Failed drinking-water safety parameters.');

        $db = Database::getConnection();
        $stmt = $db->prepare("
            UPDATE production_batches 
            SET approval_status = 'rejected',
                status = 'rejected',
                rejection_reason = :reason,
                approved_by = :uid,
                approved_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            'reason' => $reason,
            'uid'    => $user['id'],
            'id'     => $id
        ]);

        Audit::log('reject_production_batch', 'production_batches', $id, null, ['reason' => $reason]);
        Response::success(null, 'Production batch marked as rejected. Water will not enter inventory.');
    }
}
