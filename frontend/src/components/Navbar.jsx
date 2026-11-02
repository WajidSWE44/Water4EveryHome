// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Droplet, ShoppingBag, User, LogOut, ShieldCheck, MapPin, Repeat, Calendar, Truck } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-custom sticky-top py-2">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <div className="bg-white text-primary p-1 rounded-1 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
            <Droplet size={18} fill="#1F3B62" color="#1F3B62" />
          </div>
          <div>
            <span className="fw-bold tracking-tight">W4EH</span>
            <span className="d-none d-sm-inline opacity-75 ms-1 fw-normal text-xs" style={{ fontSize: '0.78rem' }}>| Water 4 Every Home</span>
          </div>
        </Link>

        <button 
          className="navbar-toggler border-0 text-white" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto ms-lg-3 gap-lg-1">
            <li className="nav-item">
              <NavLink className="nav-link" to="/products">Bottled Water</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/subscriptions">Subscriptions</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/events">Bulk & Events</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/bottle-returns">Bottle Returns</NavLink>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {/* Cart link */}
            <Link to="/cart" className="btn btn-outline-light btn-sm position-relative d-flex align-items-center gap-1 px-3">
              <ShoppingBag size={16} />
              <span className="d-none d-sm-inline">Cart</span>
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-1" style={{ fontSize: '0.7rem' }}>
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="dropdown">
                <button 
                  className="btn btn-light btn-sm dropdown-toggle d-flex align-items-center gap-1 text-primary fw-medium" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  <User size={15} />
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow-sm" style={{ minWidth: '220px', borderRadius: '4px' }}>
                  <li className="dropdown-header">
                    <div className="fw-bold text-dark">{user.name}</div>
                    <div className="small text-muted">{user.phone}</div>
                    {user.deposit_balance !== undefined && (
                      <div className="badge bg-light text-primary border mt-1">
                        Deposit: Rs. {parseFloat(user.deposit_balance).toFixed(2)}
                      </div>
                    )}
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  
                  {/* Staff Portal Links */}
                  {(hasRole('superadmin', 'admin', 'operations', 'finance')) && (
                    <>
                      <li>
                        <Link className="dropdown-item d-flex align-items-center gap-2 text-primary fw-semibold" to="/admin">
                          <ShieldCheck size={16} /> Admin Portal
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider my-1" /></li>
                    </>
                  )}

                  {hasRole('delivery') && (
                    <>
                      <li>
                        <Link className="dropdown-item d-flex align-items-center gap-2 text-success fw-semibold" to="/delivery">
                          <Truck size={16} /> Rider Deliveries
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider my-1" /></li>
                    </>
                  )}

                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/orders">
                      <ShoppingBag size={15} /> My Orders
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/subscriptions">
                      <Repeat size={15} /> My Subscriptions
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/addresses">
                      <MapPin size={15} /> Delivery Addresses
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item d-flex align-items-center gap-2" to="/deposits">
                      <Droplet size={15} /> Bottle Deposit Ledger
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button className="dropdown-item text-danger d-flex align-items-center gap-2" onClick={handleLogout}>
                      <LogOut size={15} /> Log Out
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm">Log In</Link>
                <Link to="/register" className="btn btn-light btn-sm text-primary fw-semibold">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
