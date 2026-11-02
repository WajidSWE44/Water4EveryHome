// frontend/src/components/Footer.jsx
import React from 'react';
import { Droplet, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-top mt-auto py-5" style={{ borderColor: 'var(--neutral)' }}>
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="bg-primary text-white p-1 rounded d-flex align-items-center justify-content-center" style={{ width: '26px', height: '26px' }}>
                <Droplet size={16} />
              </div>
              <span className="fw-bold fs-5 text-primary">Water 4 Every Home</span>
            </div>
            <p className="text-muted small mb-3">
              Certified drinking-water refilling and purification plant. Dedicated fleet supplying premium purified mineral water across homes, corporations, and community venues.
            </p>
            <div className="d-flex flex-column gap-1 small text-secondary">
              <span className="d-flex align-items-center gap-2">
                <CheckCircle size={14} className="text-success" /> WHO Guideline Drinking Standards
              </span>
              <span className="d-flex align-items-center gap-2">
                <CheckCircle size={14} className="text-success" /> Multi-Stage Reverse Osmosis & UV Sanitization
              </span>
              <span className="d-flex align-items-center gap-2">
                <CheckCircle size={14} className="text-success" /> QR-Tracked Food-Grade Reusable 19L Bottles
              </span>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
              Service Coverage (Lahore)
            </h6>
            <ul className="list-unstyled small text-muted d-flex flex-column gap-2 mb-0">
              <li>• Gulberg (I, II, III & Industrial Area)</li>
              <li>• DHA Lahore (Phases 1 through 6)</li>
              <li>• Model Town & Garden Town</li>
              <li>• Bahria Town (Sectors A-F)</li>
              <li>• Lahore Cantt & Cavalry Ground</li>
              <li>• Johar Town & Faisal Town</li>
            </ul>
          </div>

          <div className="col-lg-2 col-md-6">
            <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
              Quick Links
            </h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 mb-0">
              <li><a href="/products" className="text-decoration-none text-secondary">Bottled Water Sizes</a></li>
              <li><a href="/subscriptions" className="text-decoration-none text-secondary">Weekly Refill Plans</a></li>
              <li><a href="/events" className="text-decoration-none text-secondary">Bulk Event Supply</a></li>
              <li><a href="/bottle-returns" className="text-decoration-none text-secondary">Bottle Return Policy</a></li>
              <li><a href="/login" className="text-decoration-none text-secondary">Customer Portal</a></li>
            </ul>
          </div>

          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold text-primary mb-3 text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
              Plant & Contact
            </h6>
            <div className="small text-muted d-flex flex-column gap-2">
              <div className="d-flex align-items-start gap-2">
                <MapPin size={16} className="text-primary mt-1 flex-shrink-0" />
                <span>Gulberg Industrial Estate, Plot 14-B, Water Plant Bay, Lahore</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Phone size={15} className="text-primary flex-shrink-0" />
                <span>UAN: (042) 111-943-400</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Mail size={15} className="text-primary flex-shrink-0" />
                <span>orders@w4eh.com</span>
              </div>
              <div className="mt-2 text-xs text-secondary">
                Operating Hours: Mon - Sat 08:00 AM - 08:00 PM
              </div>
            </div>
          </div>
        </div>

        <div className="border-top pt-4 mt-4 d-flex flex-column flex-sm-row justify-content-between align-items-center text-muted small" style={{ borderColor: 'var(--neutral)' }}>
          <div>&copy; {new Date().getFullYear()} Water 4 Every Home (W4EH). All rights reserved.</div>
          <div className="d-flex gap-3 mt-2 mt-sm-0">
            <span>Water Plant License: LHR-WP-2026</span>
            <span>Laboratory Tested Daily</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
