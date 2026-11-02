// frontend/src/pages/admin/Subscriptions.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Repeat, Plus, CheckCircle, AlertCircle, Calendar, Clock, ShoppingCart } from 'lucide-react';

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await api.getSubscriptions();
      if (res.success) setSubscriptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateOrder = async (id) => {
    setGeneratingId(id);
    setError('');
    setMessage('');
    try {
      const res = await api.generateSubscriptionOrder(id);
      if (res.success) {
        setMessage(`Order #${res.data.order_number} generated from subscription.`);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to generate order');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Customer Water Subscriptions</h4>
          <span className="text-muted text-xs">Manage recurring refill schedules and automate daily/weekly replenishment orders (SRS FR-06).</span>
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
          <div className="text-center py-5 text-muted small">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-5 text-muted small">No active customer subscriptions.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Plan Code</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Frequency</th>
                  <th>Delivery Window</th>
                  <th>Destination Area</th>
                  <th>Status</th>
                  <th className="text-end">Auto-Generation</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="fw-bold text-primary font-monospace small">{s.subscription_code}</span>
                      <div className="text-muted text-xs">Started {s.start_date}</div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{s.customer_name}</div>
                      <div className="text-muted text-xs">{s.customer_phone}</div>
                    </td>
                    <td>
                      <div className="small fw-semibold">{s.product_name}</div>
                      <div className="text-muted text-xs">{s.quantity} bottles per cycle</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-primary border text-uppercase font-monospace">
                        {s.frequency}
                      </span>
                    </td>
                    <td className="small font-monospace text-secondary">{s.preferred_time_slot}</td>
                    <td className="small text-muted">{s.area_name}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="text-end">
                      {s.status === 'active' && (
                        <button
                          className="btn btn-outline-primary btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => handleGenerateOrder(s.id)}
                          disabled={generatingId === s.id}
                        >
                          <ShoppingCart size={12} />
                          <span>{generatingId === s.id ? 'Generating...' : 'Trigger Order Today'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
