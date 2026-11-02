<?php
// backend/app/Controllers/ReportController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class ReportController {
    public static function dashboard(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'operations', 'finance');
        $db = Database::getConnection();

        // Total customers
        $custCount = (int)$db->query("SELECT COUNT(*) FROM customers")->fetchColumn();

        // Orders metrics
        $totalOrders = (int)$db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $pendingOrders = (int)$db->query("SELECT COUNT(*) FROM orders WHERE order_status = 'pending'")->fetchColumn();
        $processingOrders = (int)$db->query("SELECT COUNT(*) FROM orders WHERE order_status IN ('confirmed', 'processing', 'ready', 'out_for_delivery')")->fetchColumn();
        $deliveredOrders = (int)$db->query("SELECT COUNT(*) FROM orders WHERE order_status = 'delivered'")->fetchColumn();

        // Active subscriptions
        $activeSubs = (int)$db->query("SELECT COUNT(*) FROM subscriptions WHERE status = 'active'")->fetchColumn();

        // Pending addresses
        $pendingAddresses = (int)$db->query("SELECT COUNT(*) FROM addresses WHERE approval_status = 'pending'")->fetchColumn();

        // Low stock count
        $lowStockCount = (int)$db->query("
            SELECT COUNT(*) 
            FROM products p 
            LEFT JOIN inventory_balances ib ON ib.product_id = p.id 
            WHERE p.is_active = 1 AND (COALESCE(ib.quantity_on_hand,0) - COALESCE(ib.quantity_reserved,0)) <= COALESCE(ib.reorder_threshold,50)
        ")->fetchColumn();

        // Pending production batches
        $pendingBatches = (int)$db->query("SELECT COUNT(*) FROM production_batches WHERE approval_status = 'pending'")->fetchColumn();

        // Total revenue
        $totalRevenue = (float)$db->query("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'successful'")->fetchColumn();

        // Outstanding deposits
        $totalDeposits = (float)$db->query("SELECT COALESCE(SUM(current_balance), 0) FROM customer_deposits")->fetchColumn();

        // Event bookings pending
        $pendingEvents = (int)$db->query("SELECT COUNT(*) FROM event_bookings WHERE status IN ('pending', 'reviewed')")->fetchColumn();

        // Bottle counts by status
        $bottleCountsStmt = $db->query("
            SELECT current_status, COUNT(*) as count 
            FROM bottle_assets 
            GROUP BY current_status
        ");
        $bottleCounts = [];
        foreach ($bottleCountsStmt->fetchAll() as $row) {
            $bottleCounts[$row['current_status']] = (int)$row['count'];
        }

        // Recent 5 orders
        $recentOrdersStmt = $db->query("
            SELECT o.*, u.name as customer_name, a.area_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN addresses a ON a.id = o.address_id
            ORDER BY o.created_at DESC
            LIMIT 5
        ");
        $recentOrders = $recentOrdersStmt->fetchAll();

        // Recent 5 batch approvals
        $recentBatchesStmt = $db->query("
            SELECT pb.*, ws.name as water_source_name
            FROM production_batches pb
            JOIN water_sources ws ON ws.id = pb.water_source_id
            ORDER BY pb.created_at DESC
            LIMIT 5
        ");
        $recentBatches = $recentBatchesStmt->fetchAll();

        Response::success([
            'metrics' => [
                'total_customers'       => $custCount,
                'total_orders'          => $totalOrders,
                'pending_orders'        => $pendingOrders,
                'processing_orders'     => $processingOrders,
                'delivered_orders'      => $deliveredOrders,
                'active_subscriptions'  => $activeSubs,
                'pending_addresses'     => $pendingAddresses,
                'low_stock_count'       => $lowStockCount,
                'pending_batches'       => $pendingBatches,
                'total_revenue'         => $totalRevenue,
                'total_deposits'        => $totalDeposits,
                'pending_events'        => $pendingEvents,
                'bottle_counts'         => $bottleCounts
            ],
            'recent_orders'  => $recentOrders,
            'recent_batches' => $recentBatches
        ]);
    }

    public static function exportCsv(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin', 'finance');
        $type = $_GET['type'] ?? 'orders';
        $db = Database::getConnection();

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=w4eh_' . $type . '_' . date('Ymd_His') . '.csv');

        $out = fopen('php://output', 'w');

        if ($type === 'inventory') {
            fputcsv($out, ['Product ID', 'Product Name', 'Volume', 'Packaging', 'Unit Price', 'On Hand', 'Reserved', 'Available Stock', 'Reorder Threshold']);
            $stmt = $db->query("
                SELECT p.id, p.name, p.volume_label, p.packaging_type, p.unit_price,
                       COALESCE(ib.quantity_on_hand, 0) as on_hand,
                       COALESCE(ib.quantity_reserved, 0) as reserved,
                       GREATEST(0, COALESCE(ib.quantity_on_hand, 0) - COALESCE(ib.quantity_reserved, 0)) as avail,
                       COALESCE(ib.reorder_threshold, 50) as threshold
                FROM products p
                LEFT JOIN inventory_balances ib ON ib.product_id = p.id
                ORDER BY p.id ASC
            ");
            while ($row = $stmt->fetch()) {
                fputcsv($out, [
                    $row['id'], $row['name'], $row['volume_label'], $row['packaging_type'],
                    $row['unit_price'], $row['on_hand'], $row['reserved'], $row['avail'], $row['threshold']
                ]);
            }
        } else {
            // Orders export
            fputcsv($out, ['Order #', 'Date', 'Customer Name', 'Phone', 'Area', 'Status', 'Payment Method', 'Payment Status', 'Subtotal', 'Delivery Fee', 'Deposit', 'Total Amount']);
            $stmt = $db->query("
                SELECT o.order_number, o.created_at, u.name as customer_name, u.phone, a.area_name,
                       o.order_status, o.payment_method, o.payment_status,
                       o.subtotal_amount, o.delivery_fee, o.deposit_amount, o.total_amount
                FROM orders o
                JOIN customers c ON c.id = o.customer_id
                JOIN users u ON u.id = c.user_id
                JOIN addresses a ON a.id = o.address_id
                ORDER BY o.created_at DESC
            ");
            while ($row = $stmt->fetch()) {
                fputcsv($out, [
                    $row['order_number'], $row['created_at'], $row['customer_name'], $row['phone'],
                    $row['area_name'], $row['order_status'], $row['payment_method'], $row['payment_status'],
                    $row['subtotal_amount'], $row['delivery_fee'], $row['deposit_amount'], $row['total_amount']
                ]);
            }
        }

        fclose($out);
        exit;
    }
}
