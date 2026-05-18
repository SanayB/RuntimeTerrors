import { Activity, Users, ShieldOff, Zap } from 'lucide-react';

const CARDS = [
  {
    key: 'totalScans',
    label: 'Total Scans',
    icon: Activity,
    variant: 'info',
    iconBg: 'rgba(0,210,255,0.12)',
    iconColor: '#00d2ff',
    sub: 'All-time recorded events',
  },
  {
    key: 'employees',
    label: 'Unique Employees',
    icon: Users,
    variant: 'success',
    iconBg: 'rgba(34,214,95,0.12)',
    iconColor: '#22d65f',
    sub: 'Tracked user identities',
  },
  {
    key: 'unauthorized',
    label: 'Unauthorized Tools',
    icon: ShieldOff,
    variant: 'warning',
    iconBg: 'rgba(255,140,0,0.12)',
    iconColor: '#ff8c00',
    sub: 'Non-approved domains',
  },
  {
    key: 'critical',
    label: 'Critical Alerts',
    icon: Zap,
    variant: 'critical',
    iconBg: 'rgba(255,59,92,0.12)',
    iconColor: '#ff3b5c',
    sub: 'Require immediate action',
  },
];

export default function KPIGrid({ stats, domains, employees }) {
  const values = {
    totalScans:   stats?.totalScans ?? '—',
    employees:    employees?.length ?? '—',
    unauthorized: domains ? domains.filter(d => d.classification !== 'approved').length : '—',
    critical:     stats?.riskLevelBreakdown?.CRITICAL ?? 0,
  };

  return (
    <div className="kpi-grid">
      {CARDS.map(({ key, label, icon: Icon, variant, iconBg, iconColor, sub }) => (
        <div key={key} className={`kpi-card ${variant}`}>
          <div className="kpi-header">
            <span className="kpi-label">{label}</span>
            <div className="kpi-icon" style={{ background: iconBg, color: iconColor }}>
              <Icon size={16} />
            </div>
          </div>
          <div className="kpi-value">{values[key]}</div>
          <div className="kpi-sub">{sub}</div>
        </div>
      ))}
    </div>
  );
}
