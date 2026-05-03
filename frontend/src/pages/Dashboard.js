import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { format, isPast, parseISO } from 'date-fns';
import './Dashboard.css';

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: accent } : {}}>
      <div className="stat-value" style={accent ? { color: accent } : {}}>
        {value ?? 0}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const EMPTY_DATA = {
  projectCount: 0,
  taskStats: { total: 0, todo: 0, in_progress: 0, done: 0, overdue: 0 },
  myTasks: [],
  recentTasks: [],
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError('');
    try {
      const r = await api.get('/dashboard');
      // Merge with defaults so missing fields never crash the UI
      setData({ ...EMPTY_DATA, ...r.data, taskStats: { ...EMPTY_DATA.taskStats, ...r.data.taskStats } });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner" />;

  const { projectCount, taskStats, myTasks, recentTasks } = data;

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Good day, {user.name.split(' ')[0]} 👋</h1>
          <p className="page-sub">Here's what's happening across your projects</p>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => load(true)}
          disabled={refreshing}
          style={{ alignSelf: 'center' }}
        >
          {refreshing ? '⟳ Refreshing…' : '⟳ Refresh'}
        </button>
      </div>
      {error && (
        <div className="dash-error">
          ⚠️ {error}
          <button className="btn-sm" style={{ marginLeft: 12, background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)' }} onClick={() => load()}>Retry</button>
        </div>
      )}

      <div className="stats-grid">
        <StatCard label="Projects" value={projectCount} />
        <StatCard label="Total Tasks" value={taskStats.total} />
        <StatCard label="In Progress" value={taskStats.in_progress} accent="var(--accent2)" />
        <StatCard label="Completed" value={taskStats.done} accent="var(--success)" />
        <StatCard label="Overdue" value={taskStats.overdue} accent={taskStats.overdue > 0 ? 'var(--danger)' : undefined} />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3 className="section-title">My Open Tasks</h3>
          {myTasks.length === 0 ? <p className="empty-text">No open tasks assigned to you 🎉</p> : (
            <div className="task-list">
              {myTasks.map(t => (
                <Link to={`/projects/${t.project_id}/tasks`} key={t.id} className="task-row">
                  <div className="task-row-left">
                    <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                    <span className="task-title">{t.title}</span>
                  </div>
                  <div className="task-row-right">
                    <span className="task-project">{t.project_name}</span>
                    {t.due_date && (
                      <span className={`task-due ${isPast(parseISO(t.due_date)) ? 'overdue' : ''}`}>
                        {format(parseISO(t.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Recent Activity</h3>
          {recentTasks.length === 0 ? <p className="empty-text">No recent activity</p> : (
            <div className="task-list">
              {recentTasks.map(t => (
                <Link to={`/projects/${t.project_id}/tasks`} key={t.id} className="task-row">
                  <div className="task-row-left">
                    <span className={`badge badge-${t.status}`}>{t.status.replace('_',' ')}</span>
                    <span className="task-title">{t.title}</span>
                  </div>
                  <div className="task-row-right">
                    <span className="task-project">{t.project_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
