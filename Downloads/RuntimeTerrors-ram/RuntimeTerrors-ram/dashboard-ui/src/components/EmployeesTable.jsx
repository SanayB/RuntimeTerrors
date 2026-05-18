import { Users } from 'lucide-react';
import { riskClass } from '../utils';

export default function EmployeesTable({ employees = [] }) {
  return (
    <div className="panel" style={{ animationDelay: '0.2s' }}>
      <div className="panel-header">
        <span className="panel-title">
          <Users size={15} /> Employee Exposure
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {employees.length} users
        </span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Dept</th>
              <th>Scans</th>
              <th>Worst Risk</th>
              <th>Tools</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No employee data yet
                </td>
              </tr>
            ) : (
              employees.map((e, i) => (
                <tr key={i}>
                  <td>
                    <strong style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>
                      {e.employeeEmail}
                    </strong>
                  </td>
                  <td>{e.department || 'N/A'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {e.totalScans}
                  </td>
                  <td>
                    <span className={`badge ${riskClass(e.highestRiskLevel)}`}>
                      {e.highestRiskLevel}
                    </span>
                  </td>
                  <td
                    className="truncate"
                    title={e.uniqueDomains?.join(', ')}
                    style={{ maxWidth: 160, fontSize: '0.75rem' }}
                  >
                    {e.uniqueDomains?.join(', ') || '—'}
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
