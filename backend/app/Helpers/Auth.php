<?php
// backend/app/Helpers/Auth.php

require_once __DIR__ . '/../../config/database.php';

class Auth {
    private static ?array $currentUser = null;

    public static function user(): ?array {
        if (self::$currentUser !== null) {
            return self::$currentUser;
        }

        $token = self::getBearerToken();
        if (!$token) {
            return null;
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT u.* 
            FROM users u
            WHERE u.api_token = :token 
              AND u.status = 'active'
              AND (u.token_expires_at IS NULL OR u.token_expires_at > NOW())
            LIMIT 1
        ");
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch();

        if (!$user) {
            return null;
        }

        // Fetch user roles
        $rolesStmt = $db->prepare("
            SELECT r.name, r.display_name 
            FROM roles r
            JOIN user_roles ur ON ur.role_id = r.id
            WHERE ur.user_id = :user_id
        ");
        $rolesStmt->execute(['user_id' => $user['id']]);
        $roles = $rolesStmt->fetchAll();
        $user['roles'] = array_column($roles, 'name');
        $user['role_details'] = $roles;

        // Fetch customer profile if customer
        $custStmt = $db->prepare("SELECT id, customer_code, bottle_deposit_balance FROM customers WHERE user_id = :user_id LIMIT 1");
        $custStmt->execute(['user_id' => $user['id']]);
        $cust = $custStmt->fetch();
        if ($cust) {
            $user['customer_id'] = $cust['id'];
            $user['customer_code'] = $cust['customer_code'];
            $user['deposit_balance'] = $cust['bottle_deposit_balance'];
        } else {
            $user['customer_id'] = null;
        }

        // Fetch staff profile if staff
        $staffStmt = $db->prepare("SELECT id, employee_id, department, vehicle_number FROM staff_profiles WHERE user_id = :user_id LIMIT 1");
        $staffStmt->execute(['user_id' => $user['id']]);
        $staff = $staffStmt->fetch();
        if ($staff) {
            $user['staff_id'] = $staff['id'];
            $user['employee_id'] = $staff['employee_id'];
            $user['vehicle_number'] = $staff['vehicle_number'];
        } else {
            $user['staff_id'] = null;
        }

        unset($user['password_hash']);
        self::$currentUser = $user;
        return self::$currentUser;
    }

    public static function id(): ?int {
        $user = self::user();
        return $user ? (int)$user['id'] : null;
    }

    public static function hasRole(string ...$roles): bool {
        $user = self::user();
        if (!$user || empty($user['roles'])) {
            return false;
        }
        // Superadmin has all permissions
        if (in_array('superadmin', $user['roles'], true)) {
            return true;
        }
        foreach ($roles as $r) {
            if (in_array($r, $user['roles'], true)) {
                return true;
            }
        }
        return false;
    }

    public static function generateToken(int $userId): string {
        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+7 days'));

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET api_token = :token, token_expires_at = :expires WHERE id = :id");
        $stmt->execute([
            'token'   => $token,
            'expires' => $expires,
            'id'      => $userId
        ]);

        return $token;
    }

    public static function clearToken(int $userId): void {
        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET api_token = NULL, token_expires_at = NULL WHERE id = :id");
        $stmt->execute(['id' => $userId]);
        self::$currentUser = null;
    }

    public static function getBearerToken(): ?string {
        $headers = self::getRequestHeaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;

        if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
        }

        if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $matches)) {
            return $matches[1];
        }

        return $_GET['token'] ?? null;
    }

    private static function getRequestHeaders(): array {
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            if ($headers !== false) {
                return $headers;
            }
        }

        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $header = str_replace(' ', '-', ucwords(str_replace('_', ' ', strtolower(substr($key, 5)))));
                $headers[$header] = $value;
            }
        }
        return $headers;
    }
}
