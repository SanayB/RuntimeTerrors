import { useState } from 'react';
import { List, Search } from 'lucide-react';
import { riskClass, formatTime } from '../utils';

export default function ActivityLog({ logs = [], onRowClick }) {
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    l.domain?.toLowerCase().includes(search.toLowerCase()) ||
    l.employeeEmail?.toLowerCase().includes(search.toLowerCase()) ||
    l.riskLevel?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel" style={{ animationDelay: '0.25s' }}>
      <div className="log-panel-header">
        <span className="panel-title">
          <List size={15} /> Full Activity Log
        </span>
        <div className="search-input-wrap">
          <Search size={13} />
          <input
            className="search-input"
            placeholder="Search domains, emails, risk…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {filtered.length} / {logs.length} events
        </span>
      </div>
      <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Employee</th>
              <th>Domain</th>
              <th>Score</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {search ? 'No matching events found' : 'No events recorded yet'}
                </td>
              </tr>
            ) : (
              filtered.map((log, i) => (
                <tr
                  key={log.id ?? i}
                  className="clickable"
                  onClick={() => onRowClick(log)}
                >
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                    {formatTime(log.scannedAt)}
                  </td>
                  <td style={{ fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
                    {log.employeeEmail}
                  </td>
                  <td><strong>{log.domain}</strong></td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {log.riskScore}
                  </td>
                  <td>
                    <span className={`badge ${riskClass(log.riskLevel)}`}>
                      {log.riskLevel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
