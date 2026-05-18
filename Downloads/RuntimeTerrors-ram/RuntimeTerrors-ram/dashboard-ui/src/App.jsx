import { useState } from 'react';
import './index.css';
import './App.css';

import { useDashboard }   from './useDashboard';
import Header             from './components/Header';
import AlertBanner        from './components/AlertBanner';
import KPIGrid            from './components/KPIGrid';
import DonutChart         from './components/DonutChart';
import TimelineChart      from './components/TimelineChart';
import ToolsTable         from './components/ToolsTable';
import EmployeesTable     from './components/EmployeesTable';
import ActivityLog        from './components/ActivityLog';
import DetailModal        from './components/DetailModal';

function Spinner() {
  return (
    <div className="spinner-wrap" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
      Loading dashboard…
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="spinner-wrap" style={{ minHeight: '60vh', gap: 16 }}>
      <span style={{ fontSize: '2rem' }}>⚠️</span>
      <span style={{ color: 'var(--risk-high)', fontWeight: 600 }}>{message}</span>
      <button className="btn-refresh" onClick={onRetry}>Retry</button>
    </div>
  );
}

export default function App() {
  const { data, loading, error, refresh } = useDashboard();
  const [refreshing, setRefreshing]       = useState(false);
  const [alertOpen, setAlertOpen]         = useState(true);
  const [selectedLog, setSelectedLog]     = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const criticalCount = data?.stats?.riskLevelBreakdown?.CRITICAL ?? 0;

  return (
    <div className="app-layout">
      <Header onRefresh={handleRefresh} refreshing={refreshing || loading} />

      {alertOpen && data && (
        <AlertBanner
          criticalCount={criticalCount}
          onClose={() => setAlertOpen(false)}
        />
      )}

      <div className="main-content">
        {loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <>
            {/* KPI Row */}
            <KPIGrid
              stats={data.stats}
              domains={data.domains}
              employees={data.employees}
            />

            {/* Charts Row */}
            <div className="charts-row">
              <DonutChart breakdown={data.stats?.riskLevelBreakdown ?? {}} />
              <TimelineChart timeline={data.timeline ?? []} />
            </div>

            {/* Tables Row */}
            <div className="tables-row">
              <ToolsTable domains={data.domains ?? []} />
              <EmployeesTable employees={data.employees ?? []} />
            </div>

            {/* Activity Log */}
            <ActivityLog
              logs={data.logs ?? []}
              onRowClick={log => setSelectedLog(log)}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <DetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
