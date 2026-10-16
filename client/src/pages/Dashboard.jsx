import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useFetch } from '../hooks';
import { ErrorState, Badge, Empty, PageHeader, Spinner } from '../components/UI';

const cards = [
  ['employees', 'Total employees', 'total', 'employees'],
  ['employees', 'Active employees', 'active', 'employees'],
  ['employees', 'Inactive employees', 'inactive', 'employees'],
  ['employees', 'On leave', 'onLeave', 'employees'],
  ['tasks', 'Total tasks', 'total', 'tasks'],
  ['tasks', 'Todo', 'todo', 'tasks'],
  ['tasks', 'In progress', 'inProgress', 'tasks'],
  ['tasks', 'Completed', 'completed', 'tasks'],
  ['tasks', 'Cancelled', 'cancelled', 'tasks'],
  ['tasks', 'Overdue', 'overdue', 'tasks'],
];
export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => api('/dashboard'), []);
  const navigate = useNavigate();
  if (loading) return <><PageHeader eyebrow="Overview" title="Dashboard" /><Spinner /></>;
  if (error) return <><PageHeader eyebrow="Overview" title="Dashboard" /><ErrorState error={error} retry={reload} /></>;
  const d = data?.data || {}, employees = d.employees || {}, tasks = d.tasks || {};
  const hour = new Date().getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const openCard = (target, key, label) => {
    if (target === 'employees') {
      const status = key === 'active' ? 'Active' : key === 'inactive' ? 'Inactive' : key === 'onLeave' ? 'On Leave' : '';
      navigate(status ? `/employees?status=${encodeURIComponent(status)}` : '/employees');
      return;
    }
    navigate(`/tasks${key === 'overdue' ? '?overdue=true' : key === 'total' ? '' : `?status=${encodeURIComponent(label === 'In progress' ? 'In Progress' : label)}`}`);
  };
  return <><PageHeader eyebrow="Overview" title={`${greeting}, Operations`} description="A clear view of your team's capacity and delivery." action={<button className="button primary" onClick={() => navigate('/tasks/new')}>+ New task</button>} />
    <div className="stats-grid">{cards.map(([section, label, key, target], i) => <button className={`stat-card card-${i % 4}`} key={label} onClick={() => openCard(target, key, label)}><span className="stat-label">{label}</span><strong>{(section === 'employees' ? employees : tasks)[key] ?? 0}</strong><span className="stat-link">View details →</span></button>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><h2>Task pipeline</h2><p>Current work across the workspace</p></div><button className="text-button" onClick={() => navigate('/tasks')}>View all →</button></div><div className="pipeline">{[['todo','Todo'],['inProgress','In progress'],['completed','Completed'],['cancelled','Cancelled']].map(([key,label]) => <div className="pipeline-item" key={key}><span className={`pipeline-icon ${key}`}>●</span><div><b>{tasks[key] || 0}</b><span>{label}</span></div></div>)}</div></section>
      <section className="panel"><div className="panel-head"><div><h2>Team status</h2><p>People availability today</p></div><button className="text-button" onClick={() => navigate('/employees')}>Manage →</button></div><div className="team-status"><div><strong>{employees.active || 0}</strong><span><i className="dot active" />Active</span></div><div><strong>{employees.onLeave || 0}</strong><span><i className="dot leave" />On leave</span></div><div><strong>{employees.inactive || 0}</strong><span><i className="dot inactive" />Inactive</span></div></div></section></div>
    <section className="panel workload"><div className="panel-head"><div><h2>Workload</h2><p>Active tasks by employee</p></div></div>{!d.workload?.length ? <Empty>No active tasks assigned.</Empty> : <div className="workload-list">{d.workload.slice(0, 8).map(person => <div className="workload-row" key={person.employeeId}><div className="avatar small">{person.fullName?.split(' ').map(x => x[0]).join('').slice(0,2)}</div><span>{person.fullName}</span><div className="workload-bar"><i className={`load-${Math.min(3, person.activeTasks)}`} /></div><Badge tone={person.activeTasks >= 3 ? 'critical' : ''}>{person.activeTasks} active</Badge></div>)}</div>}</section>
  </>;
}
