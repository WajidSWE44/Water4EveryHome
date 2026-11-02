// frontend/src/pages/admin/Addresses.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { MapPin, CheckCircle, XCircle, AlertCircle, Clock, User, Phone } from 'lucide-react';

export default function AdminAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadAddresses = async () => {
    try {
      const res = await api.getAdminAddresses(filter === 'all' ? '' : filter);
      if (res.success) setAddresses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [filter]);

  const handleApprove = async (id) => {
    setError('');
    setMessage('');
    try {
      await api.approveAddress(id);
      setMessage(`Address #${id} approved! Customer can now place orders.`);
      loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to approve address');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.rejectAddress(rejectModalId, rejectReason);
      setMessage(`Address #${rejectModalId} rejected.`);
      setRejectModalId(null);
      setRejectReason('');
      loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to reject address');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Customer Delivery Address Approvals</h4>
          <span className="text-muted text-xs">Verify serviceable delivery locations and authorize customer ordering permissions (SRS FR-02).</span>
        </div>

        <div className="btn-group btn-group-sm">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-success flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="card shadow-sm">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading address queue...</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-5 text-muted small">No addresses found for this filter tab.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Recipient / Phone</th>
                  <th>Service Area</th>
                  <th>Street & Details</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th className="text-end">Verification Actions</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map(a => {
                  const isPending = a.approval_status === 'pending';
                  const isApproved = a.approval_status === 'approved';

                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="fw-semibold small">{a.customer_name}</div>
                        <div className="text-muted text-xs font-monospace">{a.customer_code}</div>
                      </td>
                      <td>
                        <div className="small fw-medium">{a.recipient_name}</div>
                        <div className="text-muted text-xs">{a.phone}</div>
                      </td>
                      <td>
                        <div className="small fw-semibold text-primary">{a.service_area_name}</div>
                        <div className="text-muted text-xs">{a.city}</div>
                      </td>
                      <td className="small" style={{ maxWidth: '280px' }}>
                        <div>{a.street_address}</div>
                        {a.landmark && <span className="text-muted text-xs">Near: {a.landmark}</span>}
                        {a.rejection_reason && (
                          <div className="text-danger text-xs mt-1">Rejection: {a.rejection_reason}</div>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={a.approval_status} />
                      </td>
                      <td className="small text-muted font-monospace">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        {isPending && (
                          <div className="d-inline-flex gap-1">
                            <button
                              className="btn btn-success btn-sm py-0 px-2 d-flex align-items-center gap-1"
                              style={{ fontSize: '0.78rem' }}
                              onClick={() => handleApprove(a.id)}
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm py-0 px-2 d-flex align-items-center gap-1"
                              style={{ fontSize: '0.78rem' }}
                              onClick={() => {
                                setRejectModalId(a.id);
                                setRejectReason('Address is outside fleet boundary / invalid contact details');
                              }}
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                        )}
                        {isApproved && (
                          <span className="text-xs text-muted">
                            Approved by {a.approved_by_name || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Reject Delivery Address #{rejectModalId}</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModalId(null)}></button>
              </div>
              <form onSubmit={handleRejectSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Rejection Rationale *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain to customer why the address could not be approved..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejectModalId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>
                    {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
