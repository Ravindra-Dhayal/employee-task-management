import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Tasks from './pages/Tasks';
import { EmployeeFormPage, EmployeeViewPage, TaskFormPage, TaskViewPage } from './pages/FormPages';
import NotFound from './pages/NotFound';

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/employees" element={<Employees />} />
    <Route path="/employees/new" element={<EmployeeFormPage />} />
    <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
    <Route path="/employees/:id" element={<EmployeeViewPage />} />
    <Route path="/tasks" element={<Tasks />} />
    <Route path="/tasks/new" element={<TaskFormPage />} />
    <Route path="/tasks/:id/edit" element={<TaskFormPage />} />
    <Route path="/tasks/:id" element={<TaskViewPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Layout>;
}
