// frontend/src/pages/admin/Bottles.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, Search, Plus, Filter, RotateCcw, 
  CheckCircle, AlertCircle, Eye, History, Shield, Truck 
} from 'lucide-react';

export default function AdminBottles() {
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  
  // Selected bottle details modal
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New bottle modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [newStatus, setNewStatus] = useState('warehouse_filled');
  const [submitting, setSubmitting] = useState(false);

  // Transition modal
  const [transitionBottle, setTransitionBottle] = useState(null);
  const [targetStatus, setTargetStatus] = useState('inspection');
  const [transitionNotes, setTransitionNotes] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadBottles = async () => {
    try {
      let params = [];
      if (filterStatus !== 'all') params.push(`status=${filterStatus}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);

      const res = await api.getBottles(params.join('&'));
      if (res.success) setBottles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBottles();
  }, [filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBottles();
  };

  const handleOpenDetail = async (code) => {
    setDetailLoading(true);
    try {
      const res = await api.scanBottle(code);
      if (res.success) setSelectedBottle(res.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateBottle = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await api.createBottle({
        serial_number: newSerial,
        product_id: 4, // 19L reusable bottle
        current_status: newStatus
      });

      if (res.success) {
        setMessage(`Bottle asset ${newSerial} registered with QR code.`);
        setShowAddModal(false);
        setNewSerial('');
        loadBottles();
      }
    } catch (err) {
      setError(err.message || 'Failed to register bottle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransitionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.updateBottleStatus(transitionBottle.id, {
        current_status: targetStatus,
        notes: transitionNotes
      });
      setMessage(`Bottle #${transitionBottle.serial_number} status updated to ${targetStatus}.`);
      setTransitionBottle(null);
      loadBottles();
    } catch (err) {
      setError(err.message || 'Failed to transition bottle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Reusable Bottle & QR Tracking</h4>
          <span className="text-muted text-xs">Monitor the 19-litre polycarbonate bottle fleet throughout its 8-stage lifecycle (SRS FR-07).</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="input-group input-group-sm" style={{ width: '240px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search QR or Serial #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <Search size={14} />
            </button>
          </form>

          <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Register Bottle
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

      {/* Filter Tabs */}
      <div className="d-flex flex-wrap gap-1 mb-3">
        {['all', 'warehouse_filled', 'delivered_to_customer', 'returned', 'inspection', 'washing', 'refilling', 'warehouse_empty', 'damaged'].map(st => (
          <button
            key={st}
            className={`btn btn-sm ${filterStatus === st ? 'btn-primary' : 'btn-outline-secondary'} text-capitalize`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setFilterStatus(st)}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Bottles Table */}
      <div className="card shadow-sm">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading bottle fleet...</div>
        ) : bottles.length === 0 ? (
          <div className="text-center py-5 text-muted small">No bottles found for this filter tab.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>QR Code</th>
                  <th>Serial Number</th>
                  <th>Product Model</th>
                  <th>Current Lifecycle Status</th>
                  <th>Refill Cycles</th>
                  <th>Assigned Customer</th>
                  <th>Last Update</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bottles.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div className="p-1 bg-white border rounded d-inline-block">
                        <QRCodeSVG value={b.qr_code} size={36} />
                      </div>
                    </td>
                    <td>
                      <span className="fw-bold text-primary font-monospace small">{b.serial_number}</span>
                      <div className="text-muted text-xs font-monospace">{b.qr_code}</div>
                    </td>
                    <td className="small text-secondary">{b.product_name}</td>
                    <td>
                      <StatusBadge status={b.current_status} />
                    </td>
                    <td className="small font-monospace fw-semibold">{b.cycle_count} cycles</td>
                    <td>
                      {b.current_customer_name ? (
                        <div className="small">
                          <span className="fw-medium text-dark">{b.current_customer_name}</span>
                          <div className="text-xs text-muted">{b.current_customer_phone}</div>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">At Plant Warehouse</span>
                      )}
                    </td>
                    <td className="small text-muted font-monospace">
                      {new Date(b.updated_at).toLocaleDateString()}
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        <button
                          className="btn btn-outline-secondary btn-sm p-1"
                          title="View QR & History"
                          onClick={() => handleOpenDetail(b.qr_code)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn btn-outline-primary btn-sm py-0 px-2 d-flex align-items-center gap-1"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => {
                            setTransitionBottle(b);
                            setTargetStatus('washing');
                            setTransitionNotes('');
                          }}
                        >
                          <RotateCcw size={12} /> Transition
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transition Modal */}
      {transitionBottle && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Update Lifecycle #{transitionBottle.serial_number}</h5>
                <button type="button" className="btn-close" onClick={() => setTransitionBottle(null)}></button>
              </div>
              <form onSubmit={handleTransitionSubmit}>
                <div className="modal-body">
                  <div className="small mb-3">
                    Current Status: <StatusBadge status={transitionBottle.current_status} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Next Lifecycle Stage *</label>
                    <select
                      className="form-select"
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                    >
                      <option value="inspection">Inspection (Visual & Leak check)</option>
                      <option value="washing">Washing (4-Stage Disinfection)</option>
                      <option value="refilling">Refilling (Bottling Line)</option>
                      <option value="quality_check">Quality Check (Cap seal & turbidity)</option>
                      <option value="warehouse_filled">Warehouse Filled (Ready for Order)</option>
                      <option value="warehouse_empty">Warehouse Empty</option>
                      <option value="damaged">Damaged (Hold for repair/retirement)</option>
                      <option value="retired">Retired (Discard from active fleet)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Technician Notes</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Cleared 4-stage ozone wash line bay 2"
                      value={transitionNotes}
                      onChange={(e) => setTransitionNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTransitionBottle(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Confirm Transition'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bottle Detail & QR Modal */}
      {selectedBottle && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary font-monospace">Bottle Asset: {selectedBottle.serial_number}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedBottle(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-4 align-items-center">
                  <div className="col-sm-4 text-center">
                    <div className="p-3 bg-white border rounded d-inline-block shadow-sm">
                      <QRCodeSVG value={selectedBottle.qr_code} size={130} />
                    </div>
                    <div className="font-monospace text-xs text-muted mt-2">{selectedBottle.qr_code}</div>
                  </div>
                  <div className="col-sm-8 small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Current Status:</span>
                      <StatusBadge status={selectedBottle.current_status} />
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Refill Cycles:</span>
                      <span className="fw-bold">{selectedBottle.cycle_count} refills</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Product Size:</span>
                      <span className="fw-semibold">{selectedBottle.product_name} ({selectedBottle.volume_label})</span>
                    </div>
                    {selectedBottle.current_customer_name && (
                      <div className="d-flex justify-content-between mb-1 text-primary">
                        <span>Current Customer:</span>
                        <span className="fw-bold">{selectedBottle.current_customer_name} ({selectedBottle.current_customer_phone})</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottle Transactions Timeline */}
                <h6 className="small fw-bold text-secondary border-bottom pb-1 mb-2">Bottle Lifecycle History</h6>
                {selectedBottle.transactions?.length === 0 ? (
                  <div className="text-muted small">No prior transactions recorded.</div>
                ) : (
                  <div className="d-flex flex-column gap-1 max-vh-40 overflow-auto">
                    {selectedBottle.transactions?.map(tx => (
                      <div key={tx.id} className="d-flex justify-content-between p-2 bg-light rounded small text-xs">
                        <span>
                          <strong className="text-uppercase font-monospace">{tx.transaction_type}</strong>: {tx.notes}
                          {tx.customer_name && <span className="text-primary"> (Customer: {tx.customer_name})</span>}
                        </span>
                        <span className="text-muted">{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedBottle(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Bottle Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Register New Reusable Bottle Asset</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleCreateBottle}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Serial Number *</label>
                    <input
                      type="text"
                      className="form-control font-monospace fw-bold"
                      placeholder="e.g. W4EH-BOT-1025"
                      value={newSerial}
                      onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
                      required
                    />
                    <div className="form-text text-xs">QR code will automatically be generated as QR-[SERIAL].</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Status</label>
                    <select
                      className="form-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="warehouse_filled">Warehouse Filled (Ready for delivery)</option>
                      <option value="warehouse_empty">Warehouse Empty</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !newSerial}>
                    {submitting ? 'Registering...' : 'Register Bottle Asset'}
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
