<?php
// backend/app/Controllers/NotificationController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class NotificationController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();

        $stmt = $db->prepare("
            SELECT * FROM notifications 
            WHERE user_id = :uid 
            ORDER BY created_at DESC 
            LIMIT 30
        ");
        $stmt->execute(['uid' => $user['id']]);
        Response::success($stmt->fetchAll());
    }

    public static function markAllRead(): void {
        $user = AuthMiddleware::authenticate();
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :uid");
        $stmt->execute(['uid' => $user['id']]);
        Response::success(null, 'All notifications marked as read.');
    }
}
