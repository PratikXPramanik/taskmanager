import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import './ProjectDetail.css';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', role: 'member' });
  const [memberError, setMemberError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => api.get(`/projects/${projectId}`).then(r => setProject(r.data)).catch(() => navigate('/projects')).finally(() => setLoading(false));

  useEffect(() => { load(); }, [projectId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError(''); setAdding(true);
    try {
      await api.post(`/projects/${projectId}/members`, memberForm);
      setShowAddMember(false);
      setMemberForm({ email: '', role: 'member' });
      load();
    } catch (err) {
      setMemberError(err.response?.data?.error || 'Failed to add member');
    } finally { setAdding(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try { await api.delete(`/projects/${projectId}/members/${userId}`); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleChangeRole = async (userId, role) => {
    try { await api.put(`/projects/${projectId}/members/${userId}/role`, { role }); load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try { await api.delete(`/projects/${projectId}`); navigate('/projects'); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="spinner" />;
  if (!project) return null;

  const isAdmin = project.role === 'admin';

  return (
    <div className="project-detail">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/projects">Projects</Link> / {project.name}</div>
          <h1>{project.name}</h1>
          {project.description && <p className="page-sub">{project.description}</p>}
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <Link to={`/projects/${projectId}/tasks`} className="btn-primary" style={{textDecoration:'none', display:'inline-flex', alignItems:'center'}}>View Tasks →</Link>
          {isAdmin && <button className="btn-danger btn-sm" onClick={handleDeleteProject}>Delete Project</button>}
        </div>
      </div>

      <div className="members-section card">
        <div className="members-header">
          <h3>Team Members ({project.members?.length})</h3>
          {isAdmin && <button className="btn-secondary btn-sm" onClick={() => setShowAddMember(true)}>+ Add Member</button>}
        </div>
        <div className="members-list">
          {project.members?.map(m => (
            <div key={m.id} className="member-row">
              <div className="member-avatar">{m.name.charAt(0).toUpperCase()}</div>
              <div className="member-info">
                <div className="member-name">{m.name} {m.id === user.id && <span style={{color:'var(--text3)',fontWeight:400}}>(you)</span>}</div>
                <div className="member-email">{m.email}</div>
              </div>
              {isAdmin && m.id !== project.owner_id ? (
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <select value={m.role} onChange={e => handleChangeRole(m.id, e.target.value)}
                    style={{width:'auto', padding:'4px 8px', fontSize:13}}>
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="btn-sm" style={{background:'rgba(248,113,113,0.1)',color:'var(--danger)',border:'1px solid var(--danger)'}}
                    onClick={() => handleRemoveMember(m.id)}>✕</button>
                </div>
              ) : (
                <span className={`badge badge-${m.role}`}>{m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={showAddMember} onClose={() => { setShowAddMember(false); setMemberError(''); }} title="Add Member">
        <form onSubmit={handleAddMember}>
          <div className="form-group">
            <label>Email address</label>
            <input type="email" placeholder="member@example.com" value={memberForm.email}
              onChange={e => setMemberForm({...memberForm, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {memberError && <div className="error-msg">{memberError}</div>}
          <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:16}}>
            <button type="button" className="btn-secondary" onClick={() => setShowAddMember(false)}>Cancel</button>
            <button className="btn-primary" disabled={adding}>{adding ? 'Adding…' : 'Add Member'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
