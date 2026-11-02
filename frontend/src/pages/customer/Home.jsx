// frontend/src/pages/customer/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Droplet, CheckCircle, Truck, Repeat, QrCode, Shield, MapPin, ArrowRight } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [serviceAreas, setServiceAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');
  const [areaStatus, setAreaStatus] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const prodRes = await api.getProducts();
        if (prodRes.success) setProducts(prodRes.data.slice(0, 4));

        const areaRes = await api.getServiceAreas();
        if (areaRes.success) setServiceAreas(areaRes.data);
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const checkCoverage = () => {
    if (!selectedArea) {
      setAreaStatus(null);
      return;
    }
    const found = serviceAreas.find(a => a.id.toString() === selectedArea);
    if (found) {
      setAreaStatus({ covered: true, name: found.name, fee: found.delivery_fee });
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-bottom py-5" style={{ borderColor: 'var(--neutral)' }}>
        <div className="container py-md-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <div className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded bg-light border text-primary small fw-semibold mb-3">
                <Droplet size={14} className="text-primary" />
                <span>Own Certified Purification Plant & Refilling Facility</span>
              </div>
              <h1 className="display-6 fw-bold text-primary mb-3">
                Pure, Mineral-Balanced Drinking Water Delivered to Your Doorstep.
              </h1>
              <p className="lead text-secondary fs-6 mb-4" style={{ maxWidth: '600px' }}>
                Water 4 Every Home provides certified multi-stage purified water for families, offices, and events across Lahore. Enjoy on-demand orders or automated weekly delivery subscriptions with QR-tracked food-grade 19L reusable bottles.
              </p>
              
              <div className="d-flex flex-wrap gap-2 mb-4">
                <Link to="/products" className="btn btn-primary d-inline-flex align-items-center gap-2 px-4 py-2">
                  <span>Browse Products & Order</span>
                  <ArrowRight size={16} />
                </Link>
                <Link to="/subscriptions" className="btn btn-outline-primary d-inline-flex align-items-center gap-2 px-3 py-2">
                  <Repeat size={16} />
                  <span>Setup Weekly Subscription</span>
                </Link>
              </div>

              <div className="d-flex flex-wrap gap-4 text-muted small pt-2 border-top" style={{ borderColor: 'var(--neutral)' }}>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={15} className="text-success" /> WHO Guideline Compliant
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={15} className="text-success" /> Daily In-House Lab Testing
                </span>
                <span className="d-flex align-items-center gap-1">
                  <CheckCircle size={15} className="text-success" /> Refundable Bottle Deposit
                </span>
              </div>
            </div>

            <div className="col-lg-5">
              {/* Service Area Check Card */}
              <div className="card shadow-sm p-3">
                <div className="card-header bg-white border-0 px-2 pt-2">
                  <div className="d-flex align-items-center gap-2 text-primary fw-bold">
                    <MapPin size={18} />
                    <span>Check Service Delivery Coverage</span>
                  </div>
                  <p className="text-muted small mb-0 mt-1">
                    Verify if your neighborhood is within our direct plant delivery fleet radius.
                  </p>
                </div>
                <div className="card-body px-2">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Select Your Area in Lahore:</label>
                    <select
                      className="form-select"
                      value={selectedArea}
                      onChange={(e) => {
                        setSelectedArea(e.target.value);
                        setAreaStatus(null);
                      }}
                    >
                      <option value="">-- Choose neighborhood / sector --</option>
                      {serviceAreas.map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.city})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary w-100 py-2 small fw-semibold"
                    onClick={checkCoverage}
                    disabled={!selectedArea}
                  >
                    Check Coverage
                  </button>

                  {areaStatus && (
                    <div className="alert alert-success mt-3 py-2 px-3 small mb-0 d-flex align-items-start gap-2">
                      <CheckCircle size={16} className="text-success mt-1 flex-shrink-0" />
                      <div>
                        <strong>Active Delivery Coverage!</strong>
                        <div>We deliver to {areaStatus.name}. Standard delivery fee: Rs. {parseFloat(areaStatus.fee).toFixed(2)}.</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-5">
        <div className="container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <span className="text-uppercase text-secondary fw-bold text-xs" style={{ letterSpacing: '0.05em' }}>
                Bottling Facility Sizes
              </span>
              <h3 className="fw-bold text-primary mb-0">Pure Water Selection</h3>
            </div>
            <Link to="/products" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
              View All Sizes <ArrowRight size={14} />
            </Link>
          </div>

          <div className="row g-3">
            {products.map(p => (
              <div key={p.id} className="col-12 col-sm-6 col-lg-3">
                <div className="card h-100">
                  <div className="card-body p-3 d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="badge bg-light text-primary border font-monospace">
                        {p.volume_label}
                      </span>
                      {p.is_reusable ? (
                        <span className="badge badge-confirmed">Reusable (19L)</span>
                      ) : (
                        <span className="badge bg-light text-muted border">{p.packaging_type}</span>
                      )}
                    </div>

                    <h6 className="fw-bold text-primary mb-1">{p.name}</h6>
                    <p className="text-muted small flex-grow-1 mb-3" style={{ fontSize: '0.82rem' }}>
                      {p.description}
                    </p>

                    <div className="border-top pt-2 mt-auto">
                      <div className="d-flex justify-content-between align-items-baseline mb-2">
                        <span className="fs-5 fw-bold text-primary">Rs. {parseFloat(p.unit_price).toFixed(2)}</span>
                        {parseFloat(p.refundable_deposit) > 0 && (
                          <span className="text-muted text-xs">
                            +Rs. {parseFloat(p.refundable_deposit).toFixed(0)} deposit
                          </span>
                        )}
                      </div>
                      <Link to={`/products`} className="btn btn-sm btn-outline-primary w-100">
                        View & Order
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Highlights */}
      <section className="bg-white border-top border-bottom py-5" style={{ borderColor: 'var(--neutral)' }}>
        <div className="container">
          <div className="text-center mb-5" style={{ maxWidth: '650px', margin: '0 auto' }}>
            <span className="text-uppercase text-secondary fw-bold text-xs" style={{ letterSpacing: '0.05em' }}>
              Operational Standard
            </span>
            <h3 className="fw-bold text-primary mt-1">A Reliable, Closed-Loop Water Supply</h3>
            <p className="text-muted small">
              From our dedicated aquifer borehole to automated 4-stage bottle sanitization, we ensure quality control and traceable inventory at every step.
            </p>
          </div>

          <div className="row g-4 text-start">
            <div className="col-md-4">
              <div className="stat-card h-100">
                <div className="d-inline-flex p-2 rounded bg-light text-primary mb-3">
                  <Shield size={20} />
                </div>
                <h6 className="fw-bold text-primary mb-2">1. Strict Plant Quality Control</h6>
                <p className="text-muted small mb-0">
                  Every production batch is tested for pH, TDS, turbidity, free chlorine, and microbial safety. Batches cannot enter inventory without authorized QC approval.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="stat-card h-100">
                <div className="d-inline-flex p-2 rounded bg-light text-primary mb-3">
                  <QrCode size={20} />
                </div>
                <h6 className="fw-bold text-primary mb-2">2. QR-Coded Bottle Lifecycle</h6>
                <p className="text-muted small mb-0">
                  Each 19L reusable bottle carries a unique serial number and QR code. Tracking lifecycle from refilling to customer doorstep and empty return inspection.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="stat-card h-100">
                <div className="d-inline-flex p-2 rounded bg-light text-primary mb-3">
                  <Truck size={20} />
                </div>
                <h6 className="fw-bold text-primary mb-2">3. Fleet Doorstep Logistics</h6>
                <p className="text-muted small mb-0">
                  Assigned riders deliver to approved customer addresses on scheduled time slots. Return empty bottles easily upon delivery with immediate ledger credit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
