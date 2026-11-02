// frontend/src/pages/customer/DepositHistory.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Coins, CheckCircle, Info, ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react';

export default function DepositHistory() {
  const [depositData, setDepositData] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDeposits() {
      try {
        const res = await api.getDeposits();
        if (res.success && res.data) {
          setDepositData(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadDeposits();
  }, []);

  return (
    <div className="container py-4">
      <div className="border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <h4 className="fw-bold text-primary mb-1">Refundable Bottle Deposit Ledger</h4>
        <p className="text-muted small mb-0">Transparent tracking of refundable deposits on 19-litre reusable water bottles.</p>
      </div>

      <div className="row g-4 mb-4">
        {/* Balance Card */}
        <div className="col-md-5">
          <div className="card shadow-sm p-4 h-100 bg-white">
            <div className="d-flex align-items-center gap-2 text-primary fw-semibold small mb-2">
              <Coins size={18} /> Current Outstanding Deposit Balance
            </div>
            <div className="display-6 fw-bold text-primary mb-2">
              Rs. {parseFloat(depositData.balance || 0).toFixed(2)}
            </div>
            <div className="text-muted small">
              Equivalent to roughly {Math.floor(parseFloat(depositData.balance || 0) / 600)} active 19L reusable bottle(s) in custody (standard deposit: Rs. 600 each).
            </div>
            <div className="mt-4 pt-3 border-top small text-secondary d-flex align-items-center gap-2">
              <Shield size={16} className="text-success flex-shrink-0" />
              <span>Deposits are held in a separate escrow account and refunded upon empty bottle return.</span>
            </div>
          </div>
        </div>

        {/* Deposit Policy Guide */}
        <div className="col-md-7">
          <div className="card shadow-sm p-4 h-100">
            <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
              <Info size={17} /> How Bottle Deposits Work (SRS FR-08)
            </h6>
            <p className="text-muted small mb-3">
              To support an eco-friendly circular economy, our 19L food-grade polycarbonate bottles are washed, sanitized, and refilled for up to 40 cycles.
            </p>
            <ul className="small text-secondary d-flex flex-column gap-2 ps-3 mb-0">
              <li><strong>Initial Collection:</strong> A one-time deposit of Rs. 600 is charged per 19L bottle on your first order.</li>
              <li><strong>Exchange on Delivery:</strong> When replenishing water, hand over your empty bottle to the rider to avoid new deposits.</li>
              <li><strong>Inspection & Refund:</strong> Returned bottles are inspected by operations. You may request a payout of your balance at any time if you no longer require water services.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card shadow-sm">
        <div className="card-header">Deposit Transaction History</div>
        {loading ? (
          <div className="text-center py-4 text-muted small">Loading ledger...</div>
        ) : depositData.transactions?.length === 0 ? (
          <div className="text-center py-4 text-muted small">No deposit transactions recorded yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Type</th>
                  <th>Order #</th>
                  <th>Notes</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {depositData.transactions?.map(tx => {
                  const isCollected = tx.transaction_type === 'collected';
                  const isRefunded = tx.transaction_type === 'refunded';

                  return (
                    <tr key={tx.id}>
                      <td className="small text-muted font-monospace">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        {isCollected && (
                          <span className="badge badge-confirmed d-inline-flex align-items-center gap-1">
                            <ArrowDownLeft size={12} /> Collected
                          </span>
                        )}
                        {isRefunded && (
                          <span className="badge badge-approved d-inline-flex align-items-center gap-1">
                            <ArrowUpRight size={12} /> Refunded
                          </span>
                        )}
                        {tx.transaction_type === 'deducted_damage' && (
                          <span className="badge badge-cancelled">
                            Deducted (Damage)
                          </span>
                        )}
                      </td>
                      <td className="small font-monospace text-primary">
                        {tx.order_number || '—'}
                      </td>
                      <td className="small text-secondary">{tx.notes}</td>
                      <td className={`text-end fw-bold small ${isCollected ? 'text-primary' : 'text-success'}`}>
                        {isCollected ? `+Rs. ${parseFloat(tx.amount).toFixed(2)}` : `-Rs. ${parseFloat(tx.amount).toFixed(2)}`}
                      </td>
                      <td className="text-end font-monospace small fw-bold">
                        Rs. {parseFloat(tx.balance_after).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
