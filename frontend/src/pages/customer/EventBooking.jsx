// frontend/src/pages/customer/EventBooking.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, Plus, CheckCircle, AlertCircle, Clock, MapPin, Users, Droplet } from 'lucide-react';

export default function EventBooking() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    event_name: '',
    event_type: 'corporate',
    event_date: '',
    location_address: '',
    expected_guests: 100,
    requested_water_quantity: '20x 19L Reusable Bottles + 200x 500ml Small Bottles',
    notes: ''
  });

  const loadEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res.success) setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.createEvent(formData);
      if (res.success) {
        setSuccess('Bulk event supply inquiry submitted! An operations officer will review and quote your request.');
        setShowModal(false);
        loadEvents();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = async (id) => {
    try {
      const res = await api.acceptEventQuote(id);
      if (res.success) {
        setSuccess('Quotation accepted! Administrator will convert to an official order.');
        loadEvents();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-1">Bulk & Event Water Supply</h4>
          <p className="text-muted small mb-0">Custom water logistics for weddings, seminars, corporate events, and large gatherings.</p>
        </div>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Request Event Quote
        </button>
      </div>

      {success && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-success flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted small">Loading event requests...</div>
      ) : events.length === 0 ? (
        <div className="card shadow-sm text-center p-5">
          <div className="d-inline-flex p-3 rounded-circle bg-light text-muted mx-auto mb-3">
            <Calendar size={28} />
          </div>
          <h6 className="fw-bold text-primary">No Event Bookings Found</h6>
          <p className="text-muted small mb-3">Planning a wedding or corporate conference? Request bulk purified water with on-site dispenser setups.</p>
          <button className="btn btn-primary btn-sm mx-auto" onClick={() => setShowModal(true)}>
            Request Event Supply Quote
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {events.map(ev => (
            <div key={ev.id} className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                  <div>
                    <span className="fw-bold text-primary font-monospace">{ev.booking_code}</span>
                    <span className="badge bg-light text-primary border text-uppercase ms-2">
                      {ev.event_type}
                    </span>
                  </div>
                  <StatusBadge status={ev.status} />
                </div>

                <h5 className="fw-bold text-dark fs-6 mb-1">{ev.event_name}</h5>

                <div className="small text-secondary mb-3 d-flex flex-column gap-1">
                  <div className="d-flex align-items-center gap-1">
                    <Clock size={13} className="text-primary" /> Event Date: <strong>{ev.event_date}</strong>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <Users size={13} className="text-primary" /> Expected Guests: {ev.expected_guests}
                  </div>
                  <div className="d-flex align-items-start gap-1">
                    <MapPin size={13} className="text-primary mt-1 flex-shrink-0" />
                    <span>Venue: {ev.location_address}</span>
                  </div>
                  <div className="d-flex align-items-start gap-1 mt-1">
                    <Droplet size={13} className="text-primary mt-1 flex-shrink-0" />
                    <span><strong>Requested Supply:</strong> {ev.requested_water_quantity}</span>
                  </div>
                </div>

                {ev.quoted_amount && (
                  <div className="bg-light p-2 rounded border mb-2 d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Admin Quotation:</span>
                    <span className="fs-6 fw-bold text-primary">Rs. {parseFloat(ev.quoted_amount).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-top pt-2 mt-auto d-flex justify-content-end align-items-center gap-2">
                  {ev.status === 'quoted' && (
                    <button
                      className="btn btn-success btn-sm py-1 d-flex align-items-center gap-1"
                      onClick={() => handleAcceptQuote(ev.id)}
                    >
                      <CheckCircle size={14} /> Accept Quotation
                    </button>
                  )}
                  {ev.status === 'accepted' && (
                    <span className="text-xs text-muted">
                      Accepted. Admin will generate delivery order.
                    </span>
                  )}
                  {ev.status === 'order_created' && (
                    <span className="text-xs text-success fw-bold">
                      Order Created & Dispatched!
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inquiry Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Bulk & Event Water Supply Request</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-7">
                      <label className="form-label small fw-semibold">Event Title / Organization *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Annual Tech Symposium / Wedding Banquet"
                        value={formData.event_name}
                        onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-5">
                      <label className="form-label small fw-semibold">Event Type</label>
                      <select
                        className="form-select"
                        value={formData.event_type}
                        onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      >
                        <option value="corporate">Corporate / Meeting</option>
                        <option value="wedding">Wedding / Family Function</option>
                        <option value="seminar">University / Seminar</option>
                        <option value="birthday">Birthday Party</option>
                        <option value="other">Other Gathering</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Event Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.event_date}
                        onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Estimated Attendees / Guests</label>
                      <input
                        type="number"
                        className="form-control"
                        min={10}
                        max={10000}
                        value={formData.expected_guests}
                        onChange={(e) => setFormData({ ...formData, expected_guests: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Venue Location / Address *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Royal Palm Golf Club, Hall 3, Lahore"
                        value={formData.location_address}
                        onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Requested Water Quantity & Dispensers *</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="e.g. 25x 19L Reusable Bottles + 2 Hot/Cold Dispensers + 200x 500ml small bottles"
                        value={formData.requested_water_quantity}
                        onChange={(e) => setFormData({ ...formData, requested_water_quantity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Special Operational Notes (Setup times, contact person)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Setup needed 2 hours prior to start, contact event manager on site"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Inquiry for Quote'}
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
