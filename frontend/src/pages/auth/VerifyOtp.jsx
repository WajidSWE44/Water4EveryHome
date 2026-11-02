// frontend/src/pages/auth/VerifyOtp.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [otpCode, setOtpCode] = useState(location.state?.demoOtp || '');
  const [demoCode, setDemoCode] = useState(location.state?.demoOtp || '123456');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const phone = location.state?.phone || user?.phone || 'registered number';

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.verifyOtp(otpCode);
      if (res.success) {
        setSuccess('Phone number verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/addresses');
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const res = await api.sendOtp();
      if (res.success && res.data) {
        setDemoCode(res.data.demo_otp);
        setOtpCode(res.data.demo_otp);
        setSuccess('New demonstration OTP generated!');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container py-5 my-md-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-white text-center py-3">
              <div className="d-inline-flex align-items-center justify-content-center p-2 rounded bg-success text-white mb-2">
                <ShieldCheck size={24} />
              </div>
              <h5 className="fw-bold mb-0 text-primary">Phone Verification</h5>
              <p className="text-muted small mb-0">Enter the 6-digit code sent to {phone}</p>
            </div>

            <div className="card-body p-4">
              {/* Clearly labelled demo notice as per SRS FR-01 */}
              <div className="alert alert-info py-2 px-3 small mb-3 border-info">
                <div className="fw-bold mb-1">Development / Test SMS Mode:</div>
                <div>Your simulated OTP code is: <strong className="font-monospace fs-6 text-primary">{demoCode}</strong></div>
                <div className="text-muted text-xs mt-1">(Real SMS gateway will be connected in production. Standard test fallback: 123456)</div>
              </div>

              {error && (
                <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div className="mb-3 text-center">
                  <label className="form-label small fw-semibold text-muted text-uppercase mb-2">6-Digit Verification Code</label>
                  <input
                    type="text"
                    className="form-control text-center font-monospace fs-4 fw-bold letter-spacing-lg"
                    style={{ letterSpacing: '0.3em' }}
                    maxLength={6}
                    placeholder="------"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading || otpCode.length < 6}
                >
                  <ShieldCheck size={16} />
                  <span>{loading ? 'Verifying...' : 'Verify Phone Number'}</span>
                </button>
              </form>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link btn-sm text-secondary text-decoration-none d-inline-flex align-items-center gap-1"
                  onClick={handleResend}
                  disabled={resending}
                >
                  <RefreshCw size={13} className={resending ? 'spin' : ''} />
                  <span>{resending ? 'Generating...' : 'Resend Simulated OTP'}</span>
                </button>
              </div>
            </div>

            <div className="card-footer bg-light text-center py-2 text-muted small">
              <Link to="/products" className="text-secondary text-decoration-none">
                Skip for now & browse products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
