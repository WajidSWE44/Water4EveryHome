// frontend/src/pages/admin/Deliveries.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Truck, Search, CheckCircle, Clock, MapPin, Phone, User } from 'lucide-react';

export default function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const loadDeliveries = async () => {
    try {
      const res = await api.getMyDeliveries(filter === 'all' ? '' : filter);
      if (res.success) setDeliveries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, [filter]);

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Delivery Fleet Operations & Dispatch</h4>
          <span className="text-muted text-xs">Track real-time delivery status, route assignments, and bottle collections (SRS FR-12).</span>
        </div>

        <div className="btn-group btn-group-sm">
          {['all', 'assigned', 'out_for_delivery', 'delivered', 'failed'].map(st => (
            <button
              key={st}
              className={`btn ${filter === st ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}
              onClick={() => setFilter(st)}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card shadow-sm">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading fleet dispatch table...</div>
        ) : deliveries.length === 0 ? (
          <div className="text-center py-5 text-muted small">No delivery runs found for this filter tab.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Delivery #</th>
                  <th>Order #</th>
                  <th>Rider</th>
                  <th>Customer / Contact</th>
                  <th>Destination</th>
                  <th>Delivery Window</th>
                  <th>Status</th>
                  <th>Bottles Exchanged</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id}>
                    <td>
                      <span className="fw-bold text-primary font-monospace small">{d.delivery_number}</span>
                      <div className="text-muted text-xs">{new Date(d.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="small font-monospace text-secondary">{d.order_number}</td>
                    <td>
                      <div className="fw-semibold small d-flex align-items-center gap-1">
                        <User size={13} className="text-primary" /> {d.staff_name || 'Fleet Rider'}
                      </div>
                      <div className="text-muted text-xs">{d.staff_phone}</div>
                    </td>
                    <td>
                      <div className="small fw-medium">{d.recipient_name}</div>
                      <div className="text-muted text-xs">{d.recipient_phone}</div>
                    </td>
                    <td className="small text-secondary" style={{ maxWidth: '240px' }}>
                      <div>{d.street_address}, {d.area_name}</div>
                    </td>
                    <td>
                      <div className="small font-monospace">{d.delivery_date}</div>
                      <div className="text-muted text-xs">{d.time_slot}</div>
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="small">
                      <div className="text-success fw-semibold">Delivered: {d.delivered_bottles_count || 0}</div>
                      <div className="text-primary text-xs">Returned: {d.returned_bottles_count || 0} empties</div>
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
