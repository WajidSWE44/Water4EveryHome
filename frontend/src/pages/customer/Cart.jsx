// frontend/src/pages/customer/Cart.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Info } from 'lucide-react';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, cartSubtotal, cartDeposit } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const estimatedDeliveryFee = 50.00; // Standard base fee before address selection
  const grandTotal = Math.round((cartSubtotal + cartDeposit + (cart.length > 0 ? estimatedDeliveryFee : 0)) * 100) / 100;

  if (cart.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm p-5 mx-auto" style={{ maxWidth: '450px' }}>
          <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-light text-muted mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
            <ShoppingBag size={32} />
          </div>
          <h5 className="fw-bold text-primary">Your Water Cart is Empty</h5>
          <p className="text-muted small mb-4">
            Select pure drinking water bottles or dispensing accessories from our plant catalogue.
          </p>
          <Link to="/products" className="btn btn-primary d-inline-flex align-items-center justify-content-center gap-2">
            <span>Browse Water Products</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">Your Shopping Cart</h4>
          <p className="text-muted small mb-0">Review selected water bottle quantities and refundable deposits.</p>
        </div>
        <button className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1" onClick={clearCart}>
          <Trash2 size={14} /> Clear Cart
        </button>
      </div>

      <div className="row g-4">
        {/* Cart items table */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th className="text-center" style={{ width: '130px' }}>Quantity</th>
                    <th>Deposit</th>
                    <th className="text-end">Line Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.product_id}>
                      <td>
                        <div className="fw-semibold text-primary">{item.name}</div>
                        <div className="text-muted text-xs font-monospace">
                          {item.volume_label} • {item.packaging_type}
                        </div>
                      </td>
                      <td>
                        Rs. {item.unit_price.toFixed(2)}
                      </td>
                      <td>
                        <div className="input-group input-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="text"
                            className="form-control text-center fw-semibold p-1"
                            value={item.quantity}
                            readOnly
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            disabled={item.available_quantity && item.quantity >= item.available_quantity}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        {item.refundable_deposit > 0 ? (
                          <div>
                            <span className="badge bg-light text-primary border">
                              Rs. {(item.refundable_deposit * item.quantity).toFixed(2)}
                            </span>
                            <div className="text-xs text-muted">(Rs. {item.refundable_deposit.toFixed(0)} ea)</div>
                          </div>
                        ) : (
                          <span className="text-muted text-xs">None</span>
                        )}
                      </td>
                      <td className="text-end fw-bold text-primary">
                        Rs. {(item.unit_price * item.quantity).toFixed(2)}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-link text-danger p-0"
                          title="Remove item"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card-footer bg-light p-3 small text-muted d-flex align-items-center gap-2">
              <Info size={16} className="text-secondary flex-shrink-0" />
              <span>
                Final product prices, delivery charges, and deposits are re-validated securely on the backend at checkout.
              </span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="col-lg-4">
          <div className="card shadow-sm p-4">
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Order Summary</h6>

            <div className="d-flex justify-content-between mb-2 small">
              <span className="text-muted">Water Subtotal:</span>
              <span className="fw-semibold">Rs. {cartSubtotal.toFixed(2)}</span>
            </div>

            {cartDeposit > 0 && (
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted d-flex align-items-center gap-1">
                  Refundable Deposit:
                  <span title="Deposit is tracked in your account and refunded upon empty bottle return">*</span>
                </span>
                <span className="fw-semibold text-primary">Rs. {cartDeposit.toFixed(2)}</span>
              </div>
            )}

            <div className="d-flex justify-content-between mb-3 small">
              <span className="text-muted">Estimated Delivery Fee:</span>
              <span className="fw-semibold">Rs. {estimatedDeliveryFee.toFixed(2)}</span>
            </div>

            <div className="border-top pt-3 mb-4 d-flex justify-content-between align-items-baseline">
              <span className="fw-bold text-dark">Estimated Total:</span>
              <span className="fs-4 fw-bold text-primary">Rs. {grandTotal.toFixed(2)}</span>
            </div>

            {isAuthenticated ? (
              <button
                className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                onClick={() => navigate('/checkout')}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div>
                <button
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-2"
                  onClick={() => navigate('/login', { state: { from: { pathname: '/checkout' } } })}
                >
                  <span>Sign In to Checkout</span>
                  <ArrowRight size={16} />
                </button>
                <div className="text-center text-xs text-muted">
                  New customer? <Link to="/register">Create an account</Link>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-top text-xs text-secondary d-flex flex-column gap-1">
              <div className="d-flex align-items-center gap-1">
                <ShieldCheck size={14} className="text-success" /> Tamper-proof factory sealed bottles
              </div>
              <div className="d-flex align-items-center gap-1">
                <ShieldCheck size={14} className="text-success" /> Doorstep cash on delivery supported
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
