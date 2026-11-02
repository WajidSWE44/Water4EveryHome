<?php
// backend/config/config.php
$localConfig = file_exists(__DIR__ . '/local.php')
    ? require __DIR__ . '/local.php'
    : [];

$jwtSecret = getenv('JWT_SECRET') ?: ($localConfig['jwt_secret'] ?? '');
return [
    'app_name' => 'Water 4 Every Home (W4EH)',
    'app_env' => 'development', // 'development' or 'production'
    'base_url' => 'http://127.0.0.1:8000',
    'jwt_secret' => $jwtSecret,
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:80',
        'http://127.0.0.1:80',
        'http://localhost'
    ],
    'upload_dir' => __DIR__ . '/../storage/uploads',
    'log_dir' => __DIR__ . '/../storage/logs',
];
