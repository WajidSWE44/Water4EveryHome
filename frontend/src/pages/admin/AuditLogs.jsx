// frontend/src/pages/admin/AuditLogs.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { FileText, Search, Filter, Eye, ShieldAlert, Clock, RefreshCw } from 'lucide-react';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('all');
  
  // Inspection modal
  const [selectedLog, setSelectedLog] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.success) {
        setLogs(res.data);
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

  // Filter options
  const entityTypes = ['all', ...Array.from(new Set(logs.map(l => l.entity_type).filter(Boolean)))];

  const filteredLogs = logs.filter(l => {
    const matchEntity = selectedEntity === 'all' || l.entity_type === selectedEntity;
    const q = search.toLowerCase();
    const matchSearch = (l.action && l.action.toLowerCase().includes(q)) ||
                        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
                        (l.user_email && l.user_email.toLowerCase().includes(q)) ||
                        (l.entity_type && l.entity_type.toLowerCase().includes(q)) ||
                        (l.ip_address && l.ip_address.includes(q));
    return matchEntity && matchSearch;
  });

  const getActionBadgeClass = (action) => {
    if (action.includes('create') || action.includes('store') || action.includes('add')) return 'bg-success text-white';
    if (action.includes('update') || action.includes('adjust') || action.includes('confirm')) return 'bg-primary text-white';
    if (action.includes('delete') || action.includes('reject') || action.includes('cancel')) return 'bg-danger text-white';
    if (action.includes('refund')) return 'bg-warning text-dark';
    return 'bg-secondary text-white';
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">System Security Audit Trail</h4>
          <span className="text-muted text-xs">Immutable operational transaction and administrative change logs (SRS FR-15 / Security).</span>
        </div>
        <button onClick={loadData} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
          <RefreshCw size={14} /> Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-custom p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search audit trail by operator, action, entity, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Filter size={16} className="text-muted" />
              </span>
              <select
                className="form-select border-start-0"
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
              >
                {entityTypes.map(e => (
                  <option key={e} value={e}>
                    {e === 'all' ? 'All Entities' : e.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-12 col-md-2 text-md-end text-muted small">
            Showing {filteredLogs.length} of {logs.length}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card-custom p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 font-monospace text-xs">
            <thead>
              <tr className="font-sans">
                <th className="ps-3">Timestamp</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Entity Affected</th>
                <th>IP Address</th>
                <th className="pe-3 text-end">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted font-sans">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(l => (
                  <tr key={l.id}>
                    <td className="ps-3 text-muted">
                      {l.created_at ? new Date(l.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{l.user_name || 'System / Guest'}</div>
                      <div className="text-muted text-xxs">{l.user_email || 'automated'}</div>
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(l.action)} font-monospace text-xxs`}>
                        {l.action}
                      </span>
                    </td>
                    <td>
                      <span className="fw-medium text-primary">
                        {l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}
                      </span>
                    </td>
                    <td className="text-muted">
                      {l.ip_address || '127.0.0.1'}
                    </td>
                    <td className="pe-3 text-end">
                      <button
                        onClick={() => setSelectedLog(l)}
                        className="btn btn-outline-secondary btn-xs py-1 px-2 font-sans d-inline-flex align-items-center gap-1"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-primary">
                  Audit Record #{selectedLog.id}
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedLog(null)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <span className="text-muted text-xs">ACTION:</span>
                    <div className="fw-bold">{selectedLog.action}</div>
                  </div>
                  <div className="col-6">
                    <span className="text-muted text-xs">TIMESTAMP:</span>
                    <div className="fw-medium">{new Date(selectedLog.created_at).toLocaleString()}</div>
                  </div>
                  <div className="col-6">
                    <span className="text-muted text-xs">OPERATOR:</span>
                    <div>{selectedLog.user_name} ({selectedLog.user_email})</div>
                  </div>
                  <div className="col-6">
                    <span className="text-muted text-xs">ENTITY:</span>
                    <div>{selectedLog.entity_type} (ID: {selectedLog.entity_id})</div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-xs fw-semibold">Old Values (Previous State)</label>
                  <pre className="bg-light p-3 rounded border font-monospace text-xs overflow-auto" style={{ maxHeight: '150px' }}>
                    {selectedLog.old_values ? JSON.stringify(JSON.parse(selectedLog.old_values), null, 2) : 'null'}
                  </pre>
                </div>

                <div>
                  <label className="form-label text-xs fw-semibold">New Values (Changes Applied)</label>
                  <pre className="bg-light p-3 rounded border font-monospace text-xs overflow-auto" style={{ maxHeight: '200px' }}>
                    {selectedLog.new_values ? JSON.stringify(JSON.parse(selectedLog.new_values), null, 2) : 'null'}
                  </pre>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
