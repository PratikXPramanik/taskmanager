import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">TaskFlow</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={() => setOpen(false)}>
            <span className="nav-icon">◈</span> Dashboard
          </NavLink>
          <NavLink to="/projects" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} onClick={() => setOpen(false)}>
            <span className="nav-icon">◧</span> Projects
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">↩</button>
        </div>
      </aside>
      <div className="layout-overlay" onClick={() => setOpen(false)} />
      <main className="main-content">
        <button className="menu-toggle" onClick={() => setOpen(!open)}>☰</button>
        <Outlet />
      </main>
    </div>
  );
}
