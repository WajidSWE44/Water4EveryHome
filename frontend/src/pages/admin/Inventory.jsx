// frontend/src/pages/admin/Inventory.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Boxes, Plus, AlertTriangle, CheckCircle, RotateCcw, Clock, AlertCircle } from 'lucide-react';

export default function AdminInventory() {
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('balances'); // 'balances' or 'movements'
  
  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({
    product_id: '',
    quantity: 10,
    movement_type: 'manual_adjustment',
    notes: 'Warehouse delivery restock'
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [balRes, movRes] = await Promise.all([
        api.getInventory(),
        api.getInventoryMovements()
      ]);
      if (balRes.success) {
        setBalances(balRes.data);
        if (balRes.data.length > 0 && !adjustData.product_id) {
          setAdjustData(prev => ({ ...prev, product_id: balRes.data[0].product_id }));
        }
      }
      if (movRes.success) setMovements(movRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await api.adjustInventory({
        product_id: parseInt(adjustData.product_id, 10),
        quantity: parseInt(adjustData.quantity, 10),
        movement_type: adjustData.movement_type,
        notes: adjustData.notes
      });

      if (res.success) {
        setMessage('Inventory adjusted and audit movement logged.');
        setShowAdjustModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to adjust inventory');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Product Stock & Inventory Balances</h4>
          <span className="text-muted text-xs">Maintain accurate physical on-hand and customer reserved stock (SRS FR-11).</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowAdjustModal(true)}>
            <Plus size={16} /> Adjust Stock / Restock
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-success flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="btn-group btn-group-sm mb-3">
        <button
          className={`btn ${activeTab === 'balances' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('balances')}
        >
          Product Stock Balances ({balances.length})
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('movements')}
        >
          Inventory Movement Audit Log ({movements.length})
        </button>
      </div>

      {/* Tab 1: Balances */}
      {activeTab === 'balances' && (
        <div className="card shadow-sm">
          {loading ? (
            <div className="text-center py-5 text-muted small">Loading balances...</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-center">On Hand</th>
                    <th className="text-center">Reserved</th>
                    <th className="text-center">Available Stock</th>
                    <th className="text-center">Threshold</th>
                    <th>Status</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map(b => {
                    const isLow = b.is_low_stock == 1;

                    return (
                      <tr key={b.product_id} className={isLow ? 'table-warning' : ''}>
                        <td>
                          <div className="fw-bold text-primary">{b.product_name}</div>
                          <div className="text-muted text-xs">{b.volume_label} • {b.packaging_type}</div>
                        </td>
                        <td className="small text-secondary">{b.category_name}</td>
                        <td className="text-center font-monospace fw-semibold fs-6">
                          {b.quantity_on_hand}
                        </td>
                        <td className="text-center font-monospace text-muted">
                          {b.quantity_reserved}
                        </td>
                        <td className="text-center font-monospace fw-bold fs-6 text-primary">
                          {b.available_quantity}
                        </td>
                        <td className="text-center font-monospace text-xs text-muted">
                          {b.reorder_threshold}
                        </td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-cancelled d-inline-flex align-items-center gap-1">
                              <AlertTriangle size={11} /> Low Stock Alert
                            </span>
                          ) : (
                            <span className="badge badge-approved">Optimal</span>
                          )}
                        </td>
                        <td className="small font-monospace fw-semibold">
                          Rs. {parseFloat(b.unit_price).toFixed(2)}
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

      {/* Tab 2: Movements Log */}
      {activeTab === 'movements' && (
        <div className="card shadow-sm">
          {loading ? (
            <div className="text-center py-5 text-muted small">Loading movements...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-5 text-muted small">No movements recorded yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Product</th>
                    <th>Movement Type</th>
                    <th className="text-center">Quantity Delta</th>
                    <th>Reference / Notes</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td className="small font-monospace text-muted">
                        {new Date(m.created_at).toLocaleString()}
                      </td>
                      <td className="small fw-semibold text-primary">{m.product_name}</td>
                      <td>
                        <span className="badge bg-light text-dark border font-monospace text-xs">
                          {m.movement_type}
                        </span>
                      </td>
                      <td className={`text-center font-monospace fw-bold ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="small text-secondary">{m.notes}</td>
                      <td className="small text-muted">{m.created_by_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Manual Stock Adjustment</h5>
                <button type="button" className="btn-close" onClick={() => setShowAdjustModal(false)}></button>
              </div>
              <form onSubmit={handleAdjustSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Product *</label>
                    <select
                      className="form-select"
                      value={adjustData.product_id}
                      onChange={(e) => setAdjustData({ ...adjustData, product_id: e.target.value })}
                      required
                    >
                      {balances.map(b => (
                        <option key={b.product_id} value={b.product_id}>
                          {b.product_name} (Current on hand: {b.quantity_on_hand})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Quantity Delta *</label>
                      <input
                        type="number"
                        className="form-control font-monospace fw-bold"
                        placeholder="e.g. 50 or -5"
                        value={adjustData.quantity}
                        onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                        required
                      />
                      <div className="form-text text-xs text-muted">Use negative numbers to remove damaged/lost stock.</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Movement Category *</label>
                      <select
                        className="form-select"
                        value={adjustData.movement_type}
                        onChange={(e) => setAdjustData({ ...adjustData, movement_type: e.target.value })}
                        required
                      >
                        <option value="manual_adjustment">Manual Adjustment</option>
                        <option value="production_add">Supplier / Production Intake</option>
                        <option value="damaged_removal">Damaged Stock Removal</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Mandatory Reason / Notes (SRS FR-11) *</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Physical inventory count reconciliation / broken bottle replacement"
                      value={adjustData.notes}
                      onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdjustModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Save & Log Movement'}
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
