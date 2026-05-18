import { useState, useEffect, useCallback } from 'react';

const API = '/api';

export function useDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetch_all = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, domains, employees, timeline, logs] = await Promise.all([
        fetch(`${API}/dashboard/stats`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/dashboard/domains`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/dashboard/employees`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/dashboard/timeline`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/dashboard`).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      ]);
      setData({ stats, domains, employees, timeline, logs: logs.results ?? [] });
    } catch (e) {
      setError('Failed to load dashboard data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_all();
    const id = setInterval(fetch_all, 30_000);
    return () => clearInterval(id);
  }, [fetch_all]);

  return { data, loading, error, refresh: fetch_all };
}
