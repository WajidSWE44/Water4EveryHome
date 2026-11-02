// frontend/src/components/StatusBadge.jsx
import React from 'react';

export default function StatusBadge({ status, label }) {
  if (!status) return null;

  const normalized = status.toLowerCase();
  let badgeClass = 'badge-pending';
  let displayLabel = label || status.replace(/_/g, ' ').toUpperCase();

  if (['approved', 'delivered', 'active', 'successful', 'paid', 'pass', 'order_created'].includes(normalized)) {
    badgeClass = 'badge-approved';
  } else if (['pending', 'testing', 'processing', 'quoted', 'reviewed', 'inspection', 'washing', 'refilling'].includes(normalized)) {
    badgeClass = 'badge-pending';
  } else if (['confirmed', 'ready', 'out_for_delivery', 'assigned', 'warehouse_filled'].includes(normalized)) {
    badgeClass = 'badge-confirmed';
  } else if (['cancelled', 'rejected', 'failed', 'damaged', 'lost', 'retired', 'fail'].includes(normalized)) {
    badgeClass = 'badge-cancelled';
  }

  return (
    <span className={`badge ${badgeClass} text-uppercase font-monospace`}>
      {displayLabel}
    </span>
  );
}
