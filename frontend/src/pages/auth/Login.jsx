// frontend/src/pages/auth/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Droplet, LogIn, AlertCircle, UserCheck } from 'lucide-react';

export default function Login() {
  const [loginStr, setLoginStr] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(loginStr, password);
      const roles = data.user.roles || [];

      if (from) {
        navigate(from, { replace: true });
      } else if (roles.includes('superadmin') || roles.includes('admin') || roles.includes('operations') || roles.includes('finance')) {
        navigate('/admin');
      } else if (roles.includes('delivery')) {
        navigate('/delivery');
      } else {
        navigate('/products');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (userLogin, pass = 'password123') => {
    setLoginStr(userLogin);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="container py-5 my-md-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-white text-center py-3">
              <div className="d-inline-flex align-items-center justify-content-center p-2 rounded bg-primary text-white mb-2">
                <Droplet size={24} fill="#FFFFFF" />
              </div>
              <h5 className="fw-bold mb-0 text-primary">Water 4 Every Home</h5>
              <p className="text-muted small mb-0">Sign in to your account or staff portal</p>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Phone Number or Email</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 03001234567 or user@w4eh.com"
                    value={loginStr}
                    onChange={(e) => setLoginStr(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label small fw-semibold mb-0">Password</label>
                    <span className="text-muted text-xs">Default: password123</span>
                  </div>
                  <input
                    type="password"
                    className="form-control mt-1"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                  disabled={loading}
                >
                  <LogIn size={16} />
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>

              {/* Demo Quick Logins for Testing */}
              <div className="border-top pt-3 mt-4">
                <div className="d-flex align-items-center gap-1 text-xs text-uppercase fw-bold text-secondary mb-2">
                  <UserCheck size={14} /> Demo Quick Logins (One-Click)
                </div>
                <div className="d-flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => fillDemo('customer@w4eh.com')}
                  >
                    Customer (Sarah)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => fillDemo('admin@w4eh.com')}
                  >
                    Super Admin
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => fillDemo('delivery@w4eh.com')}
                  >
                    Delivery Rider (Tariq)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => fillDemo('ops@w4eh.com')}
                  >
                    Operations Lead
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary py-1 px-2"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => fillDemo('finance@w4eh.com')}
                  >
                    Finance Officer
                  </button>
                </div>
              </div>
            </div>

            <div className="card-footer bg-light text-center py-3 text-muted small">
              Don't have a water supply account?{' '}
              <Link to="/register" className="fw-semibold text-primary text-decoration-none">
                Register as Customer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
