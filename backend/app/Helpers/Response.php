<?php
// backend/app/Helpers/Response.php

class Response {
    public static function json(array $data, int $status = 200): void {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function success($data = null, string $message = 'Operation successful', int $status = 200): void {
        self::json([
            'success' => true,
            'message' => $message,
            'data'    => $data
        ], $status);
    }

    public static function error(string $message = 'An error occurred', int $status = 400, $errors = null): void {
        self::json([
            'success' => false,
            'message' => $message,
            'errors'  => $errors
        ], $status);
    }

    public static function unauthorized(string $message = 'Unauthorized'): void {
        self::error($message, 401);
    }

    public static function forbidden(string $message = 'Forbidden: Access denied'): void {
        self::error($message, 403);
    }

    public static function notFound(string $message = 'Resource not found'): void {
        self::error($message, 404);
    }
}
