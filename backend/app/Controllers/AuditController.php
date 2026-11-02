<?php
// backend/app/Controllers/AuditController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class AuditController {
    public static function index(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $stmt = $db->query("
            SELECT al.*, u.name as user_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            ORDER BY al.created_at DESC
            LIMIT 100
        ");
        Response::success($stmt->fetchAll());
    }
}
