<?php
// backend/app/Helpers/Audit.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/Auth.php';

class Audit {
    public static function log(string $action, string $entityType, ?int $entityId = null, $oldValues = null, $newValues = null): void {
        try {
            $db = Database::getConnection();
            $userId = Auth::id();
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

            $stmt = $db->prepare("
                INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
                VALUES (:user_id, :action, :entity_type, :entity_id, :old_values, :new_values, :ip_address)
            ");
            $stmt->execute([
                'user_id'     => $userId,
                'action'      => $action,
                'entity_type' => $entityType,
                'entity_id'   => $entityId,
                'old_values'  => $oldValues ? json_encode($oldValues) : null,
                'new_values'  => $newValues ? json_encode($newValues) : null,
                'ip_address'  => $ip,
            ]);
        } catch (Throwable $e) {
            // Keep going even if audit logging fails
            error_log("Audit log failed: " . $e->getMessage());
        }
    }
}
