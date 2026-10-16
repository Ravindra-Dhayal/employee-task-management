import { NavLink } from 'react-router-dom';
export default function Layout({ children }) {
  return <div className="app-shell"><main className="main"><header className="topbar"><div className="brand"><span className="brand-mark">✓</span><span>TaskFlow<small>Employee &amp; task management</small></span></div><nav><NavLink to="/dashboard">Dashboard</NavLink><NavLink to="/employees">Employees</NavLink><NavLink to="/tasks">Tasks</NavLink></nav><div className="topbar-actions"><span className="status-dot">●</span> Operations workspace</div></header><section className="content">{children}</section></main></div>;
}
