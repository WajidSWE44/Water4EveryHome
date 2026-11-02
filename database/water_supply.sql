-- ==============================================================================
-- Water Supply Management System (W4EH - Water 4 Every Home)
-- Database: water_supply_db
-- Engine: MySQL 8+ / InnoDB / utf8mb4
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `water_supply_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `water_supply_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. USERS & ROLES
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `deposit_transactions`;
DROP TABLE IF EXISTS `customer_deposits`;
DROP TABLE IF EXISTS `refunds`;
DROP TABLE IF EXISTS `payment_webhook_events`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `event_bookings`;
DROP TABLE IF EXISTS `delivery_status_history`;
DROP TABLE IF EXISTS `delivery_items`;
DROP TABLE IF EXISTS `deliveries`;
DROP TABLE IF EXISTS `subscription_occurrences`;
DROP TABLE IF EXISTS `subscription_items`;
DROP TABLE IF EXISTS `subscriptions`;
DROP TABLE IF EXISTS `order_status_history`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `bottle_return_inspections`;
DROP TABLE IF EXISTS `bottle_transactions`;
DROP TABLE IF EXISTS `bottle_assets`;
DROP TABLE IF EXISTS `inventory_reservations`;
DROP TABLE IF EXISTS `inventory_movements`;
DROP TABLE IF EXISTS `inventory_balances`;
DROP TABLE IF EXISTS `production_batch_quality_tests`;
DROP TABLE IF EXISTS `quality_tests`;
DROP TABLE IF EXISTS `production_batch_items`;
DROP TABLE IF EXISTS `production_batches`;
DROP TABLE IF EXISTS `water_sources`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `product_categories`;
DROP TABLE IF EXISTS `address_verification_history`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `service_areas`;
DROP TABLE IF EXISTS `staff_profiles`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `display_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NULL UNIQUE,
    `phone` VARCHAR(30) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('active', 'suspended', 'pending_verification') DEFAULT 'active',
    `otp_code` VARCHAR(10) NULL,
    `otp_expires_at` DATETIME NULL,
    `is_phone_verified` TINYINT(1) DEFAULT 1,
    `api_token` VARCHAR(128) NULL UNIQUE,
    `token_expires_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_phone` (`phone`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_api_token` (`api_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
    `user_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (`user_id`, `role_id`),
    CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `customer_code` VARCHAR(50) NOT NULL UNIQUE,
    `bottle_deposit_balance` DECIMAL(12,2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_customers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `staff_profiles` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `employee_id` VARCHAR(50) NOT NULL UNIQUE,
    `department` VARCHAR(100) NOT NULL,
    `vehicle_number` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_staff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. SERVICE LOCATIONS & ADDRESSES
-- -----------------------------------------------------------------------------

CREATE TABLE `service_areas` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL DEFAULT 'Lahore',
    `postal_code` VARCHAR(20) NULL,
    `delivery_fee` DECIMAL(12,2) DEFAULT 50.00,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `addresses` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `recipient_name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `service_area_id` BIGINT UNSIGNED NOT NULL,
    `area_name` VARCHAR(100) NOT NULL,
    `street_address` TEXT NOT NULL,
    `city` VARCHAR(100) NOT NULL DEFAULT 'Lahore',
    `landmark` VARCHAR(150) NULL,
    `is_default` TINYINT(1) DEFAULT 0,
    `approval_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `rejection_reason` VARCHAR(255) NULL,
    `approved_by` BIGINT UNSIGNED NULL,
    `approved_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_addr_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_addr_area` FOREIGN KEY (`service_area_id`) REFERENCES `service_areas` (`id`),
    CONSTRAINT `fk_addr_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_addr_status` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `address_verification_history` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `address_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL,
    `notes` VARCHAR(255) NULL,
    `changed_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_avh_addr` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_avh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. PRODUCT CATALOGUE
-- -----------------------------------------------------------------------------

CREATE TABLE `product_categories` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(150) NOT NULL UNIQUE,
    `description` TEXT NULL,
    `volume_ml` INT UNSIGNED NOT NULL DEFAULT 500,
    `volume_label` VARCHAR(50) NOT NULL DEFAULT '500 ml',
    `packaging_type` VARCHAR(50) NOT NULL DEFAULT 'PET Bottle',
    `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `refundable_deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `image_url` VARCHAR(255) NULL,
    `is_reusable` TINYINT(1) DEFAULT 0,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_prod_cat` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`),
    INDEX `idx_prod_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. PRODUCTION & QUALITY CONTROL
-- -----------------------------------------------------------------------------

CREATE TABLE `water_sources` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `source_type` VARCHAR(100) NOT NULL DEFAULT 'Deep Aquifer Borehole',
    `location` VARCHAR(200) NOT NULL,
    `daily_capacity_liters` INT UNSIGNED NOT NULL DEFAULT 50000,
    `status` ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_batches` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `batch_number` VARCHAR(50) NOT NULL UNIQUE,
    `water_source_id` BIGINT UNSIGNED NOT NULL,
    `production_date` DATE NOT NULL,
    `water_volume_liters` DECIMAL(12,2) NOT NULL,
    `status` ENUM('in_progress', 'testing', 'approved', 'rejected') DEFAULT 'testing',
    `approval_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `approved_by` BIGINT UNSIGNED NULL,
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pb_source` FOREIGN KEY (`water_source_id`) REFERENCES `water_sources` (`id`),
    CONSTRAINT `fk_pb_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_pb_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_batch_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `batch_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `filled_quantity` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pbi_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pbi_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quality_tests` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `test_name` VARCHAR(100) NOT NULL,
    `parameter` VARCHAR(100) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `min_acceptable` DECIMAL(10,3) NULL,
    `max_acceptable` DECIMAL(10,3) NULL,
    `description` VARCHAR(255) NULL,
    `is_required` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `production_batch_quality_tests` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `batch_id` BIGINT UNSIGNED NOT NULL,
    `quality_test_id` BIGINT UNSIGNED NOT NULL,
    `measured_value` VARCHAR(50) NOT NULL,
    `status` ENUM('pass', 'fail') NOT NULL DEFAULT 'pass',
    `tested_by` BIGINT UNSIGNED NOT NULL,
    `test_date` DATETIME NOT NULL,
    `laboratory_reference` VARCHAR(100) NULL,
    `remarks` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pbqt_batch` FOREIGN KEY (`batch_id`) REFERENCES `production_batches` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pbqt_test` FOREIGN KEY (`quality_test_id`) REFERENCES `quality_tests` (`id`),
    CONSTRAINT `fk_pbqt_tester` FOREIGN KEY (`tested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. INVENTORY & BALANCES
-- -----------------------------------------------------------------------------

CREATE TABLE `inventory_balances` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `quantity_on_hand` INT NOT NULL DEFAULT 0,
    `quantity_reserved` INT NOT NULL DEFAULT 0,
    `reorder_threshold` INT NOT NULL DEFAULT 50,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_inv_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_movements` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `movement_type` ENUM('production_add', 'order_reservation', 'order_consumption', 'order_cancellation', 'return_stock', 'damaged_removal', 'manual_adjustment') NOT NULL,
    `quantity` INT NOT NULL,
    `reference_id` BIGINT UNSIGNED NULL,
    `reference_type` VARCHAR(50) NULL,
    `notes` VARCHAR(255) NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_im_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
    CONSTRAINT `fk_im_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_im_type` (`movement_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `inventory_reservations` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity` INT UNSIGNED NOT NULL,
    `status` ENUM('active', 'consumed', 'released') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ir_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. REUSABLE BOTTLE TRACKING (QR CODES)
-- -----------------------------------------------------------------------------

CREATE TABLE `bottle_assets` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `serial_number` VARCHAR(50) NOT NULL UNIQUE,
    `qr_code` VARCHAR(100) NOT NULL UNIQUE,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `current_status` ENUM(
        'warehouse_empty', 'warehouse_filled', 'reserved',
        'delivered_to_customer', 'returned', 'inspection',
        'washing', 'refilling', 'quality_check',
        'damaged', 'lost', 'retired'
    ) DEFAULT 'warehouse_filled',
    `current_customer_id` BIGINT UNSIGNED NULL,
    `current_order_id` BIGINT UNSIGNED NULL,
    `cycle_count` INT UNSIGNED DEFAULT 0,
    `manufacture_date` DATE NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ba_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
    CONSTRAINT `fk_ba_cust` FOREIGN KEY (`current_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
    INDEX `idx_ba_qr` (`qr_code`),
    INDEX `idx_ba_status` (`current_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bottle_transactions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `bottle_id` BIGINT UNSIGNED NOT NULL,
    `transaction_type` ENUM(
        'intake', 'filled', 'reserved', 'delivered', 'returned',
        'inspected', 'washed', 'refilled', 'quality_approved',
        'damaged', 'lost', 'retired'
    ) NOT NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `order_id` BIGINT UNSIGNED NULL,
    `staff_id` BIGINT UNSIGNED NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bt_bottle` FOREIGN KEY (`bottle_id`) REFERENCES `bottle_assets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bt_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_bt_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_bt_type` (`transaction_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bottle_return_inspections` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `bottle_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `condition_status` ENUM('good', 'needs_deep_clean', 'damaged', 'cap_missing') DEFAULT 'good',
    `damage_cost` DECIMAL(12,2) DEFAULT 0.00,
    `action_taken` ENUM('refill', 'repair', 'charge_deposit', 'retire') DEFAULT 'refill',
    `inspected_by` BIGINT UNSIGNED NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_bri_bottle` FOREIGN KEY (`bottle_id`) REFERENCES `bottle_assets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bri_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_bri_inspector` FOREIGN KEY (`inspected_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. ORDERS & SUBSCRIPTIONS
-- -----------------------------------------------------------------------------

CREATE TABLE `orders` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_number` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `address_id` BIGINT UNSIGNED NOT NULL,
    `order_status` ENUM('pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'failed') DEFAULT 'pending',
    `payment_status` ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded') DEFAULT 'pending',
    `payment_method` ENUM('cash_on_delivery', 'online') NOT NULL DEFAULT 'cash_on_delivery',
    `subtotal_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `delivery_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `deposit_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `delivery_date` DATE NOT NULL,
    `time_slot` VARCHAR(50) NOT NULL DEFAULT '09:00 AM - 12:00 PM',
    `special_instructions` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_orders_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_orders_addr` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`),
    INDEX `idx_orders_status` (`order_status`),
    INDEX `idx_orders_del_date` (`delivery_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `product_sku` VARCHAR(50) NOT NULL DEFAULT '',
    `volume_ml` INT UNSIGNED NOT NULL DEFAULT 0,
    `unit_price` DECIMAL(12,2) NOT NULL,
    `deposit_per_unit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `quantity` INT UNSIGNED NOT NULL,
    `total_price` DECIMAL(12,2) NOT NULL,
    `total_deposit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_oi_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_oi_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `order_status_history` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'failed') NOT NULL,
    `notes` VARCHAR(255) NULL,
    `changed_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_osh_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_osh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscriptions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `subscription_code` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `address_id` BIGINT UNSIGNED NOT NULL,
    `frequency` ENUM('daily', 'weekly', 'biweekly', 'monthly', 'custom') NOT NULL DEFAULT 'weekly',
    `preferred_time_slot` VARCHAR(50) NOT NULL DEFAULT '09:00 AM - 12:00 PM',
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    `special_notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_sub_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_sub_addr` FOREIGN KEY (`address_id`) REFERENCES `addresses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `subscription_id` BIGINT UNSIGNED NOT NULL,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12,2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_si_sub` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_si_prod` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `subscription_occurrences` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `subscription_id` BIGINT UNSIGNED NOT NULL,
    `scheduled_date` DATE NOT NULL,
    `order_id` BIGINT UNSIGNED NULL,
    `status` ENUM('scheduled', 'generated', 'skipped', 'cancelled') DEFAULT 'scheduled',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_so_sub` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_so_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
    UNIQUE KEY `uk_sub_date` (`subscription_id`, `scheduled_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. DELIVERIES
-- -----------------------------------------------------------------------------

CREATE TABLE `deliveries` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `delivery_number` VARCHAR(50) NOT NULL UNIQUE,
    `order_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `staff_user_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('assigned', 'out_for_delivery', 'delivered', 'failed', 'returned') DEFAULT 'assigned',
    `assigned_at` DATETIME NOT NULL,
    `started_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `failure_reason` VARCHAR(255) NULL,
    `customer_signature_notes` VARCHAR(255) NULL,
    `delivered_bottles_count` INT UNSIGNED DEFAULT 0,
    `returned_bottles_count` INT UNSIGNED DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_del_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_del_staff` FOREIGN KEY (`staff_user_id`) REFERENCES `users` (`id`),
    INDEX `idx_del_staff` (`staff_user_id`),
    INDEX `idx_del_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `delivery_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `delivery_id` BIGINT UNSIGNED NOT NULL,
    `order_item_id` BIGINT UNSIGNED NOT NULL,
    `delivered_quantity` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_di_del` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_di_oi` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `delivery_status_history` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `delivery_id` BIGINT UNSIGNED NOT NULL,
    `status` ENUM('assigned', 'out_for_delivery', 'delivered', 'failed', 'returned') NOT NULL,
    `notes` VARCHAR(255) NULL,
    `changed_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_dsh_del` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dsh_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. EVENT BOOKINGS (BULK ORDERS)
-- -----------------------------------------------------------------------------

CREATE TABLE `event_bookings` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `booking_code` VARCHAR(50) NOT NULL UNIQUE,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `event_name` VARCHAR(150) NOT NULL,
    `event_type` ENUM('wedding', 'birthday', 'seminar', 'corporate', 'meeting', 'other') NOT NULL DEFAULT 'corporate',
    `event_date` DATE NOT NULL,
    `location_address` TEXT NOT NULL,
    `expected_guests` INT UNSIGNED NOT NULL DEFAULT 50,
    `requested_water_quantity` VARCHAR(150) NOT NULL,
    `status` ENUM('pending', 'reviewed', 'quoted', 'accepted', 'order_created', 'cancelled') DEFAULT 'pending',
    `quoted_amount` DECIMAL(12,2) NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_eb_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. PAYMENTS, REFUNDS & DEPOSITS
-- -----------------------------------------------------------------------------

CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payment_number` VARCHAR(50) NOT NULL UNIQUE,
    `order_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_method` ENUM('cash_on_delivery', 'online') NOT NULL DEFAULT 'cash_on_delivery',
    `status` ENUM('initiated', 'pending', 'successful', 'failed', 'cancelled', 'refunded', 'partially_refunded') DEFAULT 'pending',
    `transaction_reference` VARCHAR(100) NULL,
    `confirmed_by` BIGINT UNSIGNED NULL,
    `confirmed_at` DATETIME NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_pay_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_pay_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_pay_confirmer` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_pay_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_webhook_events` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'demo_gateway',
    `event_id` VARCHAR(100) NOT NULL UNIQUE,
    `payload` LONGTEXT NOT NULL,
    `status` VARCHAR(50) DEFAULT 'processed',
    `processed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refunds` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payment_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `status` ENUM('pending', 'processed', 'rejected') DEFAULT 'pending',
    `processed_by` BIGINT UNSIGNED NULL,
    `processed_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ref_pay` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ref_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
    CONSTRAINT `fk_ref_user` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_deposits` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `customer_id` BIGINT UNSIGNED NOT NULL UNIQUE,
    `current_balance` DECIMAL(12,2) DEFAULT 0.00,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cd_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `deposit_transactions` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `customer_id` BIGINT UNSIGNED NOT NULL,
    `order_id` BIGINT UNSIGNED NULL,
    `transaction_type` ENUM('collected', 'refunded', 'deducted_damage') NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `balance_after` DECIMAL(12,2) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_dt_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_dt_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_dt_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. SYSTEM NOTIFICATIONS & AUDIT LOGS
-- -----------------------------------------------------------------------------

CREATE TABLE `notifications` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `type` ENUM('order', 'delivery', 'subscription', 'address', 'payment', 'deposit', 'system') DEFAULT 'system',
    `is_read` TINYINT(1) DEFAULT 0,
    `link` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_notif_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` BIGINT UNSIGNED NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
    INDEX `idx_audit_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- Roles
INSERT INTO `roles` (`id`, `name`, `display_name`, `description`) VALUES
(1, 'superadmin', 'Super Administrator', 'Full system access and master control'),
(2, 'admin', 'Administrator', 'Operations, orders, customers and products management'),
(3, 'operations', 'Operations Manager', 'Plant production, water testing, inventory and bottle tracking'),
(4, 'finance', 'Finance Officer', 'Payment verification, COD collections, deposits and refunds'),
(5, 'delivery', 'Delivery Staff', 'View and execute assigned deliveries and bottle returns'),
(6, 'customer', 'Customer', 'Browse products, order water, subscriptions and view history');

-- Seed Users with bcrypt hash of 'password123'
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password_hash`, `status`, `is_phone_verified`) VALUES
(1, 'Super Admin', 'admin@w4eh.com', '03000000001', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1),
(2, 'Operations Lead', 'ops@w4eh.com', '03000000002', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1),
(3, 'Finance Officer', 'finance@w4eh.com', '03000000003', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1),
(4, 'Tariq Khan (Rider)', 'delivery@w4eh.com', '03000000004', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1),
(5, 'Sarah Ahmed', 'customer@w4eh.com', '03001234567', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1),
(6, 'Kamran Ali (Rider)', 'delivery2@w4eh.com', '03000000005', '$2y$10$WvsDsyaSEtNSdJauKqk1eOD5AHWXG1MhhcyO9ZqpoqGELTF7MOtVq', 'active', 1);

-- Assign User Roles
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1),
(1, 2),
(2, 3),
(3, 4),
(4, 5),
(5, 6),
(6, 5);

-- Customer Profile
INSERT INTO `customers` (`id`, `user_id`, `customer_code`, `bottle_deposit_balance`) VALUES
(1, 5, 'CUST-0001', 1200.00);

-- Customer Deposits Table
INSERT INTO `customer_deposits` (`customer_id`, `current_balance`) VALUES
(1, 1200.00);

-- Staff Profiles
INSERT INTO `staff_profiles` (`user_id`, `employee_id`, `department`, `vehicle_number`) VALUES
(1, 'EMP-001', 'Management', NULL),
(2, 'EMP-002', 'Operations & QC', NULL),
(3, 'EMP-003', 'Accounts & Finance', NULL),
(4, 'EMP-004', 'Logistics & Delivery', 'LHR-8821 (Suzuki Carry)'),
(6, 'EMP-005', 'Logistics & Delivery', 'LHR-4512 (Motorcycle Van)');

-- Service Areas
INSERT INTO `service_areas` (`id`, `name`, `city`, `postal_code`, `delivery_fee`, `is_active`) VALUES
(1, 'Gulberg (I, II, III)', 'Lahore', '54660', 50.00, 1),
(2, 'DHA (Phases 1-6)', 'Lahore', '54792', 70.00, 1),
(3, 'Model Town (Blocks A-M)', 'Lahore', '54700', 50.00, 1),
(4, 'Bahria Town (Sectors A-F)', 'Lahore', '53720', 80.00, 1),
(5, 'Cantt & Cavalry Ground', 'Lahore', '54810', 60.00, 1),
(6, 'Johar Town (Phases 1-2)', 'Lahore', '54770', 60.00, 1);

-- Customer Addresses (One Approved, One Pending for verification demo)
INSERT INTO `addresses` (`id`, `customer_id`, `recipient_name`, `phone`, `service_area_id`, `area_name`, `street_address`, `city`, `landmark`, `is_default`, `approval_status`, `approved_by`, `approved_at`) VALUES
(1, 1, 'Sarah Ahmed', '03001234567', 1, 'Gulberg III', 'House 42, Street 8, Block K', 'Lahore', 'Near Mini Market', 1, 'approved', 1, NOW()),
(2, 1, 'Sarah Ahmed (Office)', '03001234567', 2, 'DHA Phase 5', 'Plaza 18, Commercial Broadway, 2nd Floor', 'Lahore', 'Opposite Jalal Sons', 0, 'pending', NULL, NULL);

-- Product Categories
INSERT INTO `product_categories` (`id`, `name`, `slug`, `description`) VALUES
(1, 'Drinking Water', 'drinking-water', 'Pure, mineral-balanced purified drinking water in multiple sizes'),
(2, 'Accessories & Dispensers', 'accessories', 'Durable manual pumps, electronic dispensers, and water stands');

-- Products
INSERT INTO `products` (`id`, `category_id`, `name`, `slug`, `description`, `volume_ml`, `volume_label`, `packaging_type`, `unit_price`, `refundable_deposit`, `image_url`, `is_reusable`, `is_active`) VALUES
(1, 1, 'Small Water Bottle', 'small-water-bottle-500ml', 'Convenient 500ml single-serve bottle for on-the-go hydration. 24-bottle pack available.', 500, '500 ml', 'PET Bottle', 50.00, 0.00, '/images/products/bottle_500ml.png', 0, 1),
(2, 1, 'Medium Water Bottle', 'medium-water-bottle-1500ml', 'Standard 1.5L family table bottle, mineral balanced and UV-purified.', 1500, '1.5 L', 'PET Bottle', 100.00, 0.00, '/images/products/bottle_1500ml.png', 0, 1),
(3, 1, 'Large Water Bottle', 'large-water-bottle-5l', '5-litre convenient jug with ergonomic handle, ideal for cooking and office pantries.', 5000, '5 L', 'Recyclable Jug', 250.00, 0.00, '/images/products/bottle_5l.png', 0, 1),
(4, 1, 'Reusable Water Bottle (19L)', 'reusable-water-bottle-19l', 'Standard 19-litre (5 Gallon) heavy-duty polycarbonate reusable bottle. Requires initial refundable deposit.', 19000, '19 L', 'Polycarbonate Jar', 400.00, 600.00, '/images/products/bottle_19l.png', 1, 1),
(5, 2, 'Manual Hand Water Pump', 'manual-hand-water-pump', 'Food-grade manual push pump fits standard 19L reusable bottles without lifting.', 0, 'Standard Fit', 'Manual Pump', 550.00, 0.00, '/images/products/manual_pump.png', 0, 1),
(6, 2, 'Countertop Water Dispenser', 'countertop-water-dispenser', 'Compact tabletop hot & cold water dispenser with energy-efficient compressor.', 0, 'Hot & Cold', 'Electric Appliance', 4500.00, 0.00, '/images/products/dispenser.png', 0, 1);

-- Inventory Balances
INSERT INTO `inventory_balances` (`product_id`, `quantity_on_hand`, `quantity_reserved`, `reorder_threshold`) VALUES
(1, 450, 20, 100),
(2, 320, 15, 80),
(3, 180, 10, 50),
(4, 120, 10, 30),
(5, 45, 2, 10),
(6, 12, 0, 5);

-- Inventory Movements Initial
INSERT INTO `inventory_movements` (`product_id`, `movement_type`, `quantity`, `reference_id`, `reference_type`, `notes`, `created_by`) VALUES
(1, 'production_add', 470, 1, 'initial_stock', 'Initial production stock intake', 1),
(2, 'production_add', 335, 1, 'initial_stock', 'Initial production stock intake', 1),
(3, 'production_add', 190, 1, 'initial_stock', 'Initial production stock intake', 1),
(4, 'production_add', 130, 1, 'initial_stock', 'Initial 19L filled reusable bottle intake', 1),
(5, 'manual_adjustment', 47, 1, 'initial_stock', 'Supplier warehouse delivery', 1),
(6, 'manual_adjustment', 12, 1, 'initial_stock', 'Supplier warehouse delivery', 1);

-- Water Sources
INSERT INTO `water_sources` (`id`, `name`, `source_type`, `location`, `daily_capacity_liters`, `status`) VALUES
(1, 'Deep Aquifer Well #1 (Gulberg Plant)', 'Deep Submersible Aquifer', 'Gulberg Industrial Area, Plant Bay 1', 60000, 'active'),
(2, 'Purification Unit Alpha (RO Station)', 'Reverse Osmosis Multi-Stage Plant', 'Gulberg Industrial Area, Bay 2', 40000, 'active');

-- Standard Quality Tests definition
INSERT INTO `quality_tests` (`id`, `test_name`, `parameter`, `unit`, `min_acceptable`, `max_acceptable`, `description`, `is_required`) VALUES
(1, 'Acidity & Alkalinity (pH)', 'pH Value', 'pH', 6.500, 8.500, 'WHO standard drinking water pH range 6.5 - 8.5', 1),
(2, 'Total Dissolved Solids (TDS)', 'TDS Count', 'ppm', 100.000, 250.000, 'Optimal balanced minerals for taste and hydration', 1),
(3, 'Turbidity', 'Clarity', 'NTU', 0.000, 1.000, 'Clear visual water clarity testing', 1),
(4, 'Free Chlorine Residual', 'Chlorine', 'mg/L', 0.000, 0.200, 'Safe chlorination control before bottling', 1),
(5, 'Microbial & Coliforms', 'E. Coli / Coliforms', 'CFU/100ml', 0.000, 0.000, 'Zero microbiological contamination permitted', 1);

-- Sample Production Batch
INSERT INTO `production_batches` (`id`, `batch_number`, `water_source_id`, `production_date`, `water_volume_liters`, `status`, `approval_status`, `approved_by`, `approved_at`, `notes`, `created_by`) VALUES
(1, 'BATCH-20261101-01', 2, '2026-11-01', 8000.00, 'approved', 'approved', 2, NOW(), 'Morning purification run, passed all microbiological and mineral checks', 2);

INSERT INTO `production_batch_items` (`batch_id`, `product_id`, `filled_quantity`) VALUES
(1, 4, 200),
(1, 2, 800),
(1, 1, 1500);

INSERT INTO `production_batch_quality_tests` (`batch_id`, `quality_test_id`, `measured_value`, `status`, `tested_by`, `test_date`, `laboratory_reference`, `remarks`) VALUES
(1, 1, '7.3', 'pass', 2, NOW(), 'LAB-QC-9921', 'Normal alkaline balance'),
(1, 2, '145', 'pass', 2, NOW(), 'LAB-QC-9921', 'Ideal mineral concentration'),
(1, 3, '0.12', 'pass', 2, NOW(), 'LAB-QC-9921', 'Crystal clear clarity'),
(1, 4, '0.02', 'pass', 2, NOW(), 'LAB-QC-9921', 'Safe trace residual'),
(1, 5, '0', 'pass', 2, NOW(), 'LAB-QC-9921', 'Negative, zero bacteria');

-- QR-Coded Reusable Bottles (19L)
INSERT INTO `bottle_assets` (`id`, `serial_number`, `qr_code`, `product_id`, `current_status`, `current_customer_id`, `cycle_count`, `manufacture_date`, `notes`) VALUES
(1, 'W4EH-BOT-1001', 'QR-W4EH-1001', 4, 'delivered_to_customer', 1, 3, '2025-06-15', 'Assigned to customer Sarah Ahmed'),
(2, 'W4EH-BOT-1002', 'QR-W4EH-1002', 4, 'delivered_to_customer', 1, 4, '2025-06-15', 'Assigned to customer Sarah Ahmed'),
(3, 'W4EH-BOT-1003', 'QR-W4EH-1003', 4, 'warehouse_filled', NULL, 1, '2026-01-10', 'Filled and ready in Gulberg warehouse'),
(4, 'W4EH-BOT-1004', 'QR-W4EH-1004', 4, 'warehouse_filled', NULL, 2, '2026-01-10', 'Filled and ready in Gulberg warehouse'),
(5, 'W4EH-BOT-1005', 'QR-W4EH-1005', 4, 'warehouse_empty', NULL, 5, '2025-03-20', 'Empty returned, queued for washing'),
(6, 'W4EH-BOT-1006', 'QR-W4EH-1006', 4, 'washing', NULL, 6, '2025-03-20', 'In automated 4-stage washing bay'),
(7, 'W4EH-BOT-1007', 'QR-W4EH-1007', 4, 'inspection', NULL, 7, '2025-02-12', 'Returned bottle undergoing visual leak & crack inspection'),
(8, 'W4EH-BOT-1008', 'QR-W4EH-1008', 4, 'warehouse_filled', NULL, 1, '2026-02-01', 'Fresh bottle filled and sealed');

-- Bottle Transactions History
INSERT INTO `bottle_transactions` (`bottle_id`, `transaction_type`, `customer_id`, `staff_id`, `notes`) VALUES
(1, 'filled', NULL, 2, 'Batch BATCH-20261101-01 filled'),
(1, 'delivered', 1, 4, 'Delivered to Sarah Ahmed on order ORD-2026-1001'),
(2, 'filled', NULL, 2, 'Batch BATCH-20261101-01 filled'),
(2, 'delivered', 1, 4, 'Delivered to Sarah Ahmed on order ORD-2026-1001'),
(5, 'returned', 1, 4, 'Returned by customer Sarah Ahmed upon replenishment');

-- Deposit transactions for Customer 1
INSERT INTO `deposit_transactions` (`customer_id`, `order_id`, `transaction_type`, `amount`, `balance_after`, `notes`, `created_by`) VALUES
(1, NULL, 'collected', 1200.00, 1200.00, 'Initial 2x 19L bottle deposit received (Rs. 600 each)', 1);

-- Sample Order #1 (Delivered order)
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `address_id`, `order_status`, `payment_status`, `payment_method`, `subtotal_amount`, `delivery_fee`, `deposit_amount`, `discount_amount`, `total_amount`, `delivery_date`, `time_slot`, `special_instructions`) VALUES
(1, 'ORD-2026-1001', 1, 1, 'delivered', 'paid', 'cash_on_delivery', 800.00, 50.00, 1200.00, 0.00, 2050.00, '2026-10-30', '09:00 AM - 12:00 PM', 'Please ring the doorbell twice');

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `product_sku`, `volume_ml`, `unit_price`, `deposit_per_unit`, `quantity`, `total_price`, `total_deposit`) VALUES
(1, 4, 'Reusable Water Bottle (19L)', 'reusable-water-bottle-19l', 19000, 400.00, 600.00, 2, 800.00, 1200.00);

INSERT INTO `order_status_history` (`order_id`, `status`, `notes`, `changed_by`) VALUES
(1, 'pending', 'Order placed by customer Sarah Ahmed', 5),
(1, 'confirmed', 'Order approved by Admin', 1),
(1, 'out_for_delivery', 'Order dispatched with rider Tariq Khan', 1),
(1, 'delivered', 'Delivered successfully and COD collected', 4);

-- Sample Delivery for Order #1
INSERT INTO `deliveries` (`id`, `delivery_number`, `order_id`, `staff_user_id`, `status`, `assigned_at`, `completed_at`, `delivered_bottles_count`, `returned_bottles_count`) VALUES
(1, 'DEL-2026-1001', 1, 4, 'delivered', '2026-10-30 08:30:00', '2026-10-30 11:15:00', 2, 0);

INSERT INTO `delivery_items` (`delivery_id`, `order_item_id`, `delivered_quantity`) VALUES
(1, 1, 2);

INSERT INTO `payments` (`id`, `payment_number`, `order_id`, `customer_id`, `amount`, `payment_method`, `status`, `confirmed_by`, `confirmed_at`, `notes`) VALUES
(1, 'PAY-2026-1001', 1, 1, 2050.00, 'cash_on_delivery', 'successful', 3, '2026-10-30 14:00:00', 'Cash on delivery verified by Finance Officer');

-- Sample Order #2 (Active order ready for assignment/delivery demo)
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `address_id`, `order_status`, `payment_status`, `payment_method`, `subtotal_amount`, `delivery_fee`, `deposit_amount`, `discount_amount`, `total_amount`, `delivery_date`, `time_slot`, `special_instructions`) VALUES
(2, 'ORD-2026-1002', 1, 1, 'confirmed', 'pending', 'cash_on_delivery', 500.00, 50.00, 0.00, 0.00, 550.00, '2026-11-02', '02:00 PM - 05:00 PM', 'Call before arrival');

INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `product_sku`, `volume_ml`, `unit_price`, `deposit_per_unit`, `quantity`, `total_price`, `total_deposit`) VALUES
(2, 2, 'Medium Water Bottle', 'medium-water-bottle-1500ml', 1500, 100.00, 0.00, 5, 500.00, 0.00);

INSERT INTO `order_status_history` (`order_id`, `status`, `notes`, `changed_by`) VALUES
(2, 'pending', 'Order placed by customer', 5),
(2, 'confirmed', 'Stock reserved and confirmed by Admin', 1);

INSERT INTO `inventory_reservations` (`order_id`, `product_id`, `quantity`, `status`) VALUES
(2, 2, 5, 'active');

-- Deliveries for Order #2 (Assigned to Tariq Khan for immediate demo)
INSERT INTO `deliveries` (`id`, `delivery_number`, `order_id`, `staff_user_id`, `status`, `assigned_at`) VALUES
(2, 'DEL-2026-1002', 2, 4, 'assigned', NOW());

INSERT INTO `delivery_items` (`delivery_id`, `order_item_id`, `delivered_quantity`) VALUES
(2, 2, 0);

-- Active Subscription for Sarah Ahmed
INSERT INTO `subscriptions` (`id`, `subscription_code`, `customer_id`, `address_id`, `frequency`, `preferred_time_slot`, `start_date`, `status`, `special_notes`) VALUES
(1, 'SUB-2026-001', 1, 1, 'weekly', '09:00 AM - 12:00 PM', '2026-11-01', 'active', 'Weekly 2x 19L bottle refill delivery');

INSERT INTO `subscription_items` (`subscription_id`, `product_id`, `quantity`, `unit_price`) VALUES
(1, 4, 2, 400.00);

-- Sample Event Booking
INSERT INTO `event_bookings` (`id`, `booking_code`, `customer_id`, `event_name`, `event_type`, `event_date`, `location_address`, `expected_guests`, `requested_water_quantity`, `status`, `quoted_amount`, `notes`) VALUES
(1, 'EVT-2026-001', 1, 'Tech Leaders Summit 2026', 'corporate', '2026-11-20', 'Royal Palm Golf & Country Club, Hall A, Lahore', 250, '30x 19L Reusable Bottles + 2 Dispensers + 200x 500ml Small Bottles', 'reviewed', 28500.00, 'Requires setup 2 hours prior to start');

-- System Notifications
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `is_read`, `link`) VALUES
(1, 'New Order Received', 'Order #ORD-2026-1002 has been placed by Sarah Ahmed for Rs. 550.00.', 'order', 0, '/admin/orders/2'),
(4, 'New Delivery Assigned', 'You have been assigned delivery #DEL-2026-1002 for Gulberg III.', 'delivery', 0, '/delivery'),
(5, 'Address Approved', 'Your delivery address House 42, Block K, Gulberg III has been approved.', 'address', 1, '/addresses');
