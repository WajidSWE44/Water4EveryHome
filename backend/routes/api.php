<?php
// backend/routes/api.php

require_once __DIR__ . '/../app/Controllers/AuthController.php';
require_once __DIR__ . '/../app/Controllers/ProductController.php';
require_once __DIR__ . '/../app/Controllers/AddressController.php';
require_once __DIR__ . '/../app/Controllers/OrderController.php';
require_once __DIR__ . '/../app/Controllers/DeliveryController.php';
require_once __DIR__ . '/../app/Controllers/ProductionController.php';
require_once __DIR__ . '/../app/Controllers/BottleController.php';
require_once __DIR__ . '/../app/Controllers/InventoryController.php';
require_once __DIR__ . '/../app/Controllers/SubscriptionController.php';
require_once __DIR__ . '/../app/Controllers/EventController.php';
require_once __DIR__ . '/../app/Controllers/PaymentController.php';
require_once __DIR__ . '/../app/Controllers/ReportController.php';
require_once __DIR__ . '/../app/Controllers/StaffController.php';
require_once __DIR__ . '/../app/Controllers/NotificationController.php';
require_once __DIR__ . '/../app/Controllers/AuditController.php';

class Router {
    private static array $routes = [];

    public static function get(string $pattern, callable $handler): void {
        self::$routes['GET'][$pattern] = $handler;
    }

    public static function post(string $pattern, callable $handler): void {
        self::$routes['POST'][$pattern] = $handler;
    }

    public static function put(string $pattern, callable $handler): void {
        self::$routes['PUT'][$pattern] = $handler;
    }

    public static function delete(string $pattern, callable $handler): void {
        self::$routes['DELETE'][$pattern] = $handler;
    }

    public static function dispatch(string $method, string $uri): void {
        // Strip query string
        $path = parse_url($uri, PHP_URL_PATH);
        
        // Remove trailing slashes and normalize
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }

        // Support sub-path when served under /backend/public
        $baseDirs = ['/backend/public', '/Water4EveryHome/backend/public'];
        foreach ($baseDirs as $base) {
            if (str_starts_with($path, $base)) {
                $path = substr($path, strlen($base));
                if ($path === '') $path = '/';
            }
        }

        $routesForMethod = self::$routes[$method] ?? [];

        foreach ($routesForMethod as $pattern => $handler) {
            // Convert {param} to regex capture groups
            $regex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '([^/]+)', $pattern);
            $regex = '#^' . $regex . '$#';

            if (preg_match($regex, $path, $matches)) {
                array_shift($matches); // Remove full match
                call_user_func_array($handler, $matches);
                return;
            }
        }

        Response::notFound("Route {$method} {$path} not found");
    }
}

// -----------------------------------------------------------------------------
// DEFINE ROUTES
// -----------------------------------------------------------------------------

// API Root Information
Router::get('/', function() {
    Response::success([
        'service'   => 'Water 4 Every Home API',
        'version'   => '1.0.0',
        'status'    => 'ok',
        'timestamp' => date('c'),
        'database'  => 'connected',
        'endpoints' => [
            'health'     => '/api/health',
            'products'   => '/api/products',
            'categories' => '/api/categories',
            'auth'       => '/api/auth/login'
        ]
    ], 'Water 4 Every Home API service is running');
});

Router::get('/api', function() {
    Response::success([
        'service'   => 'Water 4 Every Home API',
        'version'   => '1.0.0',
        'status'    => 'ok',
        'timestamp' => date('c'),
        'database'  => 'connected',
        'endpoints' => [
            'health'     => '/api/health',
            'products'   => '/api/products',
            'categories' => '/api/categories',
            'auth'       => '/api/auth/login'
        ]
    ], 'Water 4 Every Home API service is running');
});

// System Health Check
Router::get('/api/health', function() {
    Response::success([
        'status'    => 'ok',
        'service'   => 'Water 4 Every Home API',
        'timestamp' => date('c'),
        'database'  => 'connected'
    ]);
});

// Authentication (FR-01)
Router::post('/api/auth/register', [AuthController::class, 'register']);
Router::post('/api/auth/login', [AuthController::class, 'login']);
Router::post('/api/auth/send-otp', [AuthController::class, 'sendOtp']);
Router::post('/api/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Router::get('/api/auth/me', [AuthController::class, 'me']);
Router::post('/api/auth/logout', [AuthController::class, 'logout']);

// Products (FR-03, FR-04)
Router::get('/api/products', [ProductController::class, 'index']);
Router::get('/api/products/{id}', [ProductController::class, 'show']);
Router::get('/api/categories', [ProductController::class, 'categories']);
Router::post('/api/admin/products', [ProductController::class, 'store']);
Router::put('/api/admin/products/{id}', [ProductController::class, 'update']);
Router::post('/api/admin/products/{id}/toggle', [ProductController::class, 'toggleStatus']);

// Customer Addresses & Service Areas (FR-02)
Router::get('/api/addresses', [AddressController::class, 'index']);
Router::post('/api/addresses', [AddressController::class, 'store']);
Router::get('/api/service-areas', [AddressController::class, 'serviceAreas']);
Router::get('/api/admin/addresses', [AddressController::class, 'adminList']);
Router::post('/api/admin/addresses/{id}/approve', [AddressController::class, 'approve']);
Router::post('/api/admin/addresses/{id}/reject', [AddressController::class, 'reject']);

// Orders (FR-05)
Router::post('/api/orders', [OrderController::class, 'store']);
Router::get('/api/orders', [OrderController::class, 'myOrders']);
Router::get('/api/orders/{id}', [OrderController::class, 'show']);
Router::post('/api/orders/{id}/cancel', [OrderController::class, 'cancel']);
Router::get('/api/admin/orders', [OrderController::class, 'adminList']);
Router::get('/api/admin/orders/{id}', [OrderController::class, 'show']);
Router::post('/api/admin/orders/{id}/confirm', [OrderController::class, 'confirm']);
Router::post('/api/admin/orders/{id}/assign', [OrderController::class, 'assignDelivery']);

// Deliveries (FR-12)
Router::get('/api/staff/deliveries', [DeliveryController::class, 'myDeliveries']);
Router::get('/api/staff/deliveries/{id}', [DeliveryController::class, 'show']);
Router::post('/api/staff/deliveries/{id}/status', [DeliveryController::class, 'updateStatus']);

// Production & Quality Control (FR-09, FR-10)
Router::get('/api/production/sources', [ProductionController::class, 'sources']);
Router::get('/api/production/batches', [ProductionController::class, 'batches']);
Router::post('/api/production/batches', [ProductionController::class, 'storeBatch']);
Router::get('/api/production/batches/{id}', [ProductionController::class, 'showBatch']);
Router::get('/api/quality/tests', [ProductionController::class, 'qualityTests']);
Router::post('/api/production/batches/{id}/tests', [ProductionController::class, 'recordTest']);
Router::post('/api/production/batches/{id}/approve', [ProductionController::class, 'approveBatch']);
Router::post('/api/production/batches/{id}/reject', [ProductionController::class, 'rejectBatch']);

// Reusable Bottles & QR Tracking (FR-07, FR-08)
Router::get('/api/bottles', [BottleController::class, 'index']);
Router::post('/api/admin/bottles', [BottleController::class, 'store']);
Router::get('/api/bottles/scan/{code}', [BottleController::class, 'scan']);
Router::post('/api/bottles/{id}/status', [BottleController::class, 'updateStatus']);
Router::post('/api/bottles/{id}/inspect', [BottleController::class, 'inspect']);

// Inventory Balances & Movements (FR-11)
Router::get('/api/inventory', [InventoryController::class, 'balances']);
Router::get('/api/inventory/movements', [InventoryController::class, 'movements']);
Router::post('/api/inventory/adjust', [InventoryController::class, 'adjust']);

// Subscriptions (FR-06)
Router::get('/api/subscriptions', [SubscriptionController::class, 'index']);
Router::post('/api/subscriptions', [SubscriptionController::class, 'store']);
Router::post('/api/subscriptions/{id}/pause', [SubscriptionController::class, 'pause']);
Router::post('/api/subscriptions/{id}/resume', [SubscriptionController::class, 'resume']);
Router::post('/api/subscriptions/{id}/cancel', [SubscriptionController::class, 'cancel']);
Router::post('/api/admin/subscriptions/{id}/generate-order', [SubscriptionController::class, 'generateOrder']);

// Event & Bulk Bookings (FR-13)
Router::get('/api/events', [EventController::class, 'index']);
Router::post('/api/events', [EventController::class, 'store']);
Router::post('/api/admin/events/{id}/quote', [EventController::class, 'quote']);
Router::post('/api/events/{id}/accept', [EventController::class, 'accept']);
Router::post('/api/admin/events/{id}/convert-order', [EventController::class, 'convertToOrder']);

// Payments & Deposits (FR-08, FR-14)
Router::get('/api/payments', [PaymentController::class, 'index']);
Router::post('/api/payments/confirm-cod/{id}', [PaymentController::class, 'confirmCod']);
Router::post('/api/payments/demo-complete', [PaymentController::class, 'demoOnlinePay']);
Router::get('/api/deposits', [PaymentController::class, 'deposits']);
Router::post('/api/deposits/refund', [PaymentController::class, 'refundDeposit']);

// Reports & Analytics (FR-16)
Router::get('/api/reports/dashboard', [ReportController::class, 'dashboard']);
Router::get('/api/reports/export', [ReportController::class, 'exportCsv']);

// Staff Fleet & Roles
Router::get('/api/staff', [StaffController::class, 'index']);
Router::get('/api/staff/roles', [StaffController::class, 'roles']);
Router::post('/api/staff', [StaffController::class, 'store']);

// In-app Notifications
Router::get('/api/notifications', [NotificationController::class, 'index']);
Router::post('/api/notifications/mark-read', [NotificationController::class, 'markAllRead']);

// Audit Trail
Router::get('/api/audit-logs', [AuditController::class, 'index']);
