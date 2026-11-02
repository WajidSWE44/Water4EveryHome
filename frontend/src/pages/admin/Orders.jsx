// frontend/src/pages/admin/Orders.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { 
  ShoppingBag, Search, Filter, CheckCircle, Truck, 
  Eye, AlertCircle, Clock, MapPin, Phone, User 
} from 'lucide-react';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  
  // Assign Rider Modal
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Detail Modal
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadOrders = async () => {
    try {
      let params = [];
      if (filterStatus !== 'all') params.push(`status=${filterStatus}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      
      const res = await api.getAdminOrders(params.join('&'));
      if (res.success) setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await api.getStaff('delivery');
        if (res.success) {
          setStaffList(res.data);
          if (res.data.length > 0) setSelectedStaffId(res.data[0].id.toString());
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadStaff();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const handleConfirm = async (id) => {
    try {
      await api.confirmOrder(id);
      setMessage(`Order #${id} confirmed.`);
      loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenAssign = (order) => {
    setAssignModalOrder(order);
    setError('');
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    setAssigning(true);
    setError('');

    try {
      await api.assignDelivery(assignModalOrder.id, parseInt(selectedStaffId, 10));
      setMessage(`Order assigned to delivery rider successfully.`);
      setAssignModalOrder(null);
      loadOrders();
    } catch (err) {
      setError(err.message || 'Failed to assign rider');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.getOrder(id);
      if (res.success) setDetailOrder(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Customer Orders Management</h4>
          <span className="text-muted text-xs">Review incoming orders, confirm reservations, and dispatch to fleet riders.</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="d-flex align-items-center gap-2">
          <div className="input-group input-group-sm">
            <input
              type="text"
              className="form-control"
              placeholder="Search order #, customer, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Search size={14} />
            </button>
          </div>
        </form>
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

      {/* Filter Tabs */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {['all', 'pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled'].map(st => (
          <button
            key={st}
            className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}
            style={{ fontSize: '0.8rem' }}
            onClick={() => setFilterStatus(st)}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card shadow-sm">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-5 text-muted small">No orders found for this filter.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Location</th>
                  <th>Delivery Date & Slot</th>
                  <th>Amount</th>
                  <th>Order Status</th>
                  <th>Delivery Fleet</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <span className="fw-semibold text-primary font-monospace small">{o.order_number}</span>
                      <div className="text-muted text-xs">{new Date(o.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{o.customer_name}</div>
                      <div className="text-muted text-xs">{o.customer_phone}</div>
                    </td>
                    <td className="small text-muted">{o.area_name}</td>
                    <td>
                      <div className="small font-monospace">{o.delivery_date}</div>
                      <div className="text-muted text-xs">{o.time_slot}</div>
                    </td>
                    <td>
                      <div className="fw-bold small">Rs. {parseFloat(o.total_amount).toFixed(2)}</div>
                      <div className="text-xs text-muted text-uppercase">{o.payment_method.replace(/_/g, ' ')}</div>
                    </td>
                    <td>
                      <StatusBadge status={o.order_status} />
                    </td>
                    <td>
                      {o.delivery_rider_name ? (
                        <div className="small text-primary fw-medium d-flex align-items-center gap-1">
                          <Truck size={13} /> {o.delivery_rider_name}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-outline-secondary btn-sm p-1"
                          title="View Order Details"
                          onClick={() => handleOpenDetail(o.id)}
                        >
                          <Eye size={14} />
                        </button>

                        {o.order_status === 'pending' && (
                          <button
                            className="btn btn-outline-success btn-sm py-0 px-2"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => handleConfirm(o.id)}
                          >
                            Confirm
                          </button>
                        )}

                        {['confirmed', 'processing', 'ready'].includes(o.order_status) && (
                          <button
                            className="btn btn-outline-primary btn-sm py-0 px-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => handleOpenAssign(o)}
                          >
                            <Truck size={12} /> Assign Rider
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Rider Modal */}
      {assignModalOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Assign Fleet Rider to #{assignModalOrder.order_number}</h5>
                <button type="button" className="btn-close" onClick={() => setAssignModalOrder(null)}></button>
              </div>
              <form onSubmit={handleAssignSubmit}>
                <div className="modal-body">
                  <div className="small text-secondary mb-3">
                    <div><strong>Customer:</strong> {assignModalOrder.customer_name} ({assignModalOrder.customer_phone})</div>
                    <div><strong>Destination:</strong> {assignModalOrder.street_address}, {assignModalOrder.area_name}</div>
                    <div><strong>Delivery Window:</strong> {assignModalOrder.delivery_date} ({assignModalOrder.time_slot})</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Delivery Fleet Member *</label>
                    <select
                      className="form-select"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      required
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone}) — {s.vehicle_number || 'Plant Fleet'}
                        </option>
                      ))}
                    </select>
                    {staffList.length === 0 && (
                      <div className="text-danger text-xs mt-1">No staff members found with 'delivery' role.</div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssignModalOrder(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={assigning || staffList.length === 0}>
                    {assigning ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary font-monospace">Order #{detailOrder.order_number} Details</h5>
                <button type="button" className="btn-close" onClick={() => setDetailOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3 small">
                  <div className="col-md-6">
                    <div className="text-muted text-xs">Customer:</div>
                    <div className="fw-semibold">{detailOrder.customer_name} ({detailOrder.customer_phone})</div>
                    <div className="text-muted text-xs mt-2">Delivery Address:</div>
                    <div>{detailOrder.street_address}, {detailOrder.area_name}, {detailOrder.city}</div>
                    {detailOrder.landmark && <div>Landmark: {detailOrder.landmark}</div>}
                  </div>
                  <div className="col-md-6">
                    <div className="text-muted text-xs">Status:</div>
                    <div className="d-flex gap-2 my-1">
                      <StatusBadge status={detailOrder.order_status} />
                      <StatusBadge status={detailOrder.payment_status} label={`Pay: ${detailOrder.payment_status}`} />
                    </div>
                    <div className="text-muted text-xs mt-2">Scheduled Delivery:</div>
                    <div className="fw-semibold">{detailOrder.delivery_date} ({detailOrder.time_slot})</div>
                  </div>
                </div>

                <div className="card shadow-none border mb-3">
                  <div className="card-header py-2 small fw-bold">Order Items Snapshot</div>
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-center">Qty</th>
                        <th>Unit Price</th>
                        <th>Deposit</th>
                        <th className="text-end">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items?.map(it => (
                        <tr key={it.id}>
                          <td className="small">{it.product_name} ({it.volume_ml} ml)</td>
                          <td className="text-center small">{it.quantity}</td>
                          <td className="small">Rs. {parseFloat(it.unit_price).toFixed(2)}</td>
                          <td className="small">Rs. {parseFloat(it.total_deposit).toFixed(2)}</td>
                          <td className="text-end small fw-bold">Rs. {parseFloat(it.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="card-footer bg-light p-2 text-end small">
                    <span className="me-3">Subtotal: Rs. {parseFloat(detailOrder.subtotal_amount).toFixed(2)}</span>
                    <span className="me-3">Deposit: Rs. {parseFloat(detailOrder.deposit_amount).toFixed(2)}</span>
                    <span className="me-3">Delivery: Rs. {parseFloat(detailOrder.delivery_fee).toFixed(2)}</span>
                    <strong className="fs-6 text-primary">Total: Rs. {parseFloat(detailOrder.total_amount).toFixed(2)}</strong>
                  </div>
                </div>

                {detailOrder.status_history && (
                  <div>
                    <h6 className="small fw-bold text-secondary mb-2">Order Lifecycle Audit</h6>
                    <div className="d-flex flex-column gap-1 small">
                      {detailOrder.status_history.map(sh => (
                        <div key={sh.id} className="d-flex justify-content-between p-1 bg-light rounded text-xs">
                          <span><strong>{sh.status.toUpperCase()}</strong>: {sh.notes}</span>
                          <span className="text-muted">{sh.created_at}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDetailOrder(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
