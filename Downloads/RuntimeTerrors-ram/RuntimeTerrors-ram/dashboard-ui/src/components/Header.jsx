import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function Header({ onRefresh, refreshing }) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-mark">🛡️</div>
        <div>
          <div className="header-title">Shadow IT Governance</div>
          <div className="header-subtitle">Security Intelligence Dashboard</div>
        </div>
      </div>

      <div className="header-right">
        <div className="live-dot">
          <div className="live-dot-circle" />
          Live
        </div>
        <div className="clock">{clock}</div>
        <button
          className="btn-refresh"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}
