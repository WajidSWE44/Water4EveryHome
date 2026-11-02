<?php
// backend/public/index.php

// Display errors in dev mode for debug
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../app/Middleware/CorsMiddleware.php';
require_once __DIR__ . '/../app/Helpers/Response.php';

// Handle CORS
CorsMiddleware::handle();

require_once __DIR__ . '/../routes/api.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    Router::dispatch($method, $uri);
} catch (Throwable $e) {
    Response::error('Server Error: ' . $e->getMessage(), 500, [
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
