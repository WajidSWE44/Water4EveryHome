// frontend/src/layouts/AdminLayout.jsx
import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, ShoppingCart, MapPin, Repeat, Calendar, 
  Truck, QrCode, Factory, ShieldCheck, Boxes, CreditCard, 
  Coins, Users, FileText, ArrowLeft, LogOut, Droplet, Package
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Top Admin Operational Header */}
      <header className="navbar navbar-custom py-2 px-3 sticky-top">
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <Link to="/admin" className="navbar-brand d-flex align-items-center gap-2 m-0">
              <div className="bg-white text-primary p-1 rounded d-flex align-items-center justify-content-center" style={{ width: '26px', height: '26px' }}>
                <Droplet size={16} fill="#1F3B62" color="#1F3B62" />
              </div>
              <span className="fw-bold fs-6">W4EH Operations</span>
            </Link>
            <span className="badge bg-secondary text-white font-monospace text-xs">
              {user?.roles?.join(' • ').toUpperCase() || 'STAFF'}
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link to="/" className="btn btn-outline-light btn-sm d-flex align-items-center gap-1">
              <ArrowLeft size={14} /> View Customer Site
            </Link>

            <div className="text-white small d-none d-md-block text-end">
              <div className="fw-medium">{user?.name}</div>
              <div className="text-xs opacity-75">{user?.email || user?.phone}</div>
            </div>

            <button onClick={handleLogout} className="btn btn-sm btn-outline-light d-flex align-items-center gap-1" title="Log Out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="d-flex flex-grow-1">
        {/* Admin Sidebar */}
        <aside className="admin-sidebar d-none d-md-block flex-shrink-0 py-2">
          <div className="sidebar-heading">Overview</div>
          <NavLink to="/admin" end className="nav-link">
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>

          <div className="sidebar-heading mt-2">Sales & Customers</div>
          <NavLink to="/admin/orders" className="nav-link">
            <ShoppingCart size={16} /> Customer Orders
          </NavLink>
          <NavLink to="/admin/addresses" className="nav-link">
            <MapPin size={16} /> Address Approvals
          </NavLink>
          <NavLink to="/admin/subscriptions" className="nav-link">
            <Repeat size={16} /> Subscriptions
          </NavLink>
          <NavLink to="/admin/events" className="nav-link">
            <Calendar size={16} /> Bulk & Event Bookings
          </NavLink>

          <div className="sidebar-heading mt-2">Fleet & Logistics</div>
          <NavLink to="/admin/deliveries" className="nav-link">
            <Truck size={16} /> Deliveries & Riders
          </NavLink>
          <NavLink to="/admin/bottles" className="nav-link">
            <QrCode size={16} /> Reusable Bottles (QR)
          </NavLink>

          <div className="sidebar-heading mt-2">Production & Stock</div>
          <NavLink to="/admin/products" className="nav-link">
            <Package size={16} /> Product Catalog
          </NavLink>
          <NavLink to="/admin/production" className="nav-link">
            <Factory size={16} /> Production Batches
          </NavLink>
          <NavLink to="/admin/quality" className="nav-link">
            <ShieldCheck size={16} /> Quality Control Tests
          </NavLink>
          <NavLink to="/admin/inventory" className="nav-link">
            <Boxes size={16} /> Stock Inventory
          </NavLink>

          <div className="sidebar-heading mt-2">Finance & Deposits</div>
          <NavLink to="/admin/payments" className="nav-link">
            <CreditCard size={16} /> Payments & COD
          </NavLink>
          <NavLink to="/admin/deposits" className="nav-link">
            <Coins size={16} /> Bottle Deposits
          </NavLink>

          {hasRole('superadmin', 'admin') && (
            <>
              <div className="sidebar-heading mt-2">Administration</div>
              <NavLink to="/admin/staff" className="nav-link">
                <Users size={16} /> Staff & Fleet Accounts
              </NavLink>
              <NavLink to="/admin/audit-logs" className="nav-link">
                <FileText size={16} /> System Audit Trail
              </NavLink>
            </>
          )}
        </aside>

        {/* Content Area */}
        <div className="flex-grow-1 p-3 p-md-4" style={{ maxWidth: '1600px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
