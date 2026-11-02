<?php
// backend/app/Middleware/AuthMiddleware.php

require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Response.php';

class AuthMiddleware {
    public static function authenticate(): array {
        $user = Auth::user();
        if (!$user) {
            Response::unauthorized('Authentication required. Please login.');
        }
        if ($user['status'] !== 'active') {
            Response::forbidden('Your account is ' . $user['status'] . '. Contact support.');
        }
        return $user;
    }

    public static function requireRoles(string ...$roles): array {
        $user = self::authenticate();
        if (!Auth::hasRole(...$roles)) {
            Response::forbidden('Access denied. Required role: ' . implode(' or ', $roles));
        }
        return $user;
    }
}
