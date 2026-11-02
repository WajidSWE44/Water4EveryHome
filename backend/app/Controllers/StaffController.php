<?php
// backend/app/Controllers/StaffController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class StaffController {
    public static function index(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $role = $_GET['role'] ?? null;

        $sql = "
            SELECT 
                u.id, u.name, u.email, u.phone, u.status, u.created_at,
                sp.employee_id, sp.department, sp.vehicle_number,
                GROUP_CONCAT(r.name) as roles,
                GROUP_CONCAT(r.display_name SEPARATOR ', ') as role_names
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            LEFT JOIN staff_profiles sp ON sp.user_id = u.id
            WHERE r.name != 'customer'
        ";

        $params = [];
        if ($role) {
            $sql .= " AND r.name = :role ";
            $params['role'] = $role;
        }

        $sql .= " GROUP BY u.id ORDER BY u.id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function roles(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM roles WHERE name != 'customer' ORDER BY id ASC");
        Response::success($stmt->fetchAll());
    }

    public static function store(): void {
        $user = AuthMiddleware::requireRoles('superadmin', 'admin');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'name'        => 'required|min:2',
            'phone'       => 'required|min:10',
            'role_id'     => 'required|numeric',
            'department'  => 'required',
            'password'    => 'required|min:6'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $db = Database::getConnection();
        $phone = trim($data['phone']);
        $email = !empty($data['email']) ? trim($data['email']) : null;

        // Check unique phone
        $chk = $db->prepare("SELECT id FROM users WHERE phone = :p LIMIT 1");
        $chk->execute(['p' => $phone]);
        if ($chk->fetch()) {
            Response::error('Phone number already in use by another user.', 409);
        }

        $passwordHash = password_hash(trim($data['password']), PASSWORD_BCRYPT);
        $empId = 'EMP-' . str_pad((string)random_int(100, 999), 3, '0', STR_PAD_LEFT);

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO users (name, email, phone, password_hash, status, is_phone_verified)
                VALUES (:name, :email, :phone, :hash, 'active', 1)
            ");
            $stmt->execute([
                'name'  => trim($data['name']),
                'email' => $email,
                'phone' => $phone,
                'hash'  => $passwordHash
            ]);
            $staffUserId = (int)$db->lastInsertId();

            // Assign role
            $db->prepare("INSERT INTO user_roles (user_id, role_id) VALUES (:uid, :rid)")
               ->execute(['uid' => $staffUserId, 'rid' => (int)$data['role_id']]);

            // Create staff profile
            $spStmt = $db->prepare("
                INSERT INTO staff_profiles (user_id, employee_id, department, vehicle_number)
                VALUES (:uid, :empid, :dept, :veh)
            ");
            $spStmt->execute([
                'uid'   => $staffUserId,
                'empid' => $empId,
                'dept'  => trim($data['department']),
                'veh'   => trim($data['vehicle_number'] ?? '')
            ]);

            $db->commit();
            Audit::log('create_staff_user', 'users', $staffUserId, null, ['employee_id' => $empId]);

            Response::success(['id' => $staffUserId, 'employee_id' => $empId], 'Staff account created successfully.', 201);
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to create staff member: ' . $e->getMessage(), 500);
        }
    }
}
