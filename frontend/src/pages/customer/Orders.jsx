// frontend/src/pages/customer/Orders.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { ShoppingBag, ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await api.getMyOrders();
        if (res.success) setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">My Water Orders</h4>
          <p className="text-muted small mb-0">Track your order statuses, delivery fleet progress, and receipts.</p>
        </div>
        <Link to="/products" className="btn btn-outline-primary btn-sm">
          Place New Order
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted small">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="card shadow-sm text-center p-5">
          <div className="d-inline-flex p-3 rounded-circle bg-light text-muted mx-auto mb-3">
            <ShoppingBag size={28} />
          </div>
          <h6 className="fw-bold text-primary">No Orders Placed Yet</h6>
          <p className="text-muted small mb-3">You haven't submitted any water supply orders.</p>
          <Link to="/products" className="btn btn-primary btn-sm mx-auto">
            Order Water Now
          </Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {orders.map(order => (
            <div key={order.id} className="card shadow-sm p-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 border-bottom pb-2 mb-2">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold text-primary font-monospace">{order.order_number}</span>
                  <StatusBadge status={order.order_status} />
                  <StatusBadge status={order.payment_status} label={`Pay: ${order.payment_status}`} />
                </div>
                <div className="text-muted small d-flex align-items-center gap-2">
                  <span className="d-flex align-items-center gap-1">
                    <Calendar size={13} /> {new Date(order.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="d-flex align-items-center gap-1">
                    <Clock size={13} /> {order.time_slot}
                  </span>
                </div>
              </div>

              <div className="row g-2 align-items-center">
                <div className="col-md-7">
                  <div className="d-flex align-items-start gap-1 small text-secondary">
                    <MapPin size={15} className="text-primary mt-1 flex-shrink-0" />
                    <span>
                      <strong>{order.recipient_name}:</strong> {order.street_address}, {order.area_name}, {order.city}
                    </span>
                  </div>
                  {order.delivery_rider_name && (
                    <div className="text-xs text-primary mt-1 ms-3">
                      Assigned Rider: <strong>{order.delivery_rider_name}</strong> ({order.delivery_rider_phone})
                    </div>
                  )}
                </div>

                <div className="col-md-3 text-md-end">
                  <div className="text-muted text-xs">Total Bottles: {order.total_bottles || 1}</div>
                  <div className="fs-5 fw-bold text-primary">Rs. {parseFloat(order.total_amount).toFixed(2)}</div>
                </div>

                <div className="col-md-2 text-md-end">
                  <Link to={`/orders/${order.id}`} className="btn btn-outline-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1">
                    <span>Track</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
