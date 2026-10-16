import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatDate } from '../api';
import { Badge, ErrorState, FormField, LinkButton, PageHeader, Spinner, Toast } from '../components/UI';
import { useFetch, useToast } from '../hooks';

const departments = ['Development', 'Design', 'QA', 'HR', 'Sales'];
const employeeStatuses = ['Active', 'Inactive', 'On Leave'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];
const taskStatuses = ['Todo', 'In Progress', 'Completed', 'Cancelled'];
const employeeBlank = { employeeId: '', fullName: '', email: '', phone: '', department: 'Development', role: '', joiningDate: '', status: 'Active', skills: '', leaveStart: '', leaveEnd: '' };
const taskBlank = { title: '', description: '', assignedEmployee: '', department: '', priority: 'Medium', startDate: '', dueDate: '' };
const dateInputValue = value => {
  if (!value) return '';
  const text = String(value);
  return text.length >= 10 ? text.slice(0, 10) : text;
};

function validateEmployee(form) {
  const errors = {};
  if (!form.employeeId.trim()) errors.employeeId = 'Employee ID is required.';
  if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
  if (!/^\+?[0-9\s().-]{7,20}$/.test(form.phone)) errors.phone = 'Enter a valid phone number.';
  if (!form.role.trim()) errors.role = 'Role is required.';
  if (!form.joiningDate) errors.joiningDate = 'Joining date is required.';
  if (form.status === 'On Leave' && !form.leaveStart) errors.leaveStart = 'Leave start is required.';
  if (form.status === 'On Leave' && !form.leaveEnd) errors.leaveEnd = 'Leave end is required.';
  if (form.leaveStart && form.leaveEnd && form.leaveEnd < form.leaveStart) errors.leaveEnd = 'Leave end must be after leave start.';
  return errors;
}
function validateTask(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.assignedEmployee) errors.assignedEmployee = 'Choose an employee.';
  if (!form.department) errors.department = 'Choose a department.';
  if (!form.startDate) errors.startDate = 'Start date is required.';
  if (!form.dueDate) errors.dueDate = 'Due date is required.';
  if (form.startDate && form.dueDate && form.dueDate < form.startDate) errors.dueDate = 'Due date must be after start date.';
  return errors;
}

function EmployeeForm({ initial, onSave, saving, submitError }) {
  const [form, setForm] = useState(() => ({ ...employeeBlank, ...initial, joiningDate: dateInputValue(initial?.joiningDate), leaveStart: dateInputValue(initial?.leaveStart), leaveEnd: dateInputValue(initial?.leaveEnd), skills: Array.isArray(initial?.skills) ? initial.skills.join(', ') : (initial?.skills || '') }));
  const [errors, setErrors] = useState({});
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = e => { e.preventDefault(); const next = validateEmployee(form); setErrors(next); if (Object.keys(next).length) return; const payload = { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) }; if (form.status !== 'On Leave') { delete payload.leaveStart; delete payload.leaveEnd; } onSave(payload); };
  return <form className="form-grid" onSubmit={submit} noValidate>
    {['employeeId', 'fullName', 'email', 'phone', 'role', 'joiningDate'].map(name => <FormField key={name} label={{ employeeId: 'Employee ID', fullName: 'Full name', email: 'Email', phone: 'Phone', role: 'Role', joiningDate: 'Joining date' }[name]} required error={errors[name]}><input name={name} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : name === 'joiningDate' ? 'date' : 'text'} value={form[name] || ''} onChange={update} /></FormField>)}
    <FormField label="Department" required><select name="department" value={form.department} onChange={update}>{departments.map(x => <option key={x}>{x}</option>)}</select></FormField>
    <FormField label="Status"><select name="status" value={form.status} onChange={update}>{employeeStatuses.map(x => <option key={x}>{x}</option>)}</select></FormField>
    <FormField label="Skills"><input name="skills" value={form.skills} placeholder="React, QA, Leadership" onChange={update} /></FormField>
    {form.status === 'On Leave' && <><FormField label="Leave start" required error={errors.leaveStart}><input required name="leaveStart" type="date" value={form.leaveStart || ''} onChange={update} /></FormField><FormField label="Leave end" required error={errors.leaveEnd}><input required name="leaveEnd" type="date" value={form.leaveEnd || ''} onChange={update} /></FormField></>}
    {submitError && <div className="form-error full-field">{submitError}</div>}
    <div className="form-actions"><LinkButton to="/employees">Cancel</LinkButton><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save employee'}</button></div>
  </form>;
}

export function EmployeeFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [initial, setInitial] = useState(id ? null : employeeBlank); const [loading, setLoading] = useState(Boolean(id)); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (id) api(`/employees/${id}`).then(r => setInitial(r.data)).catch(e => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  const save = async payload => { setSaving(true); setError(''); try { const r = await api(id ? `/employees/${id}` : '/employees', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); navigate(`/employees/${r.data?._id || id}`, { replace: true }); } catch (e) { setError(e.message); } finally { setSaving(false); } };
  if (loading) return <Spinner />; if (error && !initial) return <ErrorState error={{ message: error }} />;
  return <><PageHeader eyebrow="People" title={id ? 'Edit employee' : 'Add employee'} description="Keep employee details and availability up to date." /><section className="panel form-panel"><EmployeeForm initial={initial} onSave={save} saving={saving} submitError={error} /></section></>;
}

export function EmployeeViewPage() {
  const { id } = useParams(); const nav = useNavigate(); const { toast, show, clear } = useToast(); const { data, loading, error, reload } = useFetch(() => api(`/employees/${id}`), [id]); const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />; if (error) return <ErrorState error={error} retry={reload} />; const e = data.data;
  const remove = async () => { if (!confirm('Delete this employee?')) return; setBusy(true); try { await api(`/employees/${id}`, { method: 'DELETE' }); nav('/employees'); } catch (x) { show(x.message, 'error'); setBusy(false); } };
  return <><PageHeader eyebrow="People / Profile" title={e.fullName} description={`${e.employeeId} · ${e.role}`} action={<div className="header-actions"><LinkButton to="/employees">← Back</LinkButton><LinkButton to={`/employees/${id}/edit`}>Edit</LinkButton><button className="button danger" disabled={busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete'}</button></div>} /><div className="detail-grid"><section className="panel profile"><div className="profile-avatar">{e.fullName.split(' ').map(x => x[0]).join('').slice(0, 2)}</div><h2>{e.fullName}</h2><Badge tone={e.status === 'Active' ? 'active' : e.status === 'On Leave' ? 'leave' : 'inactive'}>{e.status}</Badge><dl><dt>Department</dt><dd>{e.department}</dd><dt>Role</dt><dd>{e.role}</dd><dt>Email</dt><dd><a href={`mailto:${e.email}`}>{e.email}</a></dd><dt>Phone</dt><dd>{e.phone}</dd><dt>Joining date</dt><dd>{formatDate(e.joiningDate)}</dd></dl></section><section className="panel"><div className="panel-head"><div><h2>Skills</h2><p>Areas of expertise</p></div></div><div className="skill-list">{(e.skills || []).map(s => <span key={s}>{s}</span>)}</div>{e.status === 'On Leave' && <div className="leave-note">On leave from <b>{formatDate(e.leaveStart)}</b> to <b>{formatDate(e.leaveEnd)}</b></div>}</section></div><Toast toast={toast} onClose={clear} /></>;
}

function TaskForm({ initial, employees, onSave, saving, submitError }) {
  const [form, setForm] = useState(() => ({ ...taskBlank, ...initial, startDate: dateInputValue(initial?.startDate), dueDate: dateInputValue(initial?.dueDate), assignedEmployee: initial?.assignedEmployee?._id || initial?.assignedEmployee || '' })); const [errors, setErrors] = useState({});
  const update = e => {
    const { name, value } = e.target;
    if (name === 'assignedEmployee') {
      const employee = employees.find(item => item._id === value);
      setForm({ ...form, assignedEmployee: value, department: employee?.department || '' });
      return;
    }
    setForm({ ...form, [name]: value });
  };
  const submit = e => { e.preventDefault(); const next = validateTask(form); setErrors(next); if (!Object.keys(next).length) onSave(form); };
  return <form className="form-grid" onSubmit={submit} noValidate><FormField label="Title" required error={errors.title}><input name="title" value={form.title} onChange={update} /></FormField><FormField label="Assignee" required error={errors.assignedEmployee}><select name="assignedEmployee" value={form.assignedEmployee} onChange={update}><option value="">Choose employee</option>{employees.map(e => <option value={e._id} key={e._id}>{e.fullName}</option>)}</select></FormField><FormField label="Department" required error={errors.department}><select name="department" value={form.department} onChange={update}><option value="">Choose department</option>{departments.map(x => <option key={x}>{x}</option>)}</select></FormField><FormField label="Priority"><select name="priority" value={form.priority} onChange={update}>{priorities.map(x => <option key={x}>{x}</option>)}</select></FormField><FormField label="Start date" required error={errors.startDate}><input type="date" name="startDate" value={form.startDate?.slice(0, 10) || ''} onChange={update} /></FormField><FormField label="Due date" required error={errors.dueDate}><input type="date" name="dueDate" value={form.dueDate?.slice(0, 10) || ''} onChange={update} /></FormField><FormField label="Description"><textarea className="full-field" name="description" value={form.description || ''} onChange={update} /></FormField>{submitError && <div className="form-error full-field">{submitError}</div>}<div className="form-actions"><LinkButton to="/tasks">Cancel</LinkButton><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Save task'}</button></div></form>;
}

export function TaskFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [initial, setInitial] = useState(id ? null : taskBlank); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const employeeReq = useFetch(() => api('/employees?limit=100'), []);
  useEffect(() => { if (id) api(`/tasks/${id}`).then(r => setInitial(r.data)).catch(e => setError(e.message)); }, [id]);
  if (id && !initial) return error ? <ErrorState error={{ message: error }} /> : <Spinner />;
  const save = async payload => { setSaving(true); setError(''); try { const r = await api(id ? `/tasks/${id}` : '/tasks', { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) }); navigate(`/tasks/${r.data?._id || id}`, { replace: true }); } catch (e) { setError(e.message); } finally { setSaving(false); } };
  return <><PageHeader eyebrow="Delivery" title={id ? 'Edit task' : 'Create task'} description="Capture the work, ownership and delivery dates." /><section className="panel form-panel"><TaskForm initial={initial} employees={employeeReq.data?.data || []} onSave={save} saving={saving} submitError={error} /></section></>;
}

export function TaskViewPage() {
  const { id } = useParams(); const nav = useNavigate(); const { toast, show, clear } = useToast(); const { data, loading, error, reload } = useFetch(() => api(`/tasks/${id}`), [id]); const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />; if (error) return <ErrorState error={error} retry={reload} />; const t = data.data; const next = { Todo: ['In Progress', 'Cancelled'], 'In Progress': ['Completed', 'Cancelled'] }[t.status] || [];
  const action = async fn => { setBusy(true); try { await fn(); reload(); } catch (e) { show(e.message, 'error'); } finally { setBusy(false); } };
  const employee = t.employeeDisplay || t.assignedEmployee || t.employeeSnapshot || {};
  return <><PageHeader eyebrow="Delivery / Task details" title={t.title} description={t.taskId || t._id} action={<div className="header-actions"><LinkButton to="/tasks">← Back</LinkButton>{!['Completed', 'Cancelled'].includes(t.status) && <LinkButton to={`/tasks/${id}/edit`}>Edit</LinkButton>}<button className="button danger" disabled={busy} onClick={() => { if (confirm('Delete this task?')) action(() => api(`/tasks/${id}`, { method: 'DELETE' }).then(() => nav('/tasks'))); }}>Delete</button></div>} /><div className="detail-grid"><section className="panel"><div className="task-status-head"><Badge>{t.status}</Badge><Badge>{t.priority}</Badge>{t.overdue && <Badge tone="critical">Overdue</Badge>}</div><h2>Description</h2><p className="description">{t.description || 'No description provided.'}</p><div className="detail-meta"><div><span>Start date</span><b>{formatDate(t.startDate)}</b></div><div><span>Due date</span><b className={t.overdue ? 'overdue' : ''}>{formatDate(t.dueDate)}</b></div><div><span>Department</span><b>{t.department}</b></div></div>{next.length > 0 && <div className="transition-actions"><span>Move task to</span>{next.map(s => <button disabled={busy} className={`button ${s === 'Cancelled' ? 'danger' : 'primary'}`} key={s} onClick={() => action(() => api(`/tasks/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: s }) }))}>{s}</button>)}</div>}</section><section className="panel assignee"><h2>Assigned to</h2><div className="person"><span className="avatar">{(employee.fullName || '?').split(' ').map(x => x[0]).join('').slice(0, 2)}</span><span><b>{employee.fullName || '(deleted employee)'}</b><small>{employee.employeeId || ''}{employee.department ? ` · ${employee.department}` : ''}</small></span></div></section></div><Toast toast={toast} onClose={clear} /></>;
}
