import { Globe } from 'lucide-react';
import { riskClass, RISK_COLORS } from '../utils';

function ScoreBar({ score, level }) {
  return (
    <div className="score-bar-wrap">
      <div className="score-bar">
        <div
          className="score-fill"
          style={{ width: `${score}%`, background: RISK_COLORS[level] || '#ccc' }}
        />
      </div>
      <span className="score-num">{score}</span>
    </div>
  );
}

export default function ToolsTable({ domains = [] }) {
  return (
    <div className="panel" style={{ animationDelay: '0.15s' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Globe size={15} /> Most Risky Tools
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {domains.length} domains
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Classification</th>
              <th>Avg Score</th>
              <th>Highest Risk</th>
              <th>Users</th>
            </tr>
          </thead>
          <tbody>
            {domains.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No domain data yet
                </td>
              </tr>
            ) : (
              domains.map((d, i) => (
                <tr key={i}>
                  <td><strong>{d.domain}</strong></td>
                  <td>
                    <span className={`badge ${d.classification?.toLowerCase()}`}>
                      {d.classification?.toUpperCase()}
                    </span>
                  </td>
                  <td><ScoreBar score={d.avgRiskScore} level={d.highestRiskLevel} /></td>
                  <td>
                    <span className={`badge ${riskClass(d.highestRiskLevel)}`}>
                      {d.highestRiskLevel}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {d.affectedEmployees}
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
