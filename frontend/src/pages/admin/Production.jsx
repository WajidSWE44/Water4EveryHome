// frontend/src/pages/admin/Production.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { 
  Factory, Plus, CheckCircle, AlertCircle, ShieldCheck, 
  Droplet, Eye, XCircle, ArrowRight 
} from 'lucide-react';

export default function AdminProduction() {
  const [batches, setBatches] = useState([]);
  const [sources, setSources] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create Batch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    water_source_id: '',
    production_date: new Date().toISOString().split('T')[0],
    water_volume_liters: 5000,
    notes: 'Standard morning purification cycle',
    items: {}
  });

  // Batch Details Modal
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject Modal
  const [rejectBatchId, setRejectBatchId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [batchRes, srcRes, prodRes] = await Promise.all([
        api.getProductionBatches(),
        api.getWaterSources(),
        api.getProducts()
      ]);
      if (batchRes.success) setBatches(batchRes.data);
      if (srcRes.success) {
        setSources(srcRes.data);
        if (srcRes.data.length > 0 && !formData.water_source_id) {
          setFormData(prev => ({ ...prev, water_source_id: srcRes.data[0].id }));
        }
      }
      if (prodRes.success) {
        setProducts(prodRes.data);
        const initialItems = {};
        prodRes.data.slice(0, 3).forEach(p => {
          initialItems[p.id] = p.id === 4 ? 150 : 300;
        });
        setFormData(prev => ({ ...prev, items: initialItems }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    const itemsArray = Object.entries(formData.items)
      .map(([pid, qty]) => ({ product_id: parseInt(pid, 10), filled_quantity: parseInt(qty, 10) }))
      .filter(it => it.filled_quantity > 0);

    try {
      const res = await api.createProductionBatch({
        water_source_id: parseInt(formData.water_source_id, 10),
        production_date: formData.production_date,
        water_volume_liters: parseFloat(formData.water_volume_liters),
        notes: formData.notes,
        items: itemsArray
      });

      if (res.success) {
        setMessage(`Production batch ${res.data.batch_number} created! Quality testing required.`);
        setShowCreateModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBatch = async (id) => {
    if (!window.confirm('Approve this production batch? This will verify QC results and immediately release filled water bottles into saleable inventory.')) {
      return;
    }
    setError('');
    setMessage('');
    try {
      const res = await api.approveBatch(id);
      if (res.success) {
        setMessage('Batch approved! Stock released to saleable inventory.');
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve batch');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.rejectBatch(rejectBatchId, rejectReason);
      setMessage(`Batch #${rejectBatchId} rejected. Water stock will not enter inventory.`);
      setRejectBatchId(null);
      setRejectReason('');
      loadData();
    } catch (err) {
      setError(err.message || 'Failed to reject batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.getProductionBatch(id);
      if (res.success) setSelectedBatch(res.data);
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
          <h4 className="fw-bold text-primary mb-0">Water Plant Production Batches</h4>
          <span className="text-muted text-xs">Purification runs, bottling operations, and authorized inventory stock releases (SRS FR-09).</span>
        </div>

        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Production Batch
        </button>
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

      {/* Batches Table */}
      <div className="card shadow-sm mb-4">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading production batches...</div>
        ) : batches.length === 0 ? (
          <div className="text-center py-5 text-muted small">No production batches created yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Water Source</th>
                  <th>Production Date</th>
                  <th>Water Volume</th>
                  <th>Bottled Units</th>
                  <th>QC Status</th>
                  <th>Inventory Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map(b => {
                  const isApproved = b.approval_status === 'approved';
                  const isPending = b.approval_status === 'pending';

                  return (
                    <tr key={b.id}>
                      <td>
                        <span className="fw-bold text-primary font-monospace small">{b.batch_number}</span>
                        <div className="text-muted text-xs">Created by {b.created_by_name}</div>
                      </td>
                      <td className="small text-secondary">{b.water_source_name}</td>
                      <td className="small font-monospace">{b.production_date}</td>
                      <td className="small font-monospace fw-semibold">{parseFloat(b.water_volume_liters).toLocaleString()} L</td>
                      <td>
                        <span className="badge bg-light text-primary border font-monospace">
                          {b.total_units_bottled || 0} units ({b.total_products_filled || 0} sizes)
                        </span>
                      </td>
                      <td>
                        <span className="small text-muted font-monospace">
                          {b.tests_passed || 0}/{b.tests_recorded || 0} passed
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={b.approval_status} />
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-1">
                          <button
                            className="btn btn-outline-secondary btn-sm p-1"
                            title="View Batch Details & Tests"
                            onClick={() => handleViewDetail(b.id)}
                          >
                            <Eye size={14} />
                          </button>

                          {isPending && (
                            <>
                              <button
                                className="btn btn-success btn-sm py-0 px-2 d-flex align-items-center gap-1"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => handleApproveBatch(b.id)}
                              >
                                <CheckCircle size={12} /> Approve & Release Stock
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm py-0 px-2"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => {
                                  setRejectBatchId(b.id);
                                  setRejectReason('Failed WHO mineral balance standard');
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary font-monospace">Batch #{selectedBatch.batch_number} Specification</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedBatch(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3 mb-3 small">
                  <div className="col-sm-6">
                    <div><strong>Water Source:</strong> {selectedBatch.water_source_name} ({selectedBatch.source_type})</div>
                    <div><strong>Production Date:</strong> {selectedBatch.production_date}</div>
                    <div><strong>Purified Volume:</strong> {parseFloat(selectedBatch.water_volume_liters).toLocaleString()} Liters</div>
                  </div>
                  <div className="col-sm-6 text-sm-end">
                    <div>Status: <StatusBadge status={selectedBatch.approval_status} /></div>
                    {selectedBatch.approved_by_name && (
                      <div className="text-success mt-1">Authorized by {selectedBatch.approved_by_name}</div>
                    )}
                  </div>
                </div>

                {/* Filled Product Items */}
                <h6 className="small fw-bold text-secondary border-bottom pb-1 mb-2">Bottled Product Output</h6>
                <div className="table-responsive mb-3">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Volume</th>
                        <th>Packaging</th>
                        <th className="text-end">Filled Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.items?.map(it => (
                        <tr key={it.id}>
                          <td className="small fw-semibold">{it.product_name}</td>
                          <td className="small text-muted">{it.volume_label}</td>
                          <td className="small text-muted">{it.packaging_type}</td>
                          <td className="text-end small font-monospace fw-bold">{it.filled_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Quality Tests for this batch */}
                <h6 className="small fw-bold text-secondary border-bottom pb-1 mb-2">Quality Control Tests Recorded</h6>
                {selectedBatch.quality_tests?.length === 0 ? (
                  <div className="alert alert-warning py-2 small mb-0">
                    No QC test records found for this batch. Go to <strong>Quality Control Tests</strong> to submit parameters.
                  </div>
                ) : (
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Test Parameter</th>
                        <th>Standard Range</th>
                        <th>Measured Value</th>
                        <th>Result</th>
                        <th>Lab Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.quality_tests?.map(t => (
                        <tr key={t.id}>
                          <td className="small fw-semibold">{t.test_name}</td>
                          <td className="small text-muted font-monospace">{t.min_acceptable} - {t.max_acceptable} {t.unit}</td>
                          <td className="small font-monospace fw-bold">{t.measured_value} {t.unit}</td>
                          <td><StatusBadge status={t.status} /></td>
                          <td className="small text-muted text-xs">{t.laboratory_reference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedBatch(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">New Water Purification & Bottling Batch</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body">
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Water Source Facility *</label>
                      <select
                        className="form-select"
                        value={formData.water_source_id}
                        onChange={(e) => setFormData({ ...formData, water_source_id: e.target.value })}
                        required
                      >
                        {sources.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Purified Water Volume (Liters) *</label>
                      <input
                        type="number"
                        className="form-control font-monospace"
                        value={formData.water_volume_liters}
                        onChange={(e) => setFormData({ ...formData, water_volume_liters: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Production Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={formData.production_date}
                        onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Batch Operational Notes</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <h6 className="small fw-bold text-primary border-bottom pb-1 mb-2">Filled Bottle Quantities</h6>
                  <div className="row g-2">
                    {products.slice(0, 4).map(p => (
                      <div key={p.id} className="col-6 col-md-3">
                        <label className="form-label small text-muted text-xs mb-1">{p.name} ({p.volume_label})</label>
                        <input
                          type="number"
                          className="form-control form-control-sm text-center font-monospace"
                          min={0}
                          value={formData.items[p.id] || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setFormData({
                              ...formData,
                              items: { ...formData.items, [p.id]: val }
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="alert alert-light border small text-muted mt-3 mb-0 d-flex align-items-center gap-2">
                    <ShieldCheck size={16} className="text-secondary" />
                    <span>In accordance with SRS FR-09, stock will ONLY be released to saleable inventory after required QC checks pass and authorized approval is signed.</span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Creating Batch...' : 'Submit Batch for QC'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectBatchId && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Reject Production Batch #{rejectBatchId}</h5>
                <button type="button" className="btn-close" onClick={() => setRejectBatchId(null)}></button>
              </div>
              <form onSubmit={handleRejectSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Rejection Explanation *</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Microbial test coliform presence / high turbidity"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRejectBatchId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>
                    {submitting ? 'Rejecting...' : 'Confirm Rejection'}
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
