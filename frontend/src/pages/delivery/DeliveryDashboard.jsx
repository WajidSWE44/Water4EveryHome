// frontend/src/pages/delivery/DeliveryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { 
  Truck, CheckCircle2, XCircle, Phone, MapPin, 
  QrCode, AlertCircle, Clock, ShoppingBag, RotateCcw, Search 
} from 'lucide-react';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [modalType, setModalType] = useState(null); // 'complete' or 'fail'
  
  // Delivery Complete Form
  const [deliveredCount, setDeliveredCount] = useState(1);
  const [returnedCount, setReturnedCount] = useState(0);
  const [sigNotes, setSigNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // QR verification tool
  const [qrInput, setQrInput] = useState('');
  const [scannedBottle, setScannedBottle] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  const loadDeliveries = async () => {
    try {
      const res = await api.getMyDeliveries();
      if (res.success) setDeliveries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleStartDelivery = async (deliveryId) => {
    try {
      await api.updateDeliveryStatus(deliveryId, { status: 'out_for_delivery' });
      setSuccess('Status updated: Order is now Out for Delivery!');
      loadDeliveries();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCompleteModal = (del) => {
    setSelectedDelivery(del);
    setDeliveredCount(2);
    setReturnedCount(0);
    setSigNotes('Delivered to recipient');
    setModalType('complete');
  };

  const openFailModal = (del) => {
    setSelectedDelivery(del);
    setFailureReason('');
    setModalType('fail');
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.updateDeliveryStatus(selectedDelivery.id, {
        status: 'delivered',
        delivered_bottles_count: deliveredCount,
        returned_bottles_count: returnedCount,
        notes: sigNotes
      });
      setSuccess(`Delivery #${selectedDelivery.delivery_number} marked as Delivered! Inventory consumed.`);
      setModalType(null);
      loadDeliveries();
    } catch (err) {
      setError(err.message || 'Failed to update delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFailSubmit = async (e) => {
    e.preventDefault();
    if (!failureReason) {
      setError('Please provide a reason for failed delivery.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await api.updateDeliveryStatus(selectedDelivery.id, {
        status: 'failed',
        failure_reason: failureReason
      });
      setSuccess(`Delivery #${selectedDelivery.delivery_number} marked as Failed.`);
      setModalType(null);
      loadDeliveries();
    } catch (err) {
      setError(err.message || 'Failed to report delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanBottle = async (e) => {
    e.preventDefault();
    if (!qrInput) return;
    setScanning(true);
    setScanError('');
    setScannedBottle(null);

    try {
      const res = await api.scanBottle(qrInput);
      if (res.success && res.data) {
        setScannedBottle(res.data);
      }
    } catch (err) {
      setScanError(err.message || 'Bottle not found');
    } finally {
      setScanning(false);
    }
  };

  const activeDeliveries = deliveries.filter(d => ['assigned', 'out_for_delivery'].includes(d.status));
  const completedDeliveries = deliveries.filter(d => ['delivered', 'failed', 'returned'].includes(d.status));
  const displayed = activeTab === 'active' ? activeDeliveries : completedDeliveries;

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <div className="d-flex align-items-center gap-2">
            <div className="p-1 rounded bg-primary text-white">
              <Truck size={18} />
            </div>
            <h4 className="fw-bold text-primary mb-0">Delivery Fleet Portal</h4>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Logged in as Rider: <strong>{user?.name}</strong> • Vehicle: {user?.vehicle_number || 'Plant Fleet Van'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="btn-group btn-group-sm">
          <button
            className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Runs ({activeDeliveries.length})
          </button>
          <button
            className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('completed')}
          >
            Delivery History ({completedDeliveries.length})
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-success flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="row g-4">
        {/* Left: Deliveries List */}
        <div className="col-lg-8">
          {loading ? (
            <div className="text-center py-5 text-muted small">Loading assigned routes...</div>
          ) : displayed.length === 0 ? (
            <div className="card shadow-sm text-center p-5">
              <Truck size={32} className="text-muted mx-auto mb-2" />
              <h6 className="fw-bold text-primary">No Deliveries in this Tab</h6>
              <p className="text-muted small mb-0">
                {activeTab === 'active' ? 'You have no pending deliveries assigned right now.' : 'No completed deliveries yet.'}
              </p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {displayed.map(del => {
                const isOut = del.status === 'out_for_delivery';
                const isAssigned = del.status === 'assigned';

                return (
                  <div key={del.id} className="card shadow-sm p-3">
                    <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-primary font-monospace">{del.delivery_number}</span>
                        <span className="text-muted small font-monospace">({del.order_number})</span>
                        <StatusBadge status={del.status} />
                      </div>
                      <div className="small text-muted font-monospace">
                        <Clock size={12} className="me-1" />
                        {del.time_slot}
                      </div>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-md-7">
                        <div className="fw-bold text-dark">{del.recipient_name}</div>
                        <div className="small text-primary d-flex align-items-center gap-1">
                          <Phone size={13} /> {del.recipient_phone}
                        </div>
                        <div className="small text-secondary mt-1 d-flex align-items-start gap-1">
                          <MapPin size={14} className="mt-1 flex-shrink-0 text-primary" />
                          <span>{del.street_address}, {del.area_name}, {del.city}</span>
                        </div>
                        {del.landmark && (
                          <div className="text-xs text-muted ms-3">Landmark: {del.landmark}</div>
                        )}
                        {del.special_instructions && (
                          <div className="bg-light p-2 rounded text-xs mt-2 text-primary">
                            <strong>Note:</strong> {del.special_instructions}
                          </div>
                        )}
                      </div>

                      <div className="col-md-5 text-md-end">
                        <div className="small text-muted">Amount to Collect:</div>
                        <div className="fs-5 fw-bold text-primary">
                          Rs. {parseFloat(del.total_amount).toFixed(2)}
                        </div>
                        <div className="badge bg-light text-primary border text-uppercase font-monospace text-xs">
                          {del.payment_method.replace(/_/g, ' ')} ({del.payment_status})
                        </div>
                      </div>
                    </div>

                    {/* Operational Action Buttons for Rider */}
                    {activeTab === 'active' && (
                      <div className="border-top pt-2 d-flex justify-content-end gap-2">
                        {isAssigned && (
                          <button
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
                            onClick={() => handleStartDelivery(del.id)}
                          >
                            <Truck size={14} /> Start Delivery (Out for Delivery)
                          </button>
                        )}
                        {isOut && (
                          <button
                            className="btn btn-success btn-sm d-flex align-items-center gap-1"
                            onClick={() => openCompleteModal(del)}
                          >
                            <CheckCircle2 size={14} /> Mark Delivered & Collect Empties
                          </button>
                        )}
                        <button
                          className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
                          onClick={() => openFailModal(del)}
                        >
                          <XCircle size={14} /> Report Failed
                        </button>
                      </div>
                    )}

                    {del.status === 'delivered' && (
                      <div className="border-top pt-2 text-xs text-success d-flex justify-content-between">
                        <span>Delivered: {del.delivered_bottles_count} bottle(s)</span>
                        <span>Empty Bottles Returned: {del.returned_bottles_count}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick QR Bottle Verification on the road */}
        <div className="col-lg-4">
          <div className="card shadow-sm p-3">
            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3 d-flex align-items-center gap-2">
              <QrCode size={18} /> Quick Bottle Verification
            </h6>
            <p className="text-muted text-xs mb-3">
              Scan or enter reusable 19L bottle QR / serial number to check bottle status before loading.
            </p>

            <form onSubmit={handleScanBottle} className="mb-3">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. QR-W4EH-1001 or W4EH-BOT-1001"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={scanning}>
                  <Search size={14} />
                </button>
              </div>
            </form>

            {scanError && (
              <div className="alert alert-danger py-1 px-2 small text-xs mb-2">
                {scanError}
              </div>
            )}

            {scannedBottle && (
              <div className="p-2 border rounded bg-light small">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong className="text-primary font-monospace">{scannedBottle.serial_number}</strong>
                  <StatusBadge status={scannedBottle.current_status} />
                </div>
                <div className="text-xs text-muted">Product: {scannedBottle.product_name}</div>
                <div className="text-xs text-muted">Cycle Count: {scannedBottle.cycle_count} refills</div>
                {scannedBottle.current_customer_name && (
                  <div className="text-xs text-primary mt-1">
                    Customer: {scannedBottle.current_customer_name} ({scannedBottle.current_customer_phone})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Delivery Modal */}
      {modalType === 'complete' && selectedDelivery && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-primary">Confirm Handover #{selectedDelivery.delivery_number}</h5>
                <button type="button" className="btn-close" onClick={() => setModalType(null)}></button>
              </div>
              <form onSubmit={handleCompleteSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger small py-1 mb-3">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Delivered Bottle Quantity</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1}
                      value={deliveredCount}
                      onChange={(e) => setDeliveredCount(parseInt(e.target.value, 10) || 1)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Empty Reusable Bottles Returned by Customer</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      value={returnedCount}
                      onChange={(e) => setReturnedCount(parseInt(e.target.value, 10) || 0)}
                      required
                    />
                    <div className="form-text text-xs text-muted">
                      Every empty bottle recorded here is added to plant return inspection and credited to customer deposit balance.
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Delivery Confirmation Note / Signature</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Received by Mrs. Sarah, cash collected"
                      value={sigNotes}
                      onChange={(e) => setSigNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn btn-success btn-sm" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Submit Delivery Confirmation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Failed Delivery Modal */}
      {modalType === 'fail' && selectedDelivery && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Report Failed Delivery</h5>
                <button type="button" className="btn-close" onClick={() => setModalType(null)}></button>
              </div>
              <form onSubmit={handleFailSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger small py-1 mb-3">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Reason for Failure *</label>
                    <select
                      className="form-select"
                      value={failureReason}
                      onChange={(e) => setFailureReason(e.target.value)}
                      required
                    >
                      <option value="">-- Select failure reason --</option>
                      <option value="Customer unavailable at premises">Customer unavailable at premises</option>
                      <option value="Phone unattended after 3 attempts">Phone unattended after 3 attempts</option>
                      <option value="Security gate denied entrance">Security gate denied entrance</option>
                      <option value="Customer refused order">Customer refused order</option>
                      <option value="Wrong address / Inaccessible road">Wrong address / Inaccessible road</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setModalType(null)}>Cancel</button>
                  <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Mark as Failed & Return Stock'}
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
