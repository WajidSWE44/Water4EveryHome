// frontend/src/pages/customer/Checkout.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  MapPin, Calendar, Clock, CreditCard, Banknote, 
  AlertCircle, ShieldCheck, CheckCircle2, PlusCircle, ArrowLeft 
} from 'lucide-react';

export default function Checkout() {
  const { cart, cartSubtotal, cartDeposit, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('09:00 AM - 12:00 PM');
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
  const [instructions, setInstructions] = useState('');

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAddresses() {
      try {
        const res = await api.getAddresses();
        if (res.success && res.data) {
          setAddresses(res.data);
          // Find default approved address
          const defaultApproved = res.data.find(a => a.approval_status === 'approved' && a.is_default);
          const firstApproved = res.data.find(a => a.approval_status === 'approved');
          if (defaultApproved) {
            setSelectedAddressId(defaultApproved.id.toString());
          } else if (firstApproved) {
            setSelectedAddressId(firstApproved.id.toString());
          } else if (res.data.length > 0) {
            setSelectedAddressId(res.data[0].id.toString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAddresses(false);
      }
    }
    loadAddresses();
  }, []);

  if (cart.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: '400px' }}>
          <h5>No items in cart</h5>
          <p className="text-muted small">Please select products first.</p>
          <Link to="/products" className="btn btn-primary btn-sm">Browse Products</Link>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find(a => a.id.toString() === selectedAddressId);
  const deliveryFee = selectedAddress ? parseFloat(selectedAddress.delivery_fee) : 50.00;
  const grandTotal = Math.round((cartSubtotal + cartDeposit + deliveryFee) * 100) / 100;
  const isAddressApproved = selectedAddress && selectedAddress.approval_status === 'approved';

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedAddressId) {
      setError('Please select or add a delivery address.');
      return;
    }

    if (!isAddressApproved) {
      setError('Selected address has not been approved by an administrator yet. As per company policy, orders can only be dispatched to approved locations.');
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        address_id: parseInt(selectedAddressId, 10),
        delivery_date: deliveryDate,
        time_slot: timeSlot,
        payment_method: paymentMethod,
        special_instructions: instructions,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      const res = await api.createOrder(orderPayload);
      if (res.success && res.data) {
        clearCart();
        navigate(`/orders/${res.data.order_id}`, {
          state: { orderCreated: true, orderNumber: res.data.order_number }
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit order. Please check available stock.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center gap-2 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <Link to="/cart" className="btn btn-outline-secondary btn-sm p-1">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h4 className="fw-bold text-primary mb-0">Delivery Checkout</h4>
          <span className="text-muted text-xs">Verify your delivery location, schedule, and payment preference.</span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-4">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="row g-4">
          {/* Main Form Details */}
          <div className="col-lg-7">
            {/* 1. Address Selection */}
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span className="d-flex align-items-center gap-2">
                  <MapPin size={17} /> 1. Delivery Address
                </span>
                <Link to="/addresses" className="btn btn-outline-primary btn-sm py-0 px-2" style={{ fontSize: '0.78rem' }}>
                  <PlusCircle size={12} className="me-1" /> Add Address
                </Link>
              </div>

              <div className="card-body p-3">
                {loadingAddresses ? (
                  <div className="text-muted small py-2">Loading saved addresses...</div>
                ) : addresses.length === 0 ? (
                  <div className="alert alert-warning small mb-0">
                    You have no saved addresses yet. Please{' '}
                    <Link to="/addresses" className="fw-bold">add a delivery address</Link> before ordering.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {addresses.map(addr => {
                      const isApproved = addr.approval_status === 'approved';
                      const isSelected = selectedAddressId === addr.id.toString();

                      return (
                        <label
                          key={addr.id}
                          className={`p-3 border rounded-1 d-flex align-items-start gap-3 cursor-pointer ${
                            isSelected ? 'border-primary bg-light' : ''
                          }`}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type="radio"
                            name="address_id"
                            value={addr.id}
                            checked={isSelected}
                            onChange={(e) => setSelectedAddressId(e.target.value)}
                            className="form-check-input mt-1"
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="fw-semibold text-primary">{addr.recipient_name} ({addr.phone})</span>
                              {isApproved ? (
                                <span className="badge badge-approved text-xs">Approved Location</span>
                              ) : (
                                <span className="badge badge-pending text-xs">Pending Approval</span>
                              )}
                            </div>
                            <div className="small text-secondary">
                              {addr.street_address}, {addr.area_name}, {addr.city}
                              {addr.landmark && <span className="text-muted"> (Near: {addr.landmark})</span>}
                            </div>
                            <div className="text-xs text-muted mt-1">
                              Service Area Fee: Rs. {parseFloat(addr.delivery_fee).toFixed(2)}
                            </div>
                            {!isApproved && (
                              <div className="text-danger text-xs mt-1">
                                Notice: Address awaiting admin review. Orders cannot be dispatched until approved.
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Schedule */}
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <Calendar size={17} /> 2. Delivery Date & Time Window
              </div>
              <div className="card-body p-3">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={deliveryDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Preferred Time Slot</label>
                    <select
                      className="form-select"
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                    >
                      <option value="09:00 AM - 12:00 PM">Morning: 09:00 AM - 12:00 PM</option>
                      <option value="02:00 PM - 05:00 PM">Afternoon: 02:00 PM - 05:00 PM</option>
                      <option value="05:00 PM - 08:00 PM">Evening: 05:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Special Delivery Instructions (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Ring bell twice, leave with guard, call upon arrival"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="card shadow-sm mb-4">
              <div className="card-header d-flex align-items-center gap-2">
                <CreditCard size={17} /> 3. Payment Method
              </div>
              <div className="card-body p-3">
                <div className="d-flex flex-column gap-2">
                  <label className={`p-3 border rounded-1 d-flex align-items-center gap-3 cursor-pointer ${paymentMethod === 'cash_on_delivery' ? 'border-primary bg-light' : ''}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="form-check-input"
                    />
                    <Banknote size={20} className="text-primary flex-shrink-0" />
                    <div>
                      <div className="fw-semibold text-primary">Cash on Delivery (COD)</div>
                      <div className="text-muted text-xs">
                        Pay cash directly to the delivery rider upon bottle handover. Empty bottle returns will be credited immediately.
                      </div>
                    </div>
                  </label>

                  <label className={`p-3 border rounded-1 d-flex align-items-center gap-3 cursor-pointer ${paymentMethod === 'online' ? 'border-primary bg-light' : ''}`}>
                    <input
                      type="radio"
                      name="payment_method"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="form-check-input"
                    />
                    <CreditCard size={20} className="text-primary flex-shrink-0" />
                    <div>
                      <div className="fw-semibold text-primary">Online Payment (Test Simulation)</div>
                      <div className="text-muted text-xs">
                        Simulated online debit/credit card gateway for development demonstration.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Order Review */}
          <div className="col-lg-5">
            <div className="card shadow-sm p-4 sticky-top" style={{ top: '80px' }}>
              <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Order Items</h6>

              <div className="d-flex flex-column gap-2 mb-3 max-vh-50 overflow-auto">
                {cart.map(item => (
                  <div key={item.product_id} className="d-flex justify-content-between align-items-start small border-bottom pb-2">
                    <div>
                      <div className="fw-semibold">{item.name}</div>
                      <div className="text-muted text-xs">{item.volume_label} × {item.quantity} units</div>
                      {item.refundable_deposit > 0 && (
                        <div className="text-primary text-xs">+Rs. {(item.refundable_deposit * item.quantity).toFixed(2)} deposit</div>
                      )}
                    </div>
                    <div className="text-end fw-semibold">
                      Rs. {(item.unit_price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="small border-top pt-2">
                <div className="d-flex justify-content-between mb-1 text-muted">
                  <span>Water Subtotal:</span>
                  <span className="fw-semibold text-dark">Rs. {cartSubtotal.toFixed(2)}</span>
                </div>
                {cartDeposit > 0 && (
                  <div className="d-flex justify-content-between mb-1 text-primary">
                    <span>Refundable Bottle Deposit:</span>
                    <span className="fw-semibold">Rs. {cartDeposit.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-2 text-muted">
                  <span>Service Area Delivery:</span>
                  <span className="fw-semibold text-dark">Rs. {deliveryFee.toFixed(2)}</span>
                </div>
                <div className="border-top pt-2 d-flex justify-content-between align-items-baseline mb-3">
                  <span className="fw-bold">Total Payable:</span>
                  <span className="fs-4 fw-bold text-primary">Rs. {grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                disabled={submitting || !isAddressApproved}
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Reserving Stock & Placing Order...' : 'Confirm & Place Order'}</span>
              </button>

              {!isAddressApproved && (
                <div className="text-danger text-xs text-center mt-2">
                  Please select an approved address to proceed with order confirmation.
                </div>
              )}

              <div className="mt-3 pt-3 border-top text-xs text-muted d-flex align-items-center gap-2">
                <ShieldCheck size={16} className="text-success flex-shrink-0" />
                <span>Backend transaction reserves stock and logs inventory movement upon submission.</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
