<?php
// backend/app/Controllers/InventoryController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class InventoryController {
    public static function balances(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations', 'finance');
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.volume_label,
                p.packaging_type,
                p.unit_price,
                p.is_reusable,
                p.is_active,
                c.name as category_name,
                COALESCE(ib.quantity_on_hand, 0) as quantity_on_hand,
                COALESCE(ib.quantity_reserved, 0) as quantity_reserved,
                GREATEST(0, COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) as available_quantity,
                COALESCE(ib.reorder_threshold, 50) as reorder_threshold,
                CASE 
                    WHEN (COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) <= COALESCE(ib.reorder_threshold, 50) 
                    THEN 1 ELSE 0 
                END as is_low_stock,
                ib.updated_at
            FROM products p
            JOIN product_categories c ON c.id = p.category_id
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id
            ORDER BY is_low_stock DESC, p.id ASC
        ");
        Response::success($stmt->fetchAll());
    }

    public static function movements(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $db = Database::getConnection();

        $productId = $_GET['product_id'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;

        $sql = "
            SELECT 
                im.*,
                p.name as product_name,
                p.volume_label,
                u.name as created_by_name
            FROM inventory_movements im
            JOIN products p ON p.id = im.product_id
            LEFT JOIN users u ON u.id = im.created_by
            WHERE 1=1
        ";

        $params = [];
        if ($productId) {
            $sql .= " AND im.product_id = :pid ";
            $params['pid'] = (int)$productId;
        }

        $sql .= " ORDER BY im.created_at DESC LIMIT " . $limit;

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function adjust(): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'product_id'    => 'required|numeric',
            'quantity'      => 'required|numeric',
            'movement_type' => 'required|in:manual_adjustment,damaged_removal,production_add',
            'notes'         => 'required|min:4'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $pid = (int)$data['product_id'];
        $qty = (int)$data['quantity']; // Can be positive (addition) or negative (subtraction)
        $type = $data['movement_type'];
        $notes = trim($data['notes']);

        $db = Database::getConnection();

        $prodStmt = $db->prepare("SELECT id, name FROM products WHERE id = :pid LIMIT 1");
        $prodStmt->execute(['pid' => $pid]);
        $prod = $prodStmt->fetch();

        if (!$prod) {
            Response::notFound('Product not found');
        }

        $db->beginTransaction();
        try {
            // Check current on hand
            $balStmt = $db->prepare("SELECT quantity_on_hand, quantity_reserved FROM inventory_balances WHERE product_id = :pid FOR UPDATE");
            $balStmt->execute(['pid' => $pid]);
            $bal = $balStmt->fetch();

            $currentOnHand = $bal ? (int)$bal['quantity_on_hand'] : 0;
            $newOnHand = $currentOnHand + $qty;

            if ($newOnHand < 0) {
                Response::error("Adjustment would result in negative inventory ({$newOnHand}).", 400);
            }

            if ($bal) {
                $upd = $db->prepare("UPDATE inventory_balances SET quantity_on_hand = :noh WHERE product_id = :pid");
                $upd->execute(['noh' => $newOnHand, 'pid' => $pid]);
            } else {
                $ins = $db->prepare("INSERT INTO inventory_balances (product_id, quantity_on_hand, quantity_reserved) VALUES (:pid, :noh, 0)");
                $ins->execute(['pid' => $pid, 'noh' => $newOnHand]);
            }

            // Record movement
            $mov = $db->prepare("
                INSERT INTO inventory_movements (
                    product_id, movement_type, quantity, reference_id, reference_type, notes, created_by
                ) VALUES (
                    :pid, :mtype, :qty, :ref_id, 'manual_adjustment', :notes, :uid
                )
            ");
            $mov->execute([
                'pid'    => $pid,
                'mtype'  => $type,
                'qty'    => $qty,
                'ref_id' => $pid,
                'notes'  => $notes,
                'uid'    => $user['id']
            ]);

            $db->commit();
            Audit::log('inventory_adjustment', 'inventory_balances', $pid, ['previous' => $currentOnHand], ['new' => $newOnHand, 'reason' => $notes]);

            Response::success([
                'product_id'       => $pid,
                'previous_on_hand' => $currentOnHand,
                'new_on_hand'      => $newOnHand
            ], 'Inventory successfully adjusted.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to adjust inventory: ' . $e->getMessage(), 500);
        }
    }
}
