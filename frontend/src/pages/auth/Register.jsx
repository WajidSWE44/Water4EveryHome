// frontend/src/pages/auth/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Droplet, UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await register({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password
      });

      // Pass demo OTP to verification screen
      navigate('/verify-otp', {
        state: {
          demoOtp: data.demo_otp,
          phone: formData.phone
        }
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-md-3">
      <div className="row justify-content-center">
        <div className="col-12 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-header bg-white text-center py-3">
              <div className="d-inline-flex align-items-center justify-content-center p-2 rounded bg-primary text-white mb-2">
                <Droplet size={24} fill="#FFFFFF" />
              </div>
              <h5 className="fw-bold mb-0 text-primary">Customer Registration</h5>
              <p className="text-muted small mb-0">Create your account for doorstep drinking water delivery</p>
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
                  <label className="form-label small fw-semibold">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    placeholder="e.g. Sarah Ahmed"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Phone Number *</label>
                    <input
                      type="text"
                      name="phone"
                      className="form-control"
                      placeholder="e.g. 03001234567"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                    <div className="form-text text-xs">Used for order delivery and OTP verification</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Email (Optional)</label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="e.g. sarah@example.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Password *</label>
                    <input
                      type="password"
                      name="password"
                      className="form-control"
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      className="form-control"
                      placeholder="Re-type password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 py-2 mt-2"
                  disabled={loading}
                >
                  <UserPlus size={16} />
                  <span>{loading ? 'Creating Account...' : 'Register & Proceed to OTP Verification'}</span>
                </button>
              </form>
            </div>

            <div className="card-footer bg-light text-center py-3 text-muted small">
              Already have an account?{' '}
              <Link to="/login" className="fw-semibold text-primary text-decoration-none">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
