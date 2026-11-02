// frontend/src/pages/customer/OrderDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { 
  ArrowLeft, Truck, CheckCircle2, Clock, MapPin, 
  CreditCard, ShieldCheck, Phone, AlertCircle, XCircle 
} from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(location.state?.orderCreated ? 'Order placed and stock reserved successfully!' : '');

  const loadOrder = async () => {
    try {
      const res = await api.getOrder(id);
      if (res.success) setOrder(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleSimulatePayment = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await api.demoOnlinePayment(order.id);
      if (res.success) {
        setActionSuccess('Test Online Payment Approved! Payment reference generated.');
        loadOrder();
      }
    } catch (err) {
      setError(err.message || 'Payment simulation failed');
    } finally {
      setPaying(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Reserved stock will be returned to inventory.')) {
      return;
    }
    setCancelling(true);
    setError('');
    try {
      const res = await api.cancelOrder(order.id);
      if (res.success) {
        setActionSuccess('Order has been cancelled and reserved stock released.');
        loadOrder();
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="container py-5 text-center text-muted small">Loading order details...</div>;
  }

  if (error || !order) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error || 'Order not found'}</div>
        <Link to="/orders" className="btn btn-primary btn-sm">Return to My Orders</Link>
      </div>
    );
  }

  // Determine timeline steps
  const steps = [
    { key: 'pending', label: 'Order Submitted', desc: 'Order placed, stock reserved' },
    { key: 'confirmed', label: 'Plant Confirmed', desc: 'Verified and queued at plant' },
    { key: 'processing', label: 'Dispatched to Fleet', desc: order.rider_name ? `Assigned to ${order.rider_name}` : 'Awaiting fleet assignment' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider is on the way to your address' },
    { key: 'delivered', label: 'Delivered', desc: 'Order delivered to doorstep' }
  ];

  const statusOrder = ['pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.order_status);
  const isCancelled = order.order_status === 'cancelled';
  const isFailed = order.order_status === 'failed';

  return (
    <div className="container py-4">
      {/* Back button & Title */}
      <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div className="d-flex align-items-center gap-2">
          <Link to="/orders" className="btn btn-outline-secondary btn-sm p-1">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h4 className="fw-bold text-primary mb-0 font-monospace">Order #{order.order_number}</h4>
            <span className="text-muted text-xs">Placed on {new Date(order.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <StatusBadge status={order.order_status} />
          <StatusBadge status={order.payment_status} label={`Pay: ${order.payment_status}`} />
        </div>
      </div>

      {actionSuccess && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-4">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Tracking Timeline & Delivery details */}
        <div className="col-lg-7">
          {/* Tracking Timeline */}
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex align-items-center gap-2">
              <Clock size={16} /> Delivery Progress & Live Tracking
            </div>
            <div className="card-body p-4">
              {isCancelled ? (
                <div className="alert alert-danger py-3 text-center mb-0">
                  <XCircle size={24} className="mb-2" />
                  <div className="fw-bold">Order Cancelled</div>
                  <div className="small">This order has been cancelled and reserved inventory was returned.</div>
                </div>
              ) : isFailed ? (
                <div className="alert alert-warning py-3 text-center mb-0">
                  <AlertCircle size={24} className="mb-2" />
                  <div className="fw-bold">Delivery Failed</div>
                  <div className="small">The delivery could not be completed. Customer support will reach out.</div>
                </div>
              ) : (
                <div className="order-timeline">
                  {steps.map((s, idx) => {
                    const stepIndex = statusOrder.indexOf(s.key);
                    const isDone = currentIndex >= stepIndex;
                    const isCurrent = currentIndex === stepIndex;

                    return (
                      <div key={s.key} className="timeline-step">
                        <div className={`timeline-dot ${isDone ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}>
                          {isDone ? <CheckCircle2 size={12} /> : null}
                        </div>
                        <div className="ms-2">
                          <div className={`fw-semibold small ${isDone ? 'text-primary' : 'text-muted'}`}>
                            {s.label}
                          </div>
                          <div className="text-muted text-xs">{s.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Delivery Rider Assignment Information */}
          {order.rider_name && (
            <div className="card shadow-sm mb-4 border-primary">
              <div className="card-header bg-light d-flex align-items-center gap-2 text-primary">
                <Truck size={17} /> Assigned Delivery Rider
              </div>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold text-dark fs-6">{order.rider_name}</div>
                    <div className="text-muted small d-flex align-items-center gap-1 mt-1">
                      <Phone size={13} /> {order.rider_phone}
                    </div>
                    {order.vehicle_number && (
                      <div className="badge bg-light text-secondary border mt-1">
                        Vehicle: {order.vehicle_number}
                      </div>
                    )}
                  </div>
                  <a href={`tel:${order.rider_phone}`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
                    <Phone size={14} /> Call Rider
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Destination Details */}
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex align-items-center gap-2">
              <MapPin size={16} /> Destination Details
            </div>
            <div className="card-body p-3">
              <div className="row g-2 small">
                <div className="col-sm-6">
                  <div className="text-muted text-xs">Recipient:</div>
                  <div className="fw-semibold">{order.recipient_name}</div>
                  <div className="text-secondary">{order.recipient_phone}</div>
                </div>
                <div className="col-sm-6">
                  <div className="text-muted text-xs">Scheduled Window:</div>
                  <div className="fw-semibold">{order.delivery_date}</div>
                  <div className="text-secondary">{order.time_slot}</div>
                </div>
                <div className="col-12 border-top pt-2 mt-2">
                  <div className="text-muted text-xs">Street Address:</div>
                  <div className="text-secondary">
                    {order.street_address}, {order.area_name}, {order.city}
                    {order.landmark && <span> (Landmark: {order.landmark})</span>}
                  </div>
                </div>
                {order.special_instructions && (
                  <div className="col-12 bg-light p-2 rounded mt-2 text-xs">
                    <strong className="text-primary">Delivery Instructions:</strong> {order.special_instructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Items & Payment Details */}
        <div className="col-lg-5">
          {/* Itemized receipt */}
          <div className="card shadow-sm mb-4">
            <div className="card-header">Itemized Receipt</div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map(it => (
                    <tr key={it.id}>
                      <td>
                        <div className="fw-semibold small">{it.product_name}</div>
                        <div className="text-muted text-xs">Rs. {parseFloat(it.unit_price).toFixed(2)} ea</div>
                        {parseFloat(it.deposit_per_unit) > 0 && (
                          <div className="text-primary text-xs">+Rs. {parseFloat(it.total_deposit).toFixed(2)} bottle deposit</div>
                        )}
                      </td>
                      <td className="text-center small">{it.quantity}</td>
                      <td className="text-end fw-semibold small">
                        Rs. {parseFloat(it.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 border-top small">
                <div className="d-flex justify-content-between mb-1 text-muted">
                  <span>Subtotal:</span>
                  <span className="text-dark fw-semibold">Rs. {parseFloat(order.subtotal_amount).toFixed(2)}</span>
                </div>
                {parseFloat(order.deposit_amount) > 0 && (
                  <div className="d-flex justify-content-between mb-1 text-primary">
                    <span>Refundable Bottle Deposit:</span>
                    <span className="fw-semibold">Rs. {parseFloat(order.deposit_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>Delivery Fee:</span>
                  <span className="text-dark fw-semibold">Rs. {parseFloat(order.delivery_fee).toFixed(2)}</span>
                </div>
                <div className="border-top pt-2 d-flex justify-content-between align-items-baseline">
                  <span className="fw-bold">Grand Total:</span>
                  <span className="fs-5 fw-bold text-primary">Rs. {parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status & Demo Simulation */}
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex align-items-center gap-2">
              <CreditCard size={16} /> Payment & Billing
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted">Payment Method:</span>
                <span className="badge bg-light text-primary border text-uppercase font-monospace">
                  {order.payment_method.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="small text-muted">Payment Status:</span>
                <StatusBadge status={order.payment_status} />
              </div>

              {order.payment_status === 'pending' && order.payment_method === 'online' && (
                <div className="border-top pt-3">
                  <div className="alert alert-info py-2 small mb-2">
                    <div className="fw-semibold">Demonstration Mode Gateway:</div>
                    <div>Simulate completing online debit/credit card payment for this order.</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                    onClick={handleSimulatePayment}
                    disabled={paying}
                  >
                    <CreditCard size={14} />
                    <span>{paying ? 'Processing...' : 'Simulate Demo Online Card Payment'}</span>
                  </button>
                </div>
              )}

              {order.payment_method === 'cash_on_delivery' && order.payment_status === 'pending' && (
                <div className="text-xs text-muted bg-light p-2 rounded">
                  Cash will be collected by rider upon bottle handover and confirmed by the finance office.
                </div>
              )}
            </div>
          </div>

          {/* Cancel Order Action */}
          {['pending', 'confirmed'].includes(order.order_status) && (
            <div className="card shadow-sm p-3">
              <button
                className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                onClick={handleCancelOrder}
                disabled={cancelling}
              >
                <XCircle size={15} />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Order & Release Reserved Stock'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
