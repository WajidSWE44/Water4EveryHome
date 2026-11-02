// frontend/src/pages/customer/Products.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { ShoppingBag, Check, AlertCircle, Info, Filter } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState('all');
  const [quantities, setQuantities] = useState({});
  const [addedItem, setAddedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.getProducts(),
          api.getCategories()
        ]);
        if (prodRes.success) {
          setProducts(prodRes.data);
          const initialQty = {};
          prodRes.data.forEach(p => {
            initialQty[p.id] = 1;
          });
          setQuantities(initialQty);
        }
        if (catRes.success) {
          setCategories(catRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const handleQtyChange = (productId, delta) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const updated = Math.max(1, current + delta);
      return { ...prev, [productId]: updated };
    });
  };

  const handleAddToCart = (product) => {
    const qty = quantities[product.id] || 1;
    addToCart(product, qty);
    setAddedItem(product.id);
    setTimeout(() => setAddedItem(null), 2000);
  };

  const filteredProducts = selectedCat === 'all'
    ? products
    : products.filter(p => p.category_id.toString() === selectedCat);

  return (
    <div className="container py-4">
      {/* Header & Filter */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">Drinking Water & Accessories</h4>
          <p className="text-muted small mb-0">Certified multi-stage purified bottled water and dispensing equipment.</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Filter size={16} className="text-secondary" />
          <span className="small fw-semibold text-secondary">Filter:</span>
          <select
            className="form-select form-select-sm w-auto"
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5 text-muted small">Loading catalogue...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="alert alert-light border text-center py-4">No products available in this category.</div>
      ) : (
        <div className="row g-4">
          {filteredProducts.map(product => {
            const isOutOfStock = product.available_quantity <= 0;
            const currentQty = quantities[product.id] || 1;

            return (
              <div key={product.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body p-4 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-light text-primary border font-monospace">
                        {product.volume_label}
                      </span>
                      <div className="d-flex gap-1">
                        {product.is_reusable ? (
                          <span className="badge badge-confirmed">Reusable QR Bottle</span>
                        ) : (
                          <span className="badge bg-light text-secondary border">{product.packaging_type}</span>
                        )}
                      </div>
                    </div>

                    <h5 className="fw-bold text-primary mb-1">{product.name}</h5>
                    <p className="text-muted small mb-3 flex-grow-1">
                      {product.description}
                    </p>

                    {/* Stock status indicator */}
                    <div className="mb-3">
                      {isOutOfStock ? (
                        <span className="badge badge-cancelled d-inline-flex align-items-center gap-1">
                          <AlertCircle size={12} /> Out of Stock (0 Available)
                        </span>
                      ) : (
                        <div className="d-flex align-items-center gap-2 small text-muted">
                          <span className="badge badge-approved">In Stock</span>
                          <span className="text-xs">({product.available_quantity} available in warehouse)</span>
                        </div>
                      )}
                    </div>

                    {/* Pricing box */}
                    <div className="bg-light p-3 rounded-1 border mb-3" style={{ borderColor: 'var(--neutral)' }}>
                      <div className="d-flex justify-content-between align-items-baseline">
                        <span className="text-muted small">Unit Price:</span>
                        <span className="fs-5 fw-bold text-primary">Rs. {parseFloat(product.unit_price).toFixed(2)}</span>
                      </div>

                      {parseFloat(product.refundable_deposit) > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-1 pt-1 border-top text-xs text-secondary">
                          <span className="d-flex align-items-center gap-1" title="Deposit is fully refunded upon returning undamaged empty bottle">
                            <Info size={12} /> Refundable Bottle Deposit:
                          </span>
                          <span className="fw-semibold">Rs. {parseFloat(product.refundable_deposit).toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector & Add Button */}
                    <div className="d-flex align-items-center gap-2 mt-auto">
                      <div className="input-group input-group-sm" style={{ width: '110px' }}>
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => handleQtyChange(product.id, -1)}
                          disabled={isOutOfStock || currentQty <= 1}
                        >
                          -
                        </button>
                        <input
                          type="text"
                          className="form-control text-center fw-semibold"
                          value={currentQty}
                          readOnly
                        />
                        <button
                          className="btn btn-outline-secondary"
                          type="button"
                          onClick={() => handleQtyChange(product.id, 1)}
                          disabled={isOutOfStock || currentQty >= product.available_quantity}
                        >
                          +
                        </button>
                      </div>

                      <button
                        className={`btn btn-sm w-100 d-flex align-items-center justify-content-center gap-2 ${
                          addedItem === product.id ? 'btn-success' : 'btn-primary'
                        }`}
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                      >
                        {addedItem === product.id ? (
                          <>
                            <Check size={16} /> Added!
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={16} /> Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
