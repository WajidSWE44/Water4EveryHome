// frontend/src/pages/admin/EventBookings.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { Calendar, CheckCircle, AlertCircle, ShoppingCart, DollarSign } from 'lucide-react';

export default function AdminEventBookings() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quote modal
  const [quoteModalId, setQuoteModalId] = useState(null);
  const [quotedAmount, setQuotedAmount] = useState(25000);
  const [quoteNotes, setQuoteNotes] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      await api.quoteEvent(quoteModalId, {
        quoted_amount: parseFloat(quotedAmount),
        notes: quoteNotes
      });
      setMessage(`Quotation of Rs. ${quotedAmount} submitted to customer.`);
      setQuoteModalId(null);
      loadEvents();
    } catch (err) {
      setError(err.message || 'Failed to quote event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToOrder = async (id) => {
    if (!window.confirm('Convert this bulk event inquiry into an official delivery order?')) return;
    setError('');
    setMessage('');
    try {
      const res = await api.convertEventOrder(id);
      if (res.success) {
        setMessage(`Event converted to Order #${res.data.order_number}!`);
        loadEvents();
      }
    } catch (err) {
      setError(err.message || 'Failed to convert event');
    }
  };

  return (
    <div>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Bulk & Event Supply Quotations</h4>
          <span className="text-muted text-xs">Review large-scale inquiries, issue pricing quotes, and convert to production dispatch orders (SRS FR-13).</span>
        </div>
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
          <div className="text-center py-5 text-muted small">Loading event requests...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-5 text-muted small">No event supply requests received.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead>
                <tr>
                  <th>Booking Code</th>
                  <th>Customer</th>
                  <th>Event Name & Type</th>
                  <th>Event Date</th>
                  <th>Requested Water Units</th>
                  <th>Quotation</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <span className="fw-bold text-primary font-monospace small">{ev.booking_code}</span>
                      <div className="text-muted text-xs">{new Date(ev.created_at).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{ev.customer_name}</div>
                      <div className="text-muted text-xs">{ev.customer_phone}</div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{ev.event_name}</div>
                      <span className="badge bg-light text-primary border text-uppercase" style={{ fontSize: '0.7rem' }}>
                        {ev.event_type}
                      </span>
                    </td>
                    <td className="small font-monospace">{ev.event_date}</td>
                    <td className="small text-secondary" style={{ maxWidth: '240px' }}>
                      {ev.requested_water_quantity}
                    </td>
                    <td>
                      {ev.quoted_amount ? (
                        <div className="fw-bold text-primary small">
                          Rs. {parseFloat(ev.quoted_amount).toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Unquoted</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-1">
                        {['pending', 'reviewed', 'quoted'].includes(ev.status) && (
                          <button
                            className="btn btn-outline-primary btn-sm py-0 px-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => {
                              setQuoteModalId(ev.id);
                              setQuotedAmount(ev.quoted_amount || 15000);
                              setQuoteNotes('');
                            }}
                          >
                            <DollarSign size={12} /> Quote
                          </button>
                        )}

                        {['accepted', 'quoted'].includes(ev.status) && (
                          <button
                            className="btn btn-success btn-sm py-0 px-2 d-flex align-items-center gap-1"
                            style={{ fontSize: '0.78rem' }}
                            onClick={() => handleConvertToOrder(ev.id)}
                          >
                            <ShoppingCart size={12} /> Convert to Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quote Modal */}
      {quoteModalId && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Issue Bulk Water Quotation</h5>
                <button type="button" className="btn-close" onClick={() => setQuoteModalId(null)}></button>
              </div>
              <form onSubmit={handleQuoteSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Quoted Total Amount (Rs.) *</label>
                    <input
                      type="number"
                      className="form-control font-monospace fw-bold"
                      value={quotedAmount}
                      onChange={(e) => setQuotedAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Notes / Terms (Setup fee, dispensers included)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g. Price includes delivery, 2 countertop dispensers on loan, and setup 2 hours prior to banquet."
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuoteModalId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Send Quotation to Customer'}
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
