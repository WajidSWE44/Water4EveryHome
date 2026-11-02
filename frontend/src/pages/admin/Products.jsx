// frontend/src/pages/admin/Products.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Package, Plus, Search, Filter, Edit, Power, CheckCircle, AlertCircle, X, ShieldAlert } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form State
  const initialForm = {
    name: '',
    category_id: '',
    volume_ml: 19000,
    volume_label: '19 Liters',
    packaging_type: '19L Polycarbonate Reusable Bottle',
    unit_price: 250,
    refundable_deposit: 600,
    is_reusable: 1,
    is_active: 1,
    description: '',
    initial_stock: 50,
    reorder_threshold: 30
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts(true), // all=true to see inactive products as well
        api.getCategories()
      ]);
      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !formData.category_id) {
          setFormData(prev => ({ ...prev, category_id: catRes.data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      ...initialForm,
      category_id: categories.length > 0 ? categories[0].id : ''
    });
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category_id: p.category_id,
      volume_ml: p.volume_ml,
      volume_label: p.volume_label,
      packaging_type: p.packaging_type,
      unit_price: p.unit_price,
      refundable_deposit: p.refundable_deposit || 0,
      is_reusable: p.is_reusable ? 1 : 0,
      is_active: p.is_active ? 1 : 0,
      description: p.description || '',
      initial_stock: p.quantity_on_hand || 0,
      reorder_threshold: p.reorder_threshold || 50
    });
    setError('');
    setShowModal(true);
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await api.toggleProduct(id);
      if (res.success) {
        setMessage('Product visibility toggled successfully.');
        loadData();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to toggle status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (editingProduct) {
        const res = await api.updateProduct(editingProduct.id, {
          ...formData,
          unit_price: parseFloat(formData.unit_price),
          refundable_deposit: parseFloat(formData.refundable_deposit),
          volume_ml: parseInt(formData.volume_ml, 10),
          category_id: parseInt(formData.category_id, 10)
        });
        if (res.success) {
          setMessage('Product updated successfully.');
          setShowModal(false);
          loadData();
        }
      } else {
        const res = await api.createProduct({
          ...formData,
          unit_price: parseFloat(formData.unit_price),
          refundable_deposit: parseFloat(formData.refundable_deposit),
          volume_ml: parseInt(formData.volume_ml, 10),
          category_id: parseInt(formData.category_id, 10),
          initial_stock: parseInt(formData.initial_stock, 10),
          reorder_threshold: parseInt(formData.reorder_threshold, 10)
        });
        if (res.success) {
          setMessage('Product created successfully with initial stock balance.');
          setShowModal(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered list
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category_id.toString() === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        (p.volume_label && p.volume_label.toLowerCase().includes(search.toLowerCase())) ||
                        (p.packaging_type && p.packaging_type.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Product Catalog & Pricing</h4>
          <span className="text-muted text-xs">Configure water sizes, unit pricing, refundable bottle deposits, and packaging types (SRS FR-03, FR-04).</span>
        </div>
        <button onClick={handleOpenAdd} className="btn btn-primary d-flex align-items-center gap-2">
          <Plus size={16} /> Add New Product
        </button>
      </div>

      {message && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && !showModal && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}

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
                placeholder="Search by product name, volume, or packaging..."
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-12 col-md-2 text-md-end text-muted small">
            Showing {filteredProducts.length} of {products.length}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card-custom p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th className="ps-3">Product Details</th>
                <th>Category</th>
                <th>Volume / Size</th>
                <th>Unit Price</th>
                <th>Refundable Deposit</th>
                <th>Inventory Stock</th>
                <th>Status</th>
                <th className="pe-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td className="ps-3">
                      <div className="fw-semibold text-primary">{p.name}</div>
                      <div className="text-muted text-xs">{p.packaging_type}</div>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {p.category_name}
                      </span>
                    </td>
                    <td>
                      <span className="fw-medium">{p.volume_label}</span>
                      <span className="text-muted text-xs ms-1">({p.volume_ml} ml)</span>
                    </td>
                    <td>
                      <span className="fw-bold text-dark">Rs. {parseFloat(p.unit_price).toLocaleString()}</span>
                    </td>
                    <td>
                      {p.is_reusable && parseFloat(p.refundable_deposit) > 0 ? (
                        <span className="badge bg-warning text-dark border">
                          Rs. {parseFloat(p.refundable_deposit).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">No Deposit</span>
                      )}
                    </td>
                    <td>
                      <div>
                        <span className={`fw-bold ${p.available_quantity < p.reorder_threshold ? 'text-danger' : 'text-success'}`}>
                          {p.available_quantity} Avail
                        </span>
                        <div className="text-muted text-xs">
                          {p.quantity_on_hand} on hand ({p.quantity_reserved} res)
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={p.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td className="pe-3 text-end">
                      <div className="btn-group btn-group-sm">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-outline-secondary"
                          title="Edit Product"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p.id)}
                          className={`btn ${p.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          title={p.is_active ? 'Deactivate Product' : 'Activate Product'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-primary">
                  {editingProduct ? 'Edit Product Details' : 'Add New Water Product'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger py-2 mb-3 d-flex align-items-center gap-2">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-12 col-md-8">
                      <label className="form-label text-xs fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. 19L Refill Polycarbonate Bottle"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Category *</label>
                      <select
                        className="form-select"
                        required
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Volume (ml) *</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min="100"
                        step="50"
                        value={formData.volume_ml}
                        onChange={(e) => setFormData({ ...formData, volume_ml: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Volume Label *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. 19 Liters, 500ml x 12"
                        value={formData.volume_label}
                        onChange={(e) => setFormData({ ...formData, volume_label: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Packaging Type *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Polycarbonate Bottle, PET Pack"
                        value={formData.packaging_type}
                        onChange={(e) => setFormData({ ...formData, packaging_type: e.target.value })}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Unit Water Price (PKR) *</label>
                      <div className="input-group">
                        <span className="input-group-text">Rs.</span>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="0"
                          step="1"
                          value={formData.unit_price}
                          onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label text-xs fw-semibold">Refundable Bottle Deposit (PKR)</label>
                      <div className="input-group">
                        <span className="input-group-text">Rs.</span>
                        <input
                          type="number"
                          className="form-control"
                          min="0"
                          step="1"
                          value={formData.refundable_deposit}
                          onChange={(e) => setFormData({ ...formData, refundable_deposit: e.target.value })}
                        />
                      </div>
                      <span className="text-muted text-xs">Charged on new bottle purchase; refunded on return.</span>
                    </div>

                    <div className="col-12 col-md-4 d-flex align-items-center">
                      <div className="form-check mt-3">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="isReusableCheck"
                          checked={formData.is_reusable === 1}
                          onChange={(e) => setFormData({ ...formData, is_reusable: e.target.checked ? 1 : 0 })}
                        />
                        <label className="form-check-label text-xs fw-semibold" htmlFor="isReusableCheck">
                          Reusable / Returnable Bottle
                        </label>
                      </div>
                    </div>

                    {!editingProduct && (
                      <>
                        <div className="col-12 col-md-6">
                          <label className="form-label text-xs fw-semibold">Initial Stock (Warehouse)</label>
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            value={formData.initial_stock}
                            onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label text-xs fw-semibold">Reorder Alert Threshold</label>
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            value={formData.reorder_threshold}
                            onChange={(e) => setFormData({ ...formData, reorder_threshold: e.target.value })}
                          />
                        </div>
                      </>
                    )}

                    <div className="col-12">
                      <label className="form-label text-xs fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Purified through 7-stage RO and mineralization..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
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
