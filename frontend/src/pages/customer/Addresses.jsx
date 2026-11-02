// frontend/src/pages/customer/Addresses.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MapPin, Plus, CheckCircle, Clock, XCircle, AlertCircle, Info } from 'lucide-react';

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    recipient_name: '',
    phone: '',
    service_area_id: '',
    street_address: '',
    landmark: '',
    is_default: false
  });

  const loadData = async () => {
    try {
      const [addrRes, areaRes] = await Promise.all([
        api.getAddresses(),
        api.getServiceAreas()
      ]);
      if (addrRes.success) setAddresses(addrRes.data);
      if (areaRes.success) {
        setServiceAreas(areaRes.data);
        if (areaRes.data.length > 0 && !formData.service_area_id) {
          setFormData(prev => ({ ...prev, service_area_id: areaRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await api.createAddress({
        recipient_name: formData.recipient_name,
        phone: formData.phone,
        service_area_id: parseInt(formData.service_area_id, 10),
        street_address: formData.street_address,
        landmark: formData.landmark,
        is_default: formData.is_default ? 1 : 0
      });

      if (res.success) {
        setSuccess('Address added successfully! It has been submitted for administrator approval.');
        setShowAddModal(false);
        setFormData({
          recipient_name: '',
          phone: '',
          service_area_id: serviceAreas[0]?.id || '',
          street_address: '',
          landmark: '',
          is_default: false
        });
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">Delivery Addresses</h4>
          <p className="text-muted small mb-0">Manage your delivery locations and monitor administrator verification status.</p>
        </div>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add New Address
        </button>
      </div>

      {success && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-success flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Info notice about Address verification requirement as per FR-02 */}
      <div className="alert alert-light border small text-secondary d-flex align-items-start gap-2 mb-4">
        <Info size={16} className="text-primary mt-1 flex-shrink-0" />
        <div>
          <strong>Address Verification Notice (SRS FR-02):</strong> To ensure fleet reliability and service area coverage, all newly added customer addresses are initially reviewed and approved by company administrators before orders can be scheduled.
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted small">Loading addresses...</div>
      ) : addresses.length === 0 ? (
        <div className="card shadow-sm text-center p-5">
          <div className="d-inline-flex p-3 rounded-circle bg-light text-muted mx-auto mb-3">
            <MapPin size={28} />
          </div>
          <h6 className="fw-bold text-primary">No Saved Delivery Addresses</h6>
          <p className="text-muted small mb-3">Add your home or office address to start ordering pure water.</p>
          <button className="btn btn-primary btn-sm mx-auto" onClick={() => setShowAddModal(true)}>
            Add Delivery Address
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {addresses.map(addr => {
            const isApproved = addr.approval_status === 'approved';
            const isPending = addr.approval_status === 'pending';
            const isRejected = addr.approval_status === 'rejected';

            return (
              <div key={addr.id} className="col-12 col-md-6">
                <div className="card h-100 shadow-sm p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="fw-bold text-primary">{addr.recipient_name}</span>
                      {addr.is_default == 1 && (
                        <span className="badge bg-light text-primary border ms-2">Default</span>
                      )}
                    </div>

                    <div>
                      {isApproved && (
                        <span className="badge badge-approved d-inline-flex align-items-center gap-1">
                          <CheckCircle size={12} /> Approved
                        </span>
                      )}
                      {isPending && (
                        <span className="badge badge-pending d-inline-flex align-items-center gap-1">
                          <Clock size={12} /> Pending Review
                        </span>
                      )}
                      {isRejected && (
                        <span className="badge badge-cancelled d-inline-flex align-items-center gap-1">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="small text-secondary mb-2">
                    <div><strong>Phone:</strong> {addr.phone}</div>
                    <div><strong>Sector/Area:</strong> {addr.area_name} ({addr.city})</div>
                    <div><strong>Street Address:</strong> {addr.street_address}</div>
                    {addr.landmark && <div><strong>Landmark:</strong> {addr.landmark}</div>}
                  </div>

                  <div className="border-top pt-2 mt-auto text-xs d-flex justify-content-between align-items-center text-muted">
                    <span>Delivery Fee: Rs. {parseFloat(addr.delivery_fee).toFixed(2)}</span>
                    {isApproved && addr.approved_by_name && (
                      <span className="text-success">Verified by {addr.approved_by_name}</span>
                    )}
                    {isRejected && addr.rejection_reason && (
                      <span className="text-danger">Reason: {addr.rejection_reason}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Add New Delivery Address</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Recipient Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sarah Ahmed"
                      value={formData.recipient_name}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Contact Phone *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 03001234567"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Service Area Coverage *</label>
                      <select
                        className="form-select"
                        value={formData.service_area_id}
                        onChange={(e) => setFormData({ ...formData, service_area_id: e.target.value })}
                        required
                      >
                        {serviceAreas.map(a => (
                          <option key={a.id} value={a.id}>{a.name} (Fee: Rs. {parseFloat(a.delivery_fee).toFixed(0)})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Street Address / House / Flat *</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. House 42, Street 8, Block K"
                      value={formData.street_address}
                      onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Prominent Landmark (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Opposite Jalal Sons / Near Mosque"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    />
                  </div>

                  <div className="form-check">
                    <input
                      type="checkbox"
                      id="isDefaultCheck"
                      className="form-check-input"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    <label htmlFor="isDefaultCheck" className="form-check-label small text-secondary">
                      Set as my default delivery address
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                    {saving ? 'Submitting...' : 'Save & Submit for Approval'}
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
