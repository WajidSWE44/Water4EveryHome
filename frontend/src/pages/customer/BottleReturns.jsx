// frontend/src/pages/customer/BottleReturns.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Truck, CheckCircle2, RotateCcw, AlertCircle, Info } from 'lucide-react';

export default function BottleReturns() {
  const [returnCount, setReturnCount] = useState(2);
  const [addressNote, setAddressNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="container py-4">
      <div className="border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <h4 className="fw-bold text-primary mb-1">Reusable Bottle Returns & Inspection</h4>
        <p className="text-muted small mb-0">Return empty 19-litre polycarbonate bottles for sanitization, refilling, or deposit refund.</p>
      </div>

      <div className="row g-4">
        {/* Step-by-Step Bottle Lifecycle Graphic */}
        <div className="col-lg-7">
          <div className="card shadow-sm p-4 mb-4">
            <h6 className="fw-bold text-primary mb-3">The 8-Stage Reusable Bottle Lifecycle (SRS FR-07)</h6>
            
            <div className="d-flex flex-column gap-3 small">
              <div className="d-flex align-items-start gap-3 p-2 bg-light rounded border">
                <div className="p-2 bg-primary text-white rounded flex-shrink-0">
                  <Truck size={18} />
                </div>
                <div>
                  <div className="fw-bold text-primary">1. Collection & QR Scan</div>
                  <div className="text-secondary">When our delivery fleet delivers refills or comes for collection, the rider inspects and scans the bottle's unique QR code.</div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 p-2 bg-light rounded border">
                <div className="p-2 bg-secondary text-white rounded flex-shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div>
                  <div className="fw-bold text-primary">2. Intake & Optical Inspection</div>
                  <div className="text-secondary">At the plant intake dock, operations staff inspect each bottle for hairline cracks, interior residue, or valve defects.</div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 p-2 bg-light rounded border">
                <div className="p-2 bg-success text-white rounded flex-shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div className="fw-bold text-primary">3. 4-Stage Washing & UV Sanitization</div>
                  <div className="text-secondary">Bottles undergo hot caustic wash, RO water rinse, ozone disinfection, and UV tunnel treatment before refill.</div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3 p-2 bg-light rounded border">
                <div className="p-2 bg-info text-white rounded flex-shrink-0">
                  <QrCode size={18} />
                </div>
                <div>
                  <div className="fw-bold text-primary">4. Batch Refill & Quality Approval</div>
                  <div className="text-secondary">Bottles are refilled with tested water, hermetically sealed, tagged with production batch numbers, and re-stocked.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Empty Return Form */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4">
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">Request Empty Bottle Collection</h6>

            {submitted ? (
              <div className="alert alert-success py-3 text-center">
                <CheckCircle2 size={24} className="text-success mb-2" />
                <h6 className="fw-bold mb-1">Return Pickup Scheduled!</h6>
                <p className="small mb-3">
                  Our dispatch fleet will collect {returnCount} bottle(s) during the next route run to your approved address.
                </p>
                <button className="btn btn-outline-primary btn-sm" onClick={() => setSubmitted(false)}>
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Number of Empty 19L Bottles</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    max={20}
                    value={returnCount}
                    onChange={(e) => setReturnCount(e.target.value)}
                    required
                  />
                  <div className="form-text text-xs">Standard deposit refund: Rs. 600 per undamaged bottle.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Pickup Location Notes / Guard Desk</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Bottles are placed at main gate with security"
                    value={addressNote}
                    onChange={(e) => setAddressNote(e.target.value)}
                  />
                </div>

                <div className="alert alert-light border small text-muted mb-3 d-flex align-items-start gap-2">
                  <Info size={16} className="text-secondary flex-shrink-0 mt-1" />
                  <span>
                    You can also hand over empty bottles directly to the rider whenever a replenishment order is delivered without filing this form.
                  </span>
                </div>

                <button type="submit" className="btn btn-primary w-100 py-2">
                  Schedule Bottle Collection
                </button>
              </form>
            )}

            <div className="border-top pt-3 mt-3 text-center">
              <Link to="/deposits" className="small text-decoration-none text-secondary">
                View your outstanding deposit balance &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
