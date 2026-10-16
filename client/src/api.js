const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const body = await response.json(); message = body.message || body.error || message; } catch { /* non-json */ }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
}
export const query = (params) => new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
export const dateOnly = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
export const downloadCsv = async (params = {}) => {
  const response = await fetch(`${BASE}/export/tasks.csv?${query(params)}`);
  if (!response.ok) throw new Error('Unable to export tasks');
  const blob = await response.blob(); const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'tasks.csv'; anchor.click(); URL.revokeObjectURL(url);
};
