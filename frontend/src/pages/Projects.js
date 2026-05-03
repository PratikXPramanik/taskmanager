import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Modal from '../components/Modal';
import './Projects.css';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setCreating(true);
    try {
      const { data } = await api.post('/projects', form);
      setShowModal(false);
      setForm({ name: '', description: '' });
      navigate(`/projects/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally { setCreating(false); }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-sub">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◧</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Create Project</button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => (
            <Link to={`/projects/${p.id}`} key={p.id} className="project-card">
              <div className="project-card-header">
                <div className="project-icon">{p.name.charAt(0).toUpperCase()}</div>
                <span className={`badge badge-${p.role}`}>{p.role}</span>
              </div>
              <h3 className="project-name">{p.name}</h3>
              {p.description && <p className="project-desc">{p.description}</p>}
              <div className="project-meta">
                <span>👥 {p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                <span>✓ {p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setError(''); }} title="New Project">
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Project Name</label>
            <input placeholder="e.g. Product Redesign" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Description (optional)</label>
            <textarea rows={3} placeholder="What's this project about?" value={form.description}
              onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:16}}>
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
