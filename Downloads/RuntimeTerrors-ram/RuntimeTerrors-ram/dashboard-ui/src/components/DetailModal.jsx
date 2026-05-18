import { useEffect } from 'react';
import { X, Shield, Info, Lightbulb, AlertTriangle } from 'lucide-react';
import { riskClass, scoreColor, formatTime, RISK_COLORS } from '../utils';

function ScoreRing({ score, level }) {
  const color = RISK_COLORS[level] || '#ccc';
  const size  = 80;
  const r     = 30;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;

  return (
    <div className="score-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <span className="score-ring-label" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function DetailModal({ log, onClose }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!log) return null;

  const reasons = Array.isArray(log.reasons) ? log.reasons : [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Shield size={16} style={{ color: 'var(--accent)' }} />
            Scan Detail — <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{log.domain}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body">
          {/* Info Grid */}
          <div className="modal-grid">
            {/* Employee */}
            <div className="modal-section">
              <h4>Employee</h4>
              <p><span className="field-label">Email</span><span className="field-val">{log.employeeEmail || '—'}</span></p>
              <p><span className="field-label">Department</span><span className="field-val">{log.department || 'N/A'}</span></p>
              <p><span className="field-label">Employee ID</span><span className="field-val mono" style={{ fontSize: '0.75rem' }}>{log.employeeId || '—'}</span></p>
              <p><span className="field-label">Scanned</span><span className="field-val">{formatTime(log.scannedAt)}</span></p>
            </div>

            {/* Site */}
            <div className="modal-section">
              <h4>Site Info</h4>
              <p><span className="field-label">Domain</span><span className="field-val">{log.domain || '—'}</span></p>
              <p>
                <span className="field-label">URL</span>
                <span className="field-val" title={log.url} style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>
                  {log.url || '—'}
                </span>
              </p>
              <p>
                <span className="field-label">Classification</span>
                <span className={`badge ${log.classification?.toLowerCase()}`} style={{ marginTop: 4, width: 'fit-content' }}>
                  {log.classification?.toUpperCase() || '—'}
                </span>
              </p>
            </div>

            {/* Risk Score — full width */}
            <div className="score-highlight">
              <div className="score-ring-area">
                <ScoreRing score={log.riskScore ?? 0} level={log.riskLevel} />
              </div>
              <div className="score-info">
                <span className={`badge ${riskClass(log.riskLevel)}`} style={{ width: 'fit-content', fontSize: '0.8rem' }}>
                  {log.riskLevel}
                </span>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Risk Score: {log.riskScore ?? '—'}
                </div>
                <div className="conf">
                  Confidence: <strong style={{ color: 'var(--text-primary)' }}>{log.confidenceScore ?? '—'}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Reasons */}
          {reasons.length > 0 && (
            <div className="reasons-box">
              <h4><AlertTriangle size={12} style={{ display: 'inline', marginRight: 6, color: 'var(--risk-high)' }} />Flagged Reasons</h4>
              <ul className="reasons-list">
                {reasons.map((r, i) => (
                  <li key={i}>
                    <Info size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--risk-medium)' }} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          {log.recommendation && (
            <div className="rec-box">
              <Lightbulb size={15} />
              <span>{log.recommendation}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
