// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import AdminLayout from './layouts/AdminLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';

// Customer Pages
import Home from './pages/customer/Home';
import Products from './pages/customer/Products';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';
import Orders from './pages/customer/Orders';
import OrderDetail from './pages/customer/OrderDetail';
import Addresses from './pages/customer/Addresses';
import Subscriptions from './pages/customer/Subscriptions';
import EventBooking from './pages/customer/EventBooking';
import BottleReturns from './pages/customer/BottleReturns';
import DepositHistory from './pages/customer/DepositHistory';

// Delivery Fleet Page
import DeliveryDashboard from './pages/delivery/DeliveryDashboard';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminOrders from './pages/admin/Orders';
import AdminProducts from './pages/admin/Products';
import AdminAddresses from './pages/admin/Addresses';
import AdminInventory from './pages/admin/Inventory';
import AdminDeliveries from './pages/admin/Deliveries';
import AdminBottles from './pages/admin/Bottles';
import AdminProduction from './pages/admin/Production';
import AdminQualityControl from './pages/admin/QualityControl';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminEventBookings from './pages/admin/EventBookings';
import AdminPayments from './pages/admin/Payments';
import AdminDeposits from './pages/admin/Deposits';
import AdminStaff from './pages/admin/Staff';
import AdminAuditLogs from './pages/admin/AuditLogs';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Role-Based Route Guard
function RoleRoute({ roles, children }) {
  const { user, isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Validating role...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasRole(...roles)) {
    return (
      <div className="container py-5 text-center">
        <div className="card-custom p-5 mx-auto" style={{ maxWidth: '500px' }}>
          <h4 className="fw-bold text-danger mb-2">Access Restricted</h4>
          <p className="text-muted text-sm mb-4">
            Your user account does not have sufficient operational privileges to view this section.
          </p>
          <a href="/" className="btn btn-primary btn-sm">Return to Safe Area</a>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Public & Authenticated Storefront */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="cart" element={<Cart />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="events" element={<EventBooking />} />
          <Route path="bottle-returns" element={<BottleReturns />} />

          {/* Customer Authenticated Protected Routes */}
          <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
          <Route path="deposits" element={<ProtectedRoute><DepositHistory /></ProtectedRoute>} />
          <Route path="verify-otp" element={<ProtectedRoute><VerifyOtp /></ProtectedRoute>} />
        </Route>

        {/* Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Delivery Rider Dispatch Portal */}
        <Route
          path="/delivery"
          element={
            <RoleRoute roles={['delivery', 'superadmin', 'admin', 'operations']}>
              <DeliveryDashboard />
            </RoleRoute>
          }
        />

        {/* Admin Operational Management Portal */}
        <Route
          path="/admin"
          element={
            <RoleRoute roles={['superadmin', 'admin', 'operations', 'finance', 'quality_control']}>
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="addresses" element={<AdminAddresses />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="deliveries" element={<AdminDeliveries />} />
          <Route path="bottles" element={<AdminBottles />} />
          <Route path="production" element={<AdminProduction />} />
          <Route path="quality" element={<AdminQualityControl />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="events" element={<AdminEventBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="deposits" element={<AdminDeposits />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
        </Route>

        {/* Catch-all 404 Route */}
        <Route
          path="*"
          element={
            <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light p-4 text-center">
              <h1 className="fw-bold text-primary display-4 mb-2">404</h1>
              <h4 className="fw-bold text-dark mb-2">Page Not Found</h4>
              <p className="text-muted mb-4">The water supply resource you requested could not be located.</p>
              <a href="/" className="btn btn-primary">Return Home</a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
