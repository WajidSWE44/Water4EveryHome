// frontend/src/pages/customer/Subscriptions.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Repeat, Plus, Pause, Play, XCircle, AlertCircle, CheckCircle, Calendar, Clock, MapPin } from 'lucide-react';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    product_id: '',
    quantity: 2,
    address_id: '',
    frequency: 'weekly',
    preferred_time_slot: '09:00 AM - 12:00 PM',
    start_date: new Date().toISOString().split('T')[0],
    special_notes: ''
  });

  const loadData = async () => {
    try {
      const [subRes, prodRes, addrRes] = await Promise.all([
        api.getSubscriptions(),
        api.getProducts(),
        api.getAddresses()
      ]);
      if (subRes.success) setSubscriptions(subRes.data);
      if (prodRes.success) {
        setProducts(prodRes.data);
        if (prodRes.data.length > 0 && !formData.product_id) {
          // Default to 19L reusable bottle (id 4 or first product)
          const reusable = prodRes.data.find(p => p.is_reusable) || prodRes.data[0];
          setFormData(prev => ({ ...prev, product_id: reusable.id }));
        }
      }
      if (addrRes.success) {
        setAddresses(addrRes.data);
        const approved = addrRes.data.find(a => a.approval_status === 'approved');
        if (approved && !formData.address_id) {
          setFormData(prev => ({ ...prev, address_id: approved.id }));
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.createSubscription({
        product_id: parseInt(formData.product_id, 10),
        quantity: parseInt(formData.quantity, 10),
        address_id: parseInt(formData.address_id, 10),
        frequency: formData.frequency,
        preferred_time_slot: formData.preferred_time_slot,
        start_date: formData.start_date,
        special_notes: formData.special_notes
      });

      if (res.success) {
        setSuccess('Recurring water refill subscription created successfully!');
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to create subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async (id) => {
    try {
      await api.pauseSubscription(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResume = async (id) => {
    try {
      await api.resumeSubscription(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this recurring subscription?')) return;
    try {
      await api.cancelSubscription(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">Scheduled Water Subscriptions</h4>
          <p className="text-muted small mb-0">Automate recurring water bottle deliveries on your preferred schedule.</p>
        </div>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Refill Plan
        </button>
      </div>

      {success && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-success flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted small">Loading subscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="card shadow-sm text-center p-5">
          <div className="d-inline-flex p-3 rounded-circle bg-light text-muted mx-auto mb-3">
            <Repeat size={28} />
          </div>
          <h6 className="fw-bold text-primary">No Active Recurring Subscriptions</h6>
          <p className="text-muted small mb-3">Never run out of pure drinking water. Setup weekly or monthly automated bottle deliveries.</p>
          <button className="btn btn-primary btn-sm mx-auto" onClick={() => setShowModal(true)}>
            Start a Subscription
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {subscriptions.map(sub => (
            <div key={sub.id} className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                  <div>
                    <span className="fw-bold text-primary font-monospace">{sub.subscription_code}</span>
                    <span className="badge bg-light text-primary border text-uppercase ms-2 font-monospace">
                      {sub.frequency}
                    </span>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="mb-2">
                  <div className="fw-bold text-dark fs-6">{sub.product_name}</div>
                  <div className="text-muted small">
                    Quantity: <strong>{sub.quantity} bottles</strong> per cycle • Rs. {parseFloat(sub.total_per_cycle).toFixed(2)}
                  </div>
                </div>

                <div className="small text-secondary mb-3">
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <Calendar size={13} className="text-primary" /> Start Date: {sub.start_date}
                  </div>
                  <div className="d-flex align-items-center gap-1 mb-1">
                    <Clock size={13} className="text-primary" /> Delivery Time: {sub.preferred_time_slot}
                  </div>
                  <div className="d-flex align-items-start gap-1">
                    <MapPin size={13} className="text-primary mt-1 flex-shrink-0" />
                    <span>{sub.street_address}, {sub.area_name}</span>
                  </div>
                </div>

                <div className="border-top pt-2 mt-auto d-flex justify-content-end gap-2">
                  {sub.status === 'active' && (
                    <button
                      className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1 py-1"
                      onClick={() => handlePause(sub.id)}
                    >
                      <Pause size={13} /> Pause Plan
                    </button>
                  )}
                  {sub.status === 'paused' && (
                    <button
                      className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 py-1"
                      onClick={() => handleResume(sub.id)}
                    >
                      <Play size={13} /> Resume Plan
                    </button>
                  )}
                  {sub.status !== 'cancelled' && (
                    <button
                      className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 py-1"
                      onClick={() => handleCancel(sub.id)}
                    >
                      <XCircle size={13} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Subscription Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Setup Automated Water Subscription</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Water Product</label>
                    <select
                      className="form-select"
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      required
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.volume_label}) — Rs. {parseFloat(p.unit_price).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Bottles per Cycle</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={50}
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Delivery Frequency</label>
                      <select
                        className="form-select"
                        value={formData.frequency}
                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      >
                        <option value="daily">Daily Delivery</option>
                        <option value="weekly">Weekly (Every 7 Days)</option>
                        <option value="biweekly">Every Two Weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Approved Delivery Address</label>
                    <select
                      className="form-select"
                      value={formData.address_id}
                      onChange={(e) => setFormData({ ...formData, address_id: e.target.value })}
                      required
                    >
                      {addresses.filter(a => a.approval_status === 'approved').map(a => (
                        <option key={a.id} value={a.id}>
                          {a.recipient_name}: {a.street_address}, {a.area_name}
                        </option>
                      ))}
                    </select>
                    {addresses.filter(a => a.approval_status === 'approved').length === 0 && (
                      <div className="form-text text-danger text-xs">
                        No approved addresses found. Please wait for address approval or add a valid location.
                      </div>
                    )}
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">First Delivery Date</label>
                      <input
                        type="date"
                        className="form-control"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Time Slot</label>
                      <select
                        className="form-select"
                        value={formData.preferred_time_slot}
                        onChange={(e) => setFormData({ ...formData, preferred_time_slot: e.target.value })}
                      >
                        <option value="09:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                        <option value="02:00 PM - 05:00 PM">02:00 PM - 05:00 PM</option>
                        <option value="05:00 PM - 08:00 PM">05:00 PM - 08:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Special Instructions</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ring bell, leave outside door if unattended"
                      value={formData.special_notes}
                      onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Activating...' : 'Activate Subscription'}
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
