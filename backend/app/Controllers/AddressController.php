<?php
// backend/app/Controllers/AddressController.php

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../Helpers/Response.php';
require_once __DIR__ . '/../Helpers/Validator.php';
require_once __DIR__ . '/../Helpers/Auth.php';
require_once __DIR__ . '/../Helpers/Audit.php';
require_once __DIR__ . '/../Middleware/AuthMiddleware.php';

class AddressController {
    public static function index(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::success([]);
        }

        $db = Database::getConnection();
        $stmt = $db->prepare("
            SELECT 
                a.*,
                sa.name as service_area_title,
                sa.delivery_fee,
                sa.is_active as is_area_active,
                u.name as approved_by_name
            FROM addresses a
            JOIN service_areas sa ON sa.id = a.service_area_id
            LEFT JOIN users u ON u.id = a.approved_by
            WHERE a.customer_id = :cust_id
            ORDER BY a.is_default DESC, a.created_at DESC
        ");
        $stmt->execute(['cust_id' => $customerId]);
        Response::success($stmt->fetchAll());
    }

    public static function serviceAreas(): void {
        $db = Database::getConnection();
        $stmt = $db->query("SELECT * FROM service_areas WHERE is_active = 1 ORDER BY name ASC");
        Response::success($stmt->fetchAll());
    }

    public static function store(): void {
        $user = AuthMiddleware::authenticate();
        $customerId = $user['customer_id'];

        if (!$customerId) {
            Response::forbidden('Only registered customers can add delivery addresses.');
        }

        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

        $v = Validator::make($data, [
            'recipient_name'  => 'required|min:2',
            'phone'           => 'required|min:10',
            'service_area_id' => 'required|numeric',
            'street_address'  => 'required|min:5'
        ]);

        if ($v->fails()) {
            Response::error($v->firstError(), 422, $v->errors());
        }

        $db = Database::getConnection();

        // Check if service area exists and is active
        $areaStmt = $db->prepare("SELECT id, name, city FROM service_areas WHERE id = :id AND is_active = 1 LIMIT 1");
        $areaStmt->execute(['id' => $data['service_area_id']]);
        $area = $areaStmt->fetch();

        if (!$area) {
            Response::error('Selected area is currently not within our active delivery coverage.', 400);
        }

        $areaName = $area['name'];
        $city = $area['city'] ?? 'Lahore';
        $isDefault = !empty($data['is_default']) ? 1 : 0;

        $db->beginTransaction();
        try {
            if ($isDefault) {
                $db->prepare("UPDATE addresses SET is_default = 0 WHERE customer_id = :cid")
                   ->execute(['cid' => $customerId]);
            }

            // New addresses have a pending approval status as per SRS FR-02
            $stmt = $db->prepare("
                INSERT INTO addresses (
                    customer_id, recipient_name, phone, service_area_id, area_name,
                    street_address, city, landmark, is_default, approval_status
                ) VALUES (
                    :cid, :rname, :phone, :area_id, :area_name,
                    :street, :city, :landmark, :is_default, 'pending'
                )
            ");
            $stmt->execute([
                'cid'        => $customerId,
                'rname'      => trim($data['recipient_name']),
                'phone'      => trim($data['phone']),
                'area_id'    => $area['id'],
                'area_name'  => $areaName,
                'street'     => trim($data['street_address']),
                'city'       => $city,
                'landmark'   => trim($data['landmark'] ?? ''),
                'is_default' => $isDefault
            ]);
            $addressId = (int)$db->lastInsertId();

            // Record verification history
            $hist = $db->prepare("INSERT INTO address_verification_history (address_id, status, notes, changed_by) VALUES (:aid, 'pending', 'Submitted for review', :uid)");
            $hist->execute([
                'aid' => $addressId,
                'uid' => $user['id']
            ]);

            // Notify Admin
            $notif = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, link)
                SELECT id, 'New Delivery Address Pending Approval', :msg, 'address', '/admin/addresses'
                FROM users WHERE id IN (SELECT user_id FROM user_roles WHERE role_id IN (1, 2))
            ");
            $notif->execute(['msg' => "Customer {$user['name']} added new address in {$areaName} awaiting approval."]);

            $db->commit();
            Audit::log('create_address', 'addresses', $addressId);

            Response::success([
                'id'              => $addressId,
                'approval_status' => 'pending'
            ], 'Address added successfully! It is pending administrator verification.', 201);

        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to save address: ' . $e->getMessage(), 500);
        }
    }

    public static function adminList(): void {
        AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $status = $_GET['status'] ?? null;
        $sql = "
            SELECT 
                a.*,
                sa.name as service_area_name,
                c.customer_code,
                u.name as customer_name,
                u.phone as customer_phone,
                u.email as customer_email,
                approver.name as approved_by_name
            FROM addresses a
            JOIN customers c ON c.id = a.customer_id
            JOIN users u ON u.id = c.user_id
            JOIN service_areas sa ON sa.id = a.service_area_id
            LEFT JOIN users approver ON approver.id = a.approved_by
        ";

        $params = [];
        if ($status && in_array($status, ['pending', 'approved', 'rejected'])) {
            $sql .= " WHERE a.approval_status = :status ";
            $params['status'] = $status;
        }

        $sql .= " ORDER BY (a.approval_status = 'pending') DESC, a.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Response::success($stmt->fetchAll());
    }

    public static function approve(int $id): void {
        $admin = AuthMiddleware::requireRoles('superadmin', 'admin');
        $db = Database::getConnection();

        $addrStmt = $db->prepare("
            SELECT a.*, c.user_id as customer_user_id 
            FROM addresses a 
            JOIN customers c ON c.id = a.customer_id 
            WHERE a.id = :id 
            LIMIT 1
        ");
        $addrStmt->execute(['id' => $id]);
        $addr = $addrStmt->fetch();

        if (!$addr) {
            Response::notFound('Address not found');
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                UPDATE addresses 
                SET approval_status = 'approved', 
                    approved_by = :admin_id, 
                    approved_at = NOW(), 
                    rejection_reason = NULL 
                WHERE id = :id
            ");
            $stmt->execute([
                'admin_id' => $admin['id'],
                'id'       => $id
            ]);

            // History
            $hist = $db->prepare("INSERT INTO address_verification_history (address_id, status, notes, changed_by) VALUES (:aid, 'approved', 'Approved by administrator', :uid)");
            $hist->execute(['aid' => $id, 'uid' => $admin['id']]);

            // Notify customer
            $notif = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (:uid, 'Address Approved', :msg, 'address', '/addresses')
            ");
            $notif->execute([
                'uid' => $addr['customer_user_id'],
                'msg' => "Your address '{$addr['street_address']}, {$addr['area_name']}' has been approved. You can now place orders to this location."
            ]);

            $db->commit();
            Audit::log('approve_address', 'addresses', $id);

            Response::success(null, 'Address has been approved successfully.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to approve address: ' . $e->getMessage(), 500);
        }
    }

    public static function reject(int $id): void {
        $admin = AuthMiddleware::requireRoles('superadmin', 'admin');
        $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $reason = trim($data['reason'] ?? 'Address is outside immediate delivery radius or incomplete details.');

        $db = Database::getConnection();
        $addrStmt = $db->prepare("
            SELECT a.*, c.user_id as customer_user_id 
            FROM addresses a 
            JOIN customers c ON c.id = a.customer_id 
            WHERE a.id = :id 
            LIMIT 1
        ");
        $addrStmt->execute(['id' => $id]);
        $addr = $addrStmt->fetch();

        if (!$addr) {
            Response::notFound('Address not found');
        }

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                UPDATE addresses 
                SET approval_status = 'rejected', 
                    rejection_reason = :reason,
                    approved_by = :admin_id,
                    approved_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                'reason'   => $reason,
                'admin_id' => $admin['id'],
                'id'       => $id
            ]);

            // History
            $hist = $db->prepare("INSERT INTO address_verification_history (address_id, status, notes, changed_by) VALUES (:aid, 'rejected', :reason, :uid)");
            $hist->execute(['aid' => $id, 'reason' => $reason, 'uid' => $admin['id']]);

            // Notify customer
            $notif = $db->prepare("
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES (:uid, 'Address Verification Update', :msg, 'address', '/addresses')
            ");
            $notif->execute([
                'uid' => $addr['customer_user_id'],
                'msg' => "Your address '{$addr['street_address']}' could not be approved. Reason: {$reason}"
            ]);

            $db->commit();
            Audit::log('reject_address', 'addresses', $id, null, ['reason' => $reason]);

            Response::success(null, 'Address rejected.');
        } catch (Throwable $e) {
            $db->rollBack();
            Response::error('Failed to reject address: ' . $e->getMessage(), 500);
        }
    }
}
