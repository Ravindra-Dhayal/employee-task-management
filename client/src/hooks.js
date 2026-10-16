import { useCallback, useEffect, useState } from 'react';
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reload = useCallback(() => { setState(s => ({ ...s, loading: true, error: null })); loader().then(data => setState({ data, loading: false, error: null })).catch(error => setState({ data: null, loading: false, error })); }, deps);
  useEffect(() => { let active = true; setState(s => ({ ...s, loading: true, error: null })); loader().then(data => active && setState({ data, loading: false, error: null })).catch(error => active && setState({ data: null, loading: false, error })); return () => { active = false; }; }, deps);
  return { ...state, reload };
}
export function useToast() { const [toast, setToast] = useState(null); const show = (message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 4500); }; return { toast, show, clear: () => setToast(null) }; }
