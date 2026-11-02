// frontend/src/pages/admin/QualityControl.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { ShieldCheck, Plus, CheckCircle, AlertCircle, Info, TestTube, FileText } from 'lucide-react';

export default function AdminQualityControl() {
  const [tests, setTests] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    batch_id: '',
    quality_test_id: '',
    measured_value: '7.3',
    status: 'pass',
    laboratory_reference: 'LAB-QC-1092',
    remarks: 'Within optimal drinking specification'
  });

  const loadData = async () => {
    try {
      const [testRes, batchRes] = await Promise.all([
        api.getQualityTests(),
        api.getProductionBatches()
      ]);
      if (testRes.success) {
        setTests(testRes.data);
        if (testRes.data.length > 0 && !formData.quality_test_id) {
          setFormData(prev => ({ ...prev, quality_test_id: testRes.data[0].id }));
        }
      }
      if (batchRes.success) {
        setBatches(batchRes.data);
        if (batchRes.data.length > 0 && !formData.batch_id) {
          setFormData(prev => ({ ...prev, batch_id: batchRes.data[0].id }));
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await api.recordQualityTest(formData.batch_id, {
        quality_test_id: parseInt(formData.quality_test_id, 10),
        measured_value: formData.measured_value,
        status: formData.status,
        laboratory_reference: formData.laboratory_reference,
        remarks: formData.remarks
      });

      if (res.success) {
        setMessage('Quality test record logged successfully!');
        setShowRecordModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to record test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Water Plant Quality Control & Laboratory Tests</h4>
          <span className="text-muted text-xs">Standard parameters, laboratory testing thresholds, and batch compliance (SRS FR-10).</span>
        </div>

        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowRecordModal(true)}>
          <Plus size={16} /> Record Batch QC Test
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

      {/* Compliance Disclaimer as required by FR-10 */}
      <div className="alert alert-light border small text-secondary d-flex align-items-start gap-2 mb-4">
        <Info size={16} className="text-primary mt-1 flex-shrink-0" />
        <div>
          <strong>Drinking Water Standard Compliance (SRS FR-10):</strong> All water products adhere to WHO and local laboratory guidelines. Demonstrable values in this development environment illustrate operational testing workflows and verification checkpoints.
        </div>
      </div>

      {/* Standard Quality Parameters Grid */}
      <div className="card shadow-sm mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <TestTube size={17} /> Standard Quality Control Parameters
        </div>
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>Test Parameter</th>
                <th>Standard Parameter</th>
                <th>Measurement Unit</th>
                <th>Acceptable Range</th>
                <th>Requirement</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className="fw-bold text-primary small">{t.test_name}</span>
                  </td>
                  <td className="small text-secondary">{t.parameter}</td>
                  <td className="small font-monospace">{t.unit}</td>
                  <td className="small font-monospace fw-bold text-dark">
                    {t.min_acceptable !== null ? `${t.min_acceptable} - ${t.max_acceptable} ${t.unit}` : `0.00 ${t.unit}`}
                  </td>
                  <td>
                    {t.is_required ? (
                      <span className="badge badge-cancelled">Mandatory for Stock Release</span>
                    ) : (
                      <span className="badge bg-light text-muted border">Optional</span>
                    )}
                  </td>
                  <td className="small text-muted" style={{ maxWidth: '300px' }}>
                    {t.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Test Modal */}
      {showRecordModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Record Batch Quality Test</h5>
                <button type="button" className="btn-close" onClick={() => setShowRecordModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Target Production Batch *</label>
                    <select
                      className="form-select"
                      value={formData.batch_id}
                      onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                      required
                    >
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.batch_number} ({b.production_date}) — {b.approval_status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Quality Test Parameter *</label>
                    <select
                      className="form-select"
                      value={formData.quality_test_id}
                      onChange={(e) => setFormData({ ...formData, quality_test_id: e.target.value })}
                      required
                    >
                      {tests.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.test_name} (Acceptable: {t.min_acceptable} - {t.max_acceptable} {t.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Measured Laboratory Value *</label>
                      <input
                        type="text"
                        className="form-control font-monospace fw-bold"
                        placeholder="e.g. 7.4 or 135"
                        value={formData.measured_value}
                        onChange={(e) => setFormData({ ...formData, measured_value: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Verification Result *</label>
                      <select
                        className="form-select"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        required
                      >
                        <option value="pass">PASS (Within Spec)</option>
                        <option value="fail">FAIL (Out of Spec)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Laboratory Reference / Sample Tag</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.laboratory_reference}
                      onChange={(e) => setFormData({ ...formData, laboratory_reference: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label small fw-semibold">Tester Remarks</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowRecordModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Log QC Record'}
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
