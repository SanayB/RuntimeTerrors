import { AlertTriangle, X } from 'lucide-react';

export default function AlertBanner({ criticalCount, onClose }) {
  if (!criticalCount || criticalCount === 0) return null;
  return (
    <div className="alert-banner">
      <AlertTriangle size={16} />
      <span>
        <strong>{criticalCount} CRITICAL</strong> risk event{criticalCount !== 1 ? 's' : ''} detected in the system — immediate review required.
      </span>
      <button className="alert-close" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
