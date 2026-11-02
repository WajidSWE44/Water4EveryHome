// frontend/src/pages/admin/Payments.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { CreditCard, CheckCircle, AlertCircle, Coins, ArrowUpRight, DollarSign } from 'lucide-react';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('payments'); // 'payments' or 'deposits'
  
  // Refund Modal
  const [refundModalCustomer, setRefundModalCustomer] = useState(null);
  const [refundAmount, setRefundAmount] = useState(600);
  const [refundNotes, setRefundNotes] = useState('Empties returned and inspected without damage');
  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [payRes, depRes] = await Promise.all([
        api.getPayments(),
        api.getDeposits()
      ]);
      if (payRes.success) setPayments(payRes.data);
      if (depRes.success) setDeposits(depRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmCod = async (id) => {
    setError('');
    setMessage('');
    try {
      await api.confirmCodPayment(id);
      setMessage(`Payment #${id} confirmed and verified by Finance!`);
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to confirm COD payment');
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await api.refundDeposit({
        customer_id: refundModalCustomer.customer_id,
        amount: parseFloat(refundAmount),
        notes: refundNotes
      });

      if (res.success) {
        setMessage(`Deposit refund of Rs. ${refundAmount} processed for customer.`);
        setRefundModalCustomer(null);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to refund deposit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Finance, COD Collections & Bottle Deposits</h4>
          <span className="text-muted text-xs">Verify cash collections, manage escrow deposits, and process bottle refunds (SRS FR-08, FR-14).</span>
        </div>

        <div className="btn-group btn-group-sm">
          <button
            className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('payments')}
          >
            Order Payments ({payments.length})
          </button>
          <button
            className={`btn ${activeTab === 'deposits' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('deposits')}
          >
            Customer Bottle Deposits ({deposits.length})
          </button>
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

      {/* Tab 1: Payments */}
      {activeTab === 'payments' && (
        <div className="card shadow-sm">
          {loading ? (
            <div className="text-center py-5 text-muted small">Loading payment records...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-5 text-muted small">No payment transactions found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Payment Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Confirmed By</th>
                    <th className="text-end">Finance Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => {
                    const isPending = p.status === 'pending';
                    const isCod = p.payment_method === 'cash_on_delivery';

                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="fw-bold text-primary font-monospace small">{p.payment_number}</span>
                          <div className="text-muted text-xs">{new Date(p.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="small font-monospace text-secondary">{p.order_number}</td>
                        <td>
                          <div className="small fw-semibold">{p.customer_name}</div>
                          <div className="text-muted text-xs">{p.customer_phone}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-primary border text-uppercase font-monospace text-xs">
                            {p.payment_method.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="fw-bold small font-monospace">
                          Rs. {parseFloat(p.amount).toFixed(2)}
                        </td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="small text-muted">
                          {p.confirmed_by_name || '—'}
                        </td>
                        <td className="text-end">
                          {isPending && isCod && (
                            <button
                              className="btn btn-success btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.78rem' }}
                              onClick={() => handleConfirmCod(p.id)}
                            >
                              <CheckCircle size={12} /> Confirm COD Collection
                            </button>
                          )}
                          {p.status === 'successful' && (
                            <span className="text-xs text-success fw-semibold">Verified</span>
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
      )}

      {/* Tab 2: Customer Deposits */}
      {activeTab === 'deposits' && (
        <div className="card shadow-sm">
          {loading ? (
            <div className="text-center py-5 text-muted small">Loading deposit ledger...</div>
          ) : deposits.length === 0 ? (
            <div className="text-center py-5 text-muted small">No customer deposit records.</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Customer Code</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Current Deposit Balance</th>
                    <th>Estimated 19L Bottles in Custody</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map(d => {
                    const balance = parseFloat(d.current_balance || 0);
                    const bottlesInCustody = Math.floor(balance / 600);

                    return (
                      <tr key={d.id}>
                        <td>
                          <span className="fw-bold text-primary font-monospace small">{d.customer_code}</span>
                        </td>
                        <td className="small fw-semibold">{d.customer_name}</td>
                        <td className="small text-muted">{d.customer_phone}</td>
                        <td className="fw-bold fs-6 font-monospace text-primary">
                          Rs. {balance.toFixed(2)}
                        </td>
                        <td className="small text-secondary">
                          ~{bottlesInCustody} bottle(s) @ Rs. 600 deposit
                        </td>
                        <td className="text-end">
                          {balance > 0 && (
                            <button
                              className="btn btn-outline-primary btn-sm py-0 px-2 d-inline-flex align-items-center gap-1"
                              style={{ fontSize: '0.78rem' }}
                              onClick={() => {
                                setRefundModalCustomer(d);
                                setRefundAmount(Math.min(balance, 600));
                                setRefundNotes('Refund for inspected empty bottle return');
                              }}
                            >
                              <ArrowUpRight size={12} /> Process Refund
                            </button>
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
      )}

      {/* Process Refund Modal */}
      {refundModalCustomer && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Process Deposit Refund Payout</h5>
                <button type="button" className="btn-close" onClick={() => setRefundModalCustomer(null)}></button>
              </div>
              <form onSubmit={handleRefundSubmit}>
                <div className="modal-body">
                  <div className="small mb-3">
                    <div><strong>Customer:</strong> {refundModalCustomer.customer_name} ({refundModalCustomer.customer_code})</div>
                    <div><strong>Current Balance:</strong> Rs. {parseFloat(refundModalCustomer.current_balance).toFixed(2)}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Refund Payout Amount (Rs.) *</label>
                    <input
                      type="number"
                      className="form-control font-monospace fw-bold"
                      max={parseFloat(refundModalCustomer.current_balance)}
                      min={1}
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Inspection / Verification Rationale</label>
                    <input
                      type="text"
                      className="form-control"
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRefundModalCustomer(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Processing...' : 'Confirm Deposit Refund'}
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
