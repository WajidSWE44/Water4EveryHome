// frontend/src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { 
  Users, ShoppingBag, Truck, Repeat, AlertTriangle, 
  Clock, ShieldAlert, Coins, CreditCard, Factory, 
  Download, ArrowRight, CheckCircle2 
} from 'lucide-react';

export default function Dashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.getDashboardReports();
        if (res.success) setReport(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="text-center py-5 text-muted small">Loading operational metrics...</div>;
  }

  const metrics = report?.metrics || {};

  return (
    <div>
      {/* Page Title & Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 border-bottom pb-3 mb-4" style={{ borderColor: 'var(--neutral)' }}>
        <div>
          <h4 className="fw-bold text-primary mb-0">Operations Command Center</h4>
          <span className="text-muted text-xs">Real-time database metrics across plant production, orders, fleet, and inventory.</span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <a
            href="/api/reports/export?type=orders"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
          >
            <Download size={14} /> Orders CSV
          </a>
          <a
            href="/api/reports/export?type=inventory"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
          >
            <Download size={14} /> Stock CSV
          </a>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="row g-3 mb-4">
        {/* Total Customers */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div className="stat-label">Active Customers</div>
              <Users size={18} className="text-secondary" />
            </div>
            <div className="stat-value">{metrics.total_customers || 0}</div>
            <div className="stat-subtext">Registered customer accounts</div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div className="stat-label">Total Orders</div>
              <ShoppingBag size={18} className="text-secondary" />
            </div>
            <div className="stat-value">{metrics.total_orders || 0}</div>
            <div className="stat-subtext">
              <span className="text-primary fw-semibold">{metrics.delivered_orders || 0}</span> completed deliveries
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div className="stat-label">Verified Revenue</div>
              <CreditCard size={18} className="text-secondary" />
            </div>
            <div className="stat-value">Rs. {parseFloat(metrics.total_revenue || 0).toLocaleString()}</div>
            <div className="stat-subtext">Confirmed COD & Online collections</div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div className="stat-label">Active Subscriptions</div>
              <Repeat size={18} className="text-secondary" />
            </div>
            <div className="stat-value">{metrics.active_subscriptions || 0}</div>
            <div className="stat-subtext">Weekly & recurring refill plans</div>
          </div>
        </div>
      </div>

      {/* Operational Action Highlights */}
      <div className="row g-3 mb-4">
        {/* Pending Addresses */}
        <div className="col-12 col-sm-6 col-lg-3">
          <Link to="/admin/addresses" className="text-decoration-none">
            <div className={`stat-card border-start border-4 ${metrics.pending_addresses > 0 ? 'border-warning' : 'border-neutral'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold text-secondary">Address Verifications</span>
                <Clock size={16} className="text-warning" />
              </div>
              <div className="fs-4 fw-bold text-dark mt-1">{metrics.pending_addresses || 0} Pending</div>
              <div className="text-xs text-muted">Awaiting location approval</div>
            </div>
          </Link>
        </div>

        {/* Pending Production Approvals */}
        <div className="col-12 col-sm-6 col-lg-3">
          <Link to="/admin/production" className="text-decoration-none">
            <div className={`stat-card border-start border-4 ${metrics.pending_batches > 0 ? 'border-warning' : 'border-neutral'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold text-secondary">QC Plant Batches</span>
                <Factory size={16} className="text-primary" />
              </div>
              <div className="fs-4 fw-bold text-dark mt-1">{metrics.pending_batches || 0} Batches</div>
              <div className="text-xs text-muted">Pending quality lab approval</div>
            </div>
          </Link>
        </div>

        {/* Low Stock Warnings */}
        <div className="col-12 col-sm-6 col-lg-3">
          <Link to="/admin/inventory" className="text-decoration-none">
            <div className={`stat-card border-start border-4 ${metrics.low_stock_count > 0 ? 'border-danger' : 'border-neutral'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold text-secondary">Low Stock Alerts</span>
                <AlertTriangle size={16} className="text-danger" />
              </div>
              <div className="fs-4 fw-bold text-dark mt-1">{metrics.low_stock_count || 0} Products</div>
              <div className="text-xs text-muted">Below reorder threshold</div>
            </div>
          </Link>
        </div>

        {/* Outstanding Deposits */}
        <div className="col-12 col-sm-6 col-lg-3">
          <Link to="/admin/deposits" className="text-decoration-none">
            <div className="stat-card border-start border-4 border-primary">
              <div className="d-flex justify-content-between align-items-center">
                <span className="small fw-semibold text-secondary">Outstanding Deposits</span>
                <Coins size={16} className="text-primary" />
              </div>
              <div className="fs-4 fw-bold text-dark mt-1">Rs. {parseFloat(metrics.total_deposits || 0).toLocaleString()}</div>
              <div className="text-xs text-muted">In customer bottle escrow</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Recent Batches */}
      <div className="row g-4">
        {/* Recent Orders */}
        <div className="col-lg-7">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Recent Customer Orders</span>
              <Link to="/admin/orders" className="small text-decoration-none text-primary fw-semibold">
                View All Orders &rarr;
              </Link>
            </div>
            <div className="table-responsive">
              <table className="table mb-0">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Area</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.recent_orders?.map(o => (
                    <tr key={o.id}>
                      <td className="font-monospace fw-semibold small text-primary">{o.order_number}</td>
                      <td className="small">{o.customer_name}</td>
                      <td className="small text-muted">{o.area_name}</td>
                      <td className="small fw-bold">Rs. {parseFloat(o.total_amount).toFixed(2)}</td>
                      <td><StatusBadge status={o.order_status} /></td>
                      <td>
                        <Link to={`/admin/orders`} className="btn btn-outline-primary btn-sm py-0 px-2" style={{ fontSize: '0.78rem' }}>
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottle Status Summary */}
        <div className="col-lg-5">
          <div className="card shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>19L Bottle Fleet Status</span>
              <Link to="/admin/bottles" className="small text-decoration-none text-primary fw-semibold">
                Manage Fleet &rarr;
              </Link>
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2">
                {Object.entries(metrics.bottle_counts || {}).map(([status, count]) => (
                  <div key={status} className="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
                    <span className="small text-capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="badge bg-primary text-white font-monospace">{count}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-top">
                <Link to="/admin/production" className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2">
                  <Factory size={15} /> Plant Water Production & QC
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
