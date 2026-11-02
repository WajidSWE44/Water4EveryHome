// frontend/src/pages/admin/Staff.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Plus, CheckCircle, AlertCircle, Shield, Truck, Phone, Mail } from 'lucide-react';

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role_id: 5, // default to delivery
    department: 'Logistics & Delivery',
    vehicle_number: 'LHR-7721 (Suzuki Carry)',
    password: 'password123'
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.getStaff(),
        api.getStaffRoles()
      ]);
      if (staffRes.success) setStaff(staffRes.data);
      if (rolesRes.success) setRoles(rolesRes.data);
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
      const res = await api.createStaff({
        ...formData,
        role_id: parseInt(formData.role_id, 10)
      });

      if (res.success) {
        setMessage(`Staff account ${formData.name} created successfully (${res.data.employee_id}).`);
        setShowAddModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to create staff member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Staff Accounts & Delivery Fleet Members</h4>
          <span className="text-muted text-xs">Manage role-based employee access across logistics, plant operations, and finance (SRS FR-01).</span>
        </div>

        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> New Staff Member
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

      <div className="card shadow-sm">
        {loading ? (
          <div className="text-center py-5 text-muted small">Loading staff records...</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Full Name</th>
                  <th>Contact Info</th>
                  <th>Department</th>
                  <th>Fleet Vehicle</th>
                  <th>Role(s)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td>
                      <span className="fw-bold text-primary font-monospace small">
                        {s.employee_id || `EMP-${s.id}`}
                      </span>
                    </td>
                    <td>
                      <div className="fw-semibold small text-dark">{s.name}</div>
                    </td>
                    <td>
                      <div className="small d-flex align-items-center gap-1">
                        <Phone size={12} className="text-primary" /> {s.phone}
                      </div>
                      {s.email && (
                        <div className="text-muted text-xs d-flex align-items-center gap-1">
                          <Mail size={12} /> {s.email}
                        </div>
                      )}
                    </td>
                    <td className="small text-secondary">{s.department || 'Operations'}</td>
                    <td>
                      {s.vehicle_number ? (
                        <span className="badge bg-light text-primary border font-monospace">
                          <Truck size={12} className="me-1" />
                          {s.vehicle_number}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-primary text-white font-monospace text-xs">
                        {s.role_names}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-approved text-capitalize">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Add Staff / Fleet Member</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Staff Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Asad Mahmood"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 03009988776"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Email (Optional)</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="e.g. asad@w4eh.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">System Role *</label>
                      <select
                        className="form-select"
                        value={formData.role_id}
                        onChange={(e) => {
                          const rid = parseInt(e.target.value, 10);
                          let dept = 'Logistics & Delivery';
                          if (rid === 2) dept = 'Administration';
                          if (rid === 3) dept = 'Water Plant Operations & QC';
                          if (rid === 4) dept = 'Finance & Accounts';
                          setFormData({ ...formData, role_id: rid, department: dept });
                        }}
                      >
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.display_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Department</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Assigned Fleet Vehicle (if delivery rider)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. LHR-9921 (Suzuki Carry Van)"
                      value={formData.vehicle_number}
                      onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Temporary Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Account'}
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
