<?php
// backend/app/Controllers/AuthController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class AuthController {
    public static function register(): void {
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'name'     => 'required|min:2',
            'phone'    => 'required|min:10',
            'password' => 'required|min:6'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $email = !empty($data['email']) ? trim($data['email']) : null;
        $phone = trim($data['phone']);
        $name = trim($data['name']);
        $password = trim($data['password']);

        $db = Database::getConnection();

        // Check unique phone
        $stmt = $db->prepare("SELECT id FROM users WHERE phone = :phone LIMIT 1");
        $stmt->execute(['phone' => $phone]);
        if ($stmt->fetch()) {
            Response::error('This phone number is already registered.', 409);
        }

        // Check unique email if provided
        if ($email) {
            $stmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
            $stmt->execute(['email' => $email]);
            if ($stmt->fetch()) {
                Response::error('This email address is already in use.', 409);
            }
        }

        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        // Generate development demo OTP
        $otp = (string)random_int(100000, 999999);
        $otpExpires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO users (name, email, phone, password_hash, status, otp_code, otp_expires_at, is_phone_verified)
                VALUES (:name, :email, :phone, :password_hash, 'active', :otp, :otp_expires, 0)
            ");
            $stmt->execute([
                'name'          => $name,
                'email'         => $email,
                'phone'         => $phone,
                'password_hash' => $passwordHash,
                'otp'           => $otp,
                'otp_expires'   => $otpExpires
            ]);
            $userId = (int)$db->lastInsertId();

            // Assign customer role (id = 6)
            $roleStmt = $db->prepare("INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, 6)");
            $roleStmt->execute(['user_id' => $userId]);

            // Create customer record
            $custCode = 'CUST-' . str_pad((string)$userId, 4, '0', STR_PAD_LEFT);
            $custStmt = $db->prepare("INSERT INTO customers (user_id, customer_code, bottle_deposit_balance) VALUES (:user_id, :code, 0.00)");
            $custStmt->execute([
                'user_id' => $userId,
                'code'    => $custCode
            ]);
            $customerId = (int)$db->lastInsertId();

            // Create customer deposit record
            $depStmt = $db->prepare("INSERT INTO customer_deposits (customer_id, current_balance) VALUES (:cust_id, 0.00)");
            $depStmt->execute(['cust_id' => $customerId]);

            $db->commit();

            $token = Auth::generateToken($userId);
            Audit::log('customer_registered', 'users', $userId);

            Response::success([
                'token' => $token,
                'user'  => [
                    'id'                => $userId,
                    'customer_id'       => $customerId,
                    'name'              => $name,
                    'email'             => $email,
                    'phone'             => $phone,
                    'customer_code'     => $custCode,
                    'is_phone_verified' => 0,
                    'roles'             => ['customer']
                ],
                'demo_otp' => $otp // Clearly labelled for demonstration testing
            ], 'Registration successful! Verification OTP generated.', 201);

        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public static function login(): void {
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'login'    => 'required', // phone or email
            'password' => 'required'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422);
        }

        $login = trim($data['login']);
        $password = trim($data['password']);

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT u.* 
            FROM users u
            WHERE u.phone = :login_phone OR u.email = :login_email
            LIMIT 1
        ");
        $stmt->execute([
            'login_phone' => $login,
            'login_email' => $login
        ]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid credentials. Please verify your phone/email and password.', 401);
        }

        if ($user['status'] !== 'active') {
            Response::forbidden("Account is {$user['status']}. Please contact management.");
        }

        $token = Auth::generateToken((int)$user['id']);

        // Fetch roles
        $rolesStmt = $db->prepare("
            SELECT r.name 
            FROM roles r 
            JOIN user_roles ur ON ur.role_id = r.id 
            WHERE ur.user_id = :uid
        ");
        $rolesStmt->execute(['uid' => $user['id']]);
        $roles = $rolesStmt->fetchAll(PDO::FETCH_COLUMN);

        // Fetch customer profile
        $custStmt = $db->prepare("SELECT id, customer_code, bottle_deposit_balance FROM customers WHERE user_id = :uid LIMIT 1");
        $custStmt->execute(['uid' => $user['id']]);
        $cust = $custStmt->fetch();

        // Fetch staff profile
        $staffStmt = $db->prepare("SELECT id, employee_id, department, vehicle_number FROM staff_profiles WHERE user_id = :uid LIMIT 1");
        $staffStmt->execute(['uid' => $user['id']]);
        $staff = $staffStmt->fetch();

        Audit::log('user_login', 'users', (int)$user['id']);

        Response::success([
            'token' => $token,
            'user'  => [
                'id'                => (int)$user['id'],
                'name'              => $user['name'],
                'email'             => $user['email'],
                'phone'             => $user['phone'],
                'is_phone_verified' => (int)$user['is_phone_verified'],
                'roles'             => $roles,
                'customer_id'       => $cust ? (int)$cust['id'] : null,
                'customer_code'     => $cust['customer_code'] ?? null,
                'deposit_balance'   => $cust['bottle_deposit_balance'] ?? 0.00,
                'staff_id'          => $staff ? (int)$staff['id'] : null,
                'employee_id'       => $staff['employee_id'] ?? null,
                'vehicle_number'    => $staff['vehicle_number'] ?? null
            ]
        ], 'Login successful');
    }

    public static function sendOtp(): void {
        $user = AuthMiddleware::authenticate();
        $otp = (string)random_int(100000, 999999);
        $otpExpires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $db = Database::getConnection();
        $stmt = $db->prepare("UPDATE users SET otp_code = :otp, otp_expires_at = :expires WHERE id = :id");
        $stmt->execute([
            'otp'     => $otp,
            'expires' => $otpExpires,
            'id'      => $user['id']
        ]);

        Response::success([
            'message'  => 'Verification OTP generated (Simulated SMS mode)',
            'demo_otp' => $otp
        ], 'OTP sent successfully');
    }

    public static function verifyOtp(): void {
        $user = AuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $code = trim($data['otp_code'] ?? '');
        if (empty($code)) {
            Response::error('OTP code is required.', 422);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT id, otp_code, otp_expires_at 
            FROM users 
            WHERE id = :id 
            LIMIT 1
        ");
        $stmt->execute(['id' => $user['id']]);
        $row = $stmt->fetch();

        // Allow demo master OTP 123456 or matching database OTP
        $valid = false;
        if ($code === '123456') {
            $valid = true;
        } elseif ($row && $row['otp_code'] === $code && strtotime($row['otp_expires_at']) >= time()) {
            $valid = true;
        }

        if (!$valid) {
            Response::error('Invalid or expired OTP code.', 400);
        }

        $update = $db->prepare("UPDATE users SET is_phone_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = :id");
        $update->execute(['id' => $user['id']]);

        Response::success(['is_phone_verified' => 1], 'Phone verified successfully');
    }

    public static function me(): void {
        $user = AuthMiddleware::authenticate();
        Response::success($user);
    }

    public static function logout(): void {
        $userId = Auth::id();
        if ($userId) {
            Auth::clearToken($userId);
            Audit::log('user_logout', 'users', $userId);
        }
        Response::success(null, 'Logged out successfully');
    }
}
