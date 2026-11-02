# Water 4 Every Home (W4EH)
## Drinking Water Supply & Delivery Management System

A production-grade, centralized web-based water supply and delivery operations platform developed in strict accordance with the **Software Requirements Specification (SRS)**. The platform powers end-to-end commercial water treatment, bottle asset lifecycle tracking, automated inventory controls, customer subscriptions, delivery fleet routing, and financial deposit ledgers.

---

## 1. Architectural Highlights

- **Frontend:** React 19 (Vite), Bootstrap 5, Bootstrap Icons, Lucide React, QRCode.react.
- **Backend:** Core PHP 8+ (Custom REST API router, PDO singleton, role-based authorization middleware, input validators, audit logger).  
  *Zero heavy frameworks (No Laravel, Symfony, or Node.js backend) — pure, transparent PHP 8+ business logic with database transactions.*
- **Database:** MySQL 8 / MariaDB (XAMPP) with 38 relational tables, strict foreign keys, indexing, and utf8mb4 collation.
- **Visual Design:** Clean, operational **Blue Neutral Palette**:
  - Primary Brand Navy: `#1F3B62`
  - Secondary Slate: `#6B7F99`
  - Subtle Muted: `#A7B1BD`
  - Border Neutral: `#D9D6CE`
  - Clean Background: `#F7F9FC`
  - Typography: Google Font `Inter, sans-serif`

---

## 2. Default Seed Accounts & Credentials

Every account uses the default password: **`password123`**  
*(Quick one-click demo login buttons are also built directly into the `/login` screen)*

| Role | Name | Email | Phone | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Super Admin | `admin@w4eh.com` | `03000000001` | Full system access, staff provisioning, audit logs, reports |
| **Operations Manager** | Operations Manager | `ops@w4eh.com` | `03000000002` | Production batches, QC, inventory adjustments, dispatch |
| **Finance Officer** | Finance Officer | `finance@w4eh.com` | `03000000003` | Payments, COD verification, deposit ledger, refund payouts |
| **Delivery Rider** | Tariq Khan | `delivery@w4eh.com` | `03000000004` | Rider deliveries, route status, empty bottle intake |
| **Customer** | Sarah Ahmed | `customer@w4eh.com` | `03001234567` | Storefront, cart, checkout, tracking, subscriptions, addresses |

---

## 3. Prerequisites & Installation

### Requirements
- **XAMPP** (or standalone PHP 8.1+ & MySQL 8.0+)
- **Node.js 18+** and **npm**

### Step 1: Database Setup (XAMPP MySQL)
1. Start the MySQL service from the XAMPP Control Panel (or via command line `C:\xampp\mysql\bin\mysqld.exe`).
2. Open phpMyAdmin (`http://localhost/phpmyadmin`) or MySQL CLI:
   ```sql
   CREATE DATABASE IF NOT EXISTS water_supply_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the complete database schema and seed data located at:
   ```
   d:\Water4EveryHome\database\water_supply.sql
   ```
   *Via MySQL CLI:*
   ```bash
   C:\xampp\mysql\bin\mysql.exe -u root water_supply_db < d:\Water4EveryHome\database\water_supply.sql
   ```

### Step 2: Backend Configuration & Execution (XAMPP / Apache)
1. The backend configuration is located at `backend/config/config.php` and `backend/config/database.php`.
   - Host: `127.0.0.1`
   - Port: `3306`
   - Database: `water_supply_db`
   - User: `root`
   - Password: `""` (default XAMPP empty password)
2. **Run through XAMPP / Apache (Primary Recommended):**
   - Start **Apache** and **MySQL** from XAMPP Control Panel.
   - The API is immediately accessible at:
     ```
     http://localhost/Water4EveryHome/backend/public/
     ```
   - Verify backend connectivity:
     ```
     http://localhost/Water4EveryHome/backend/public/api/health
     ```
     Response:
     ```json
     {
       "success": true,
       "message": "Operation successful",
       "data": { "status": "ok", "service": "Water 4 Every Home API", "database": "connected" }
     }
     ```
3. **Alternative (PHP built-in server):**
   ```powershell
   C:\xampp\php\php.exe -S 127.0.0.1:8000 -t d:\Water4EveryHome\backend\public
   ```

### Step 3: Frontend Setup & Execution (React + Vite)
1. Navigate to the `frontend` folder:
   ```powershell
   cd d:\Water4EveryHome\frontend
   ```
2. Start the Vite development server:
   ```powershell
   npm run dev
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```
   *(All `/api` requests are automatically proxied by Vite to the Apache backend at `http://localhost/Water4EveryHome/backend/public`)*

---

## 4. End-to-End Operational Workflows Implemented

### 1. Customer Ordering & Address Verification (FR-01 to FR-05)
- **Address Approval Policy:** Per operational policy, orders can only be placed to an approved delivery address. Customers add addresses with landmark & service area; admins review and approve/reject with feedback.
- **Stock Reservations:** Placing an order executes a database transaction that verifies stock, calculates subtotal, refundable bottle deposits, and delivery fee, and places an atomic hold in `inventory_reservations`.

### 2. Fleet Dispatch & Rider Lifecycle (FR-12)
- Administrators assign confirmed orders to active delivery fleet members.
- Riders log into the mobile-responsive **Rider Dispatch Portal** (`/delivery`).
- Riders can only view their own assigned deliveries.
- Status progression: `assigned` &rarr; `out_for_delivery` &rarr; `delivered` or `failed`.
- When marked `delivered`:
  - Physical inventory on-hand and reserved counts are decremented atomically.
  - Returned empty bottles are recorded, logging stock movements back into inventory.
  - Audit trail and delivery status history are permanently recorded.

### 3. Bottle Asset QR Code Lifecycle (FR-07, FR-08)
- Every 19L reusable polycarbonate bottle has a unique QR code and serial number (e.g. `BTL-19L-000101`).
- The QR scan portal (`/admin/bottles`) displays real-time bottle status: `warehouse`, `in_transit`, `with_customer`, `returned`, `inspection`, `condemned`.
- Wash and refill counters track bottle lifespan.
- Inspection screen allows marking bottles as cleared or condemned if damaged.

### 4. Water Treatment & Quality Control (FR-09, FR-10)
- Water sources tracked: Tube Well A, Municipal Line B, Reverse Osmosis Inflow.
- Production batches track volume treated, start time, filtration method, and operator.
- QC testing records: pH (6.5-8.5), TDS (50-150 ppm), Turbidity (<1.0 NTU), Residual Chlorine, and Microbiological pass/fail.
- Authorized QC managers approve batches, automatically releasing finished bottles into warehouse stock balances.

### 5. Financial Settlement & Bottle Deposit Ledger (FR-08, FR-14)
- **Refundable Deposits:** 19L bottles require a security deposit (Rs. 600 each).
- When an order is delivered and cash collected, COD payment is confirmed by Finance, incrementing the customer's refundable deposit balance.
- Customers can return empty bottles at any time to request a deposit refund payout, processed by Finance (`/admin/deposits`).

### 6. Subscriptions & Event Bookings (FR-06, FR-13)
- Recurring deliveries: Weekly, Twice-Weekly, Monthly with preferred delivery slots.
- Administrators can trigger automated on-demand order generation for scheduled subscription deliveries.
- Bulk Event Inquiries: Request large volume supplies for weddings, conferences, or exhibitions. Admins quote custom rates, customers accept quotes, and bookings convert directly to official orders.

### 7. Administrative Audit Trail & Reporting (FR-15, FR-16)
- Immutable audit log records every critical administrative action: order confirmations, stock adjustments, batch approvals, QC results, and refunds.
- Export operational data directly to CSV (`/api/reports/export?type=orders` and `/api/reports/export?type=inventory`).

---

## 5. Working vs. Simulated Implementations

| Feature | Status | Implementation Details |
| :--- | :--- | :--- |
| **Authentication & RBAC** | **Real** | Core PHP bearer token validation, password hashing (`PASSWORD_BCRYPT`), role checking. |
| **Database Operations** | **Real** | MySQL transactions (`beginTransaction`, `commit`, `rollBack`), row locking (`FOR UPDATE`), foreign keys. |
| **Inventory Management** | **Real** | Multi-tier stock balances (`quantity_on_hand`, `quantity_reserved`, `available_quantity`), movement logs. |
| **Bottle QR Tracking** | **Real** | Live QR generation, scanner lookup, return inspection, and lifecycle history. |
| **SMS OTP Verification** | **Simulated** | Generates real 6-digit OTP stored in database with 10-minute expiry; code returned in API response for instant copy-paste testing without telecom SMS gateway fees. |
| **Online Payment Gateway** | **Simulated** | Provides instant test-mode payment gateway simulation generating unique transaction references alongside real Cash on Delivery (COD) collection. |

---

## 6. Directory Structure

```
d:\Water4EveryHome\
├── database\
│   └── water_supply.sql            # Full 38-table MySQL schema with seed data
├── backend\
│   ├── app\
│   │   ├── Controllers\            # 14 REST API Controllers (Auth, Order, Delivery, etc.)
│   │   ├── Helpers\                # Response, Validator, Auth, Audit helpers
│   │   └── Middleware\             # CorsMiddleware, AuthMiddleware
│   ├── config\
│   │   ├── config.php              # App constants and environment settings
│   │   └── database.php            # PDO Database Singleton
│   ├── public\
│   │   └── index.php               # Front-controller & entrypoint
│   └── routes\
│       └── api.php                 # REST API Router
└── frontend\
    ├── index.html
    ├── package.json
    ├── vite.config.js              # Dev server with /api proxy to PHP
    └── src\
        ├── components\             # Navbar, Footer, StatusBadge
        ├── context\                # AuthContext, CartContext
        ├── layouts\                # CustomerLayout, AdminLayout
        ├── pages\
        │   ├── auth\               # Login, Register, VerifyOtp
        │   ├── customer\           # 11 Storefront pages (Products, Cart, Checkout, etc.)
        │   ├── delivery\           # DeliveryDashboard (Rider dispatch)
        │   └── admin\              # 13 Operations pages (Inventory, QC, Bottles, etc.)
        └── services\
            └── api.js              # Centralized Axios/Fetch API client
```

---

## 7. Operational Verification Summary

The end-to-end operational pipeline has been verified with live automated runs:
1. Customer Sarah Ahmed authenticated and placed Order `#ORD-20261101-8938` for 2x 19L Reusable Bottles (Total Rs. 2,050 with bottle deposits).
2. Stock was reserved in `inventory_balances` (Product 4 reserved increased from 10 to 12).
3. Admin confirmed the order and dispatched it to Rider Tariq Khan.
4. Rider Tariq Khan marked the order `out_for_delivery`, then completed the delivery and recorded 1 empty returned bottle.
5. Physical inventory was consumed (on-hand 120 &rarr; 118, reserved 12 &rarr; 10), and 1 returned bottle was logged into stock.
6. Finance verified the COD collection, crediting the customer's deposit balance to Rs. 2,400.
7. Audit log recorded all transitions with operator timestamps and IP addresses.
