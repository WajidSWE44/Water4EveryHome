<?php
// backend/app/Controllers/ProductController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class ProductController {
    public static function index(): void {
        $db = Database::getConnection();
        $adminView = isset($_GET['all']) && $_GET['all'] == '1';

        $sql = "
            SELECT 
                p.*,
                c.name as category_name,
                COALESCE(ib.quantity_on_hand, 0) as quantity_on_hand,
                COALESCE(ib.quantity_reserved, 0) as quantity_reserved,
                GREATEST(0, COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) as available_quantity,
                COALESCE(ib.reorder_threshold, 50) as reorder_threshold
            FROM products p
            JOIN product_categories c ON c.id = p.category_id
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id
        ";

        if (!$adminView) {
            $sql .= " WHERE p.is_active = 1 ";
        }

        $sql .= " ORDER BY p.category_id ASC, p.unit_price ASC";

        $stmt = $db->query($sql);
        $products = $stmt->fetchAll();

        Response::success($products);
    }

    public static function show(int $id): void {
        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT 
                p.*,
                c.name as category_name,
                COALESCE(ib.quantity_on_hand, 0) as quantity_on_hand,
                COALESCE(ib.quantity_reserved, 0) as quantity_reserved,
                GREATEST(0, COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) as available_quantity
            FROM products p
            JOIN product_categories c ON c.id = p.category_id
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id
            WHERE p.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $product = $stmt->fetch();

        if (!$product) {
            Response::notFound('Product not found');
        }

        Response::success($product);
    }

    public static function categories(): void {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM product_categories ORDER BY name ASC");
        Response::success($stmt->fetchAll());
    }

    public static function store(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'name'           => 'required|min:2',
            'category_id'    => 'required|numeric',
            'volume_ml'      => 'required|numeric',
            'volume_label'   => 'required',
            'packaging_type' => 'required',
            'unit_price'     => 'required|numeric'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $data['name'])));
        $db = Database::getConnection();

        // Check unique slug
        $chk = $db->prepare("SELECT id FROM products WHERE slug = :slug LIMIT 1");
        $chk->execute(['slug' => $slug]);
        if ($chk->fetch()) {
            $slug .= '-' . time();
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO products (
                    category_id, name, slug, description, volume_ml, volume_label, 
                    packaging_type, unit_price, refundable_deposit, image_url, is_reusable, is_active
                ) VALUES (
                    :category_id, :name, :slug, :description, :volume_ml, :volume_label,
                    :packaging_type, :unit_price, :refundable_deposit, :image_url, :is_reusable, :is_active
                )
            ");
            $stmt->execute([
                'category_id'        => $data['category_id'],
                'name'               => trim($data['name']),
                'slug'               => $slug,
                'description'        => $data['description'] ?? '',
                'volume_ml'          => (int)$data['volume_ml'],
                'volume_label'       => trim($data['volume_label']),
                'packaging_type'     => trim($data['packaging_type']),
                'unit_price'         => (float)$data['unit_price'],
                'refundable_deposit' => (float)($data['refundable_deposit'] ?? 0),
                'image_url'          => $data['image_url'] ?? '/images/products/default_bottle.png',
                'is_reusable'        => !empty($data['is_reusable']) ? 1 : 0,
                'is_active'          => isset($data['is_active']) ? (int)$data['is_active'] : 1
            ]);
            $productId = (int)$db->lastInsertId();

            // Initialize inventory balance
            $invStmt = $db->prepare("
                INSERT INTO inventory_balances (product_id, quantity_on_hand, quantity_reserved, reorder_threshold)
                VALUES (:product_id, :on_hand, 0, :threshold)
            ");
            $initialStock = (int)($data['initial_stock'] ?? 0);
            $invStmt->execute([
                'product_id' => $productId,
                'on_hand'    => $initialStock,
                'threshold'  => (int)($data['reorder_threshold'] ?? 50)
            ]);

            if ($initialStock > 0) {
                $imStmt = $db->prepare("
                    INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
                    VALUES (:pid, 'production_add', :qty, :ref_id, 'initial_creation', 'Initial inventory setup', :user_id)
                ");
                $imStmt->execute([
                    'pid'     => $productId,
                    'qty'     => $initialStock,
                    'ref_id'  => $productId,
                    'user_id' => Auth::id()
                ]);
            }

            $db->commit();
            Audit::log('create_product', 'products', $productId, null, $data);

            Response::success(['id' => $productId, 'name' => $data['name']], 'Product created successfully', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to create product: ' . $e->getMessage(), 500);
        }
    }

    public static function update(int $id): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $db = Database::getConnection();
        $currStmt = $db->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
        $currStmt->execute(['id' => $id]);
        $current = $currStmt->fetch();

        if (!$current) {
            Response::notFound('Product not found');
        }

        $stmt = $db->prepare("
            UPDATE products SET
                category_id = :category_id,
                name = :name,
                description = :description,
                volume_ml = :volume_ml,
                volume_label = :volume_label,
                packaging_type = :packaging_type,
                unit_price = :unit_price,
                refundable_deposit = :refundable_deposit,
                is_reusable = :is_reusable,
                is_active = :is_active
            WHERE id = :id
        ");
        $stmt->execute([
            'category_id'        => $data['category_id'] ?? $current['category_id'],
            'name'               => trim($data['name'] ?? $current['name']),
            'description'        => $data['description'] ?? $current['description'],
            'volume_ml'          => isset($data['volume_ml']) ? (int)$data['volume_ml'] : $current['volume_ml'],
            'volume_label'       => trim($data['volume_label'] ?? $current['volume_label']),
            'packaging_type'     => trim($data['packaging_type'] ?? $current['packaging_type']),
            'unit_price'         => isset($data['unit_price']) ? (float)$data['unit_price'] : $current['unit_price'],
            'refundable_deposit' => isset($data['refundable_deposit']) ? (float)$data['refundable_deposit'] : $current['refundable_deposit'],
            'is_reusable'        => isset($data['is_reusable']) ? (int)$data['is_reusable'] : $current['is_reusable'],
            'is_active'          => isset($data['is_active']) ? (int)$data['is_active'] : $current['is_active'],
            'id'                 => $id
        ]);

        Audit::log('update_product', 'products', $id, $current, $data);
        Response::success(null, 'Product updated successfully');
    }

    public static function toggleStatus(int $id): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE products SET is_active = IF(is_active = 1, 0, 1) WHERE id = :id");
        $stmt->execute(['id' => $id]);
        Response::success(null, 'Product status toggled');
    }
}
