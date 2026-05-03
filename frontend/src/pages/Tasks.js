import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { format, isPast, parseISO } from 'date-fns';
import './Tasks.css';

const STATUSES = ['todo', 'in_progress', 'done'];
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

export default function Tasks() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', due_date: '', assignee_id: '' };
  const [form, setForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    const [projRes, taskRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/tasks`, { params: filter }),
    ]);
    setProject(projRes.data);
    setTasks(taskRes.data);
    setLoading(false);
  }, [projectId, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditTask(null); setForm(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (task) => {
    setEditTask(task);
    setForm({
      title: task.title, description: task.description || '',
      status: task.status, priority: task.priority,
      due_date: task.due_date || '', assignee_id: task.assignee_id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload = { ...form, assignee_id: form.assignee_id || undefined, due_date: form.due_date || undefined };
    try {
      if (editTask) {
        await api.put(`/projects/${projectId}/tasks/${editTask.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/tasks`, payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map(e => e.msg).join(', ') : err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try { await api.delete(`/projects/${projectId}/tasks/${taskId}`); loadData(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleStatusChange = async (task, newStatus) => {
    try { await api.put(`/projects/${projectId}/tasks/${task.id}`, { status: newStatus }); loadData(); }
    catch {}
  };

  if (loading) return <div className="spinner" />;

  const isAdmin = project?.role === 'admin';
  const byStatus = STATUSES.reduce((acc, s) => { acc[s] = tasks.filter(t => t.status === s); return acc; }, {});

  return (
    <div className="tasks-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/projects">Projects</Link> / <Link to={`/projects/${projectId}`}>{project?.name}</Link> / Tasks
          </div>
          <h1>Tasks</h1>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Task</button>
      </div>

      <div className="filters">
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} style={{width:'auto'}}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filter.priority} onChange={e => setFilter({...filter, priority: e.target.value})} style={{width:'auto'}}>
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span className="filter-count">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="kanban">
        {STATUSES.map(status => (
          <div key={status} className="kanban-col">
            <div className="kanban-header">
              <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
              <span className="col-count">{byStatus[status].length}</span>
            </div>
            <div className="kanban-cards">
              {byStatus[status].length === 0 && <div className="col-empty">No tasks</div>}
              {byStatus[status].map(task => (
                <div key={task.id} className="task-card">
                  <div className="task-card-top">
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    <div className="task-card-actions">
                      <button className="icon-btn" onClick={() => openEdit(task)} title="Edit">✏️</button>
                      {(isAdmin || task.created_by === user.id) && (
                        <button className="icon-btn" onClick={() => handleDelete(task.id)} title="Delete">🗑️</button>
                      )}
                    </div>
                  </div>
                  <h4 className="task-card-title">{task.title}</h4>
                  {task.description && <p className="task-card-desc">{task.description}</p>}
                  <div className="task-card-footer">
                    {task.assignee_name && <span className="task-assignee">👤 {task.assignee_name}</span>}
                    {task.due_date && (
                      <span className={`task-due-date ${isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'overdue' : ''}`}>
                        📅 {format(parseISO(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                  <div className="status-btns">
                    {STATUSES.filter(s => s !== status).map(s => (
                      <button key={s} className="status-btn" onClick={() => handleStatusChange(task, s)}>
                        → {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTask ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Title *</label>
            <input placeholder="Task title" value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows={3} placeholder="Optional details…" value={form.description}
              onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Assign To</label>
              <select value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {project?.members?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:16}}>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : editTask ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
