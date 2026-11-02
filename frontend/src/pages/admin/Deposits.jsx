// frontend/src/pages/admin/Deposits.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Coins, Search, ArrowUpRight, RotateCcw, CheckCircle, AlertCircle, ShieldCheck, User } from 'lucide-react';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [refundAmount, setRefundAmount] = useState(600);
  const [refundNotes, setRefundNotes] = useState('Deposit refund upon bottle return inspection');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await api.getDeposits();
      if (res.success) {
        setDeposits(res.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load deposit balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRefund = (cust) => {
    setSelectedCustomer(cust);
    const maxRefund = parseFloat(cust.current_balance);
    setRefundAmount(maxRefund >= 600 ? 600 : maxRefund);
    setRefundNotes(`Refund processed for ${cust.customer_name} upon bottle inspection`);
    setError('');
    setShowRefundModal(true);
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.refundDeposit({
        customer_id: selectedCustomer.customer_id,
        amount: parseFloat(refundAmount),
        notes: refundNotes
      });

      if (res.success) {
        setMessage(`Successfully refunded Rs. ${parseFloat(refundAmount).toLocaleString()} to ${selectedCustomer.customer_name}.`);
        setShowRefundModal(false);
        loadData();
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setError(err.message || 'Refund failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalDepositPool = deposits.reduce((sum, d) => sum + parseFloat(d.current_balance || 0), 0);
  const activeDepositors = deposits.filter(d => parseFloat(d.current_balance || 0) > 0).length;

  // Filtered List
  const filteredDeposits = deposits.filter(d => {
    const q = search.toLowerCase();
    return (d.customer_name && d.customer_name.toLowerCase().includes(q)) ||
           (d.customer_code && d.customer_code.toLowerCase().includes(q)) ||
           (d.customer_phone && d.customer_phone.includes(q));
  });

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Customer Bottle Deposit Ledger</h4>
          <span className="text-muted text-xs">Track refundable 19L bottle security deposits and process cash/online return payouts (SRS FR-08, FR-14).</span>
        </div>
      </div>

      {message && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && !showRefundModal && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card-custom p-3 d-flex align-items-center gap-3">
            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded">
              <Coins size={24} />
            </div>
            <div>
              <div className="text-muted text-xs fw-semibold">TOTAL DEPOSIT POOL HELD</div>
              <div className="fs-4 fw-bold text-primary">Rs. {totalDepositPool.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card-custom p-3 d-flex align-items-center gap-3">
            <div className="bg-success bg-opacity-10 text-success p-3 rounded">
              <User size={24} />
            </div>
            <div>
              <div className="text-muted text-xs fw-semibold">CUSTOMERS WITH ACTIVE DEPOSITS</div>
              <div className="fs-4 fw-bold text-success">{activeDepositors} Customers</div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card-custom p-3 d-flex align-items-center gap-3">
            <div className="bg-info bg-opacity-10 text-info p-3 rounded">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="text-muted text-xs fw-semibold">STANDARD DEPOSIT RATE</div>
              <div className="fs-4 fw-bold text-dark">Rs. 600 / 19L Bottle</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search by customer name, customer code (CUST-...), or phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4 text-md-end text-muted small">
            Displaying {filteredDeposits.length} customer records
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-custom p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th className="ps-3">Customer Code</th>
                <th>Customer Name</th>
                <th>Contact Phone</th>
                <th>Current Balance (Held)</th>
                <th>Equivalent Bottles</th>
                <th className="pe-3 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    Loading customer deposits...
                  </td>
                </tr>
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No deposit records found.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map(cust => {
                  const bal = parseFloat(cust.current_balance || 0);
                  const bottleEquiv = Math.floor(bal / 600);
                  return (
                    <tr key={cust.id}>
                      <td className="ps-3">
                        <span className="font-monospace fw-semibold text-primary">
                          {cust.customer_code}
                        </span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{cust.customer_name}</div>
                      </td>
                      <td>
                        <span className="text-muted small">{cust.customer_phone}</span>
                      </td>
                      <td>
                        <span className={`fw-bold ${bal > 0 ? 'text-primary' : 'text-muted'}`}>
                          Rs. {bal.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        {bottleEquiv > 0 ? (
                          <span className="badge bg-light text-primary border">
                            {bottleEquiv} bottle(s)
                          </span>
                        ) : (
                          <span className="text-muted text-xs">0 bottles</span>
                        )}
                      </td>
                      <td className="pe-3 text-end">
                        <button
                          disabled={bal <= 0}
                          onClick={() => handleOpenRefund(cust)}
                          className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-1"
                        >
                          <RotateCcw size={14} /> Refund Payout
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedCustomer && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-primary">
                  Process Bottle Deposit Refund
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRefundModal(false)}></button>
              </div>
              <form onSubmit={handleRefundSubmit}>
                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger py-2 mb-3 d-flex align-items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <div className="bg-light p-3 rounded mb-3 border">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Customer:</span>
                      <span className="fw-bold">{selectedCustomer.customer_name} ({selectedCustomer.customer_code})</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted small">Contact Phone:</span>
                      <span className="fw-medium">{selectedCustomer.customer_phone}</span>
                    </div>
                    <div className="d-flex justify-content-between border-top pt-1 mt-1">
                      <span className="text-muted small">Max Refundable Balance:</span>
                      <span className="fw-bold text-primary">Rs. {parseFloat(selectedCustomer.current_balance).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-xs fw-semibold">Refund Amount (PKR) *</label>
                    <div className="input-group">
                      <span className="input-group-text">Rs.</span>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min="1"
                        max={parseFloat(selectedCustomer.current_balance)}
                        step="1"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                      />
                    </div>
                    <div className="d-flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-xs py-1 px-2"
                        onClick={() => setRefundAmount(Math.min(600, parseFloat(selectedCustomer.current_balance)))}
                      >
                        1 Bottle (Rs. 600)
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-xs py-1 px-2"
                        onClick={() => setRefundAmount(Math.min(1200, parseFloat(selectedCustomer.current_balance)))}
                      >
                        2 Bottles (Rs. 1,200)
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-xs py-1 px-2"
                        onClick={() => setRefundAmount(parseFloat(selectedCustomer.current_balance))}
                      >
                        Full Balance
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-xs fw-semibold">Reason / Inspection Notes *</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      required
                      value={refundNotes}
                      onChange={(e) => setRefundNotes(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-0">
                    <ShieldCheck size={16} />
                    <span>Refund deducts balance atomically and creates a permanent financial audit record.</span>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRefundModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={submitting}>
                    {submitting ? 'Processing...' : 'Confirm Refund Payout'}
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
