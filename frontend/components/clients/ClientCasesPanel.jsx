'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

export default function ClientCasesPanel({ clientId }) {
  const [items, setItems] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const res = await api.get('/cases', { params: { client_id: clientId } });
      setItems(res.data.items || []);
    } catch {
      setError('Could not load cases.');
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/cases', { subject, body, client_id: Number(clientId) });
      setSubject('');
      setBody('');
      await load();
    } catch {
      setError('Could not open case.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 space-y-3">
      <div className="text-sm font-semibold text-slate-900 dark:text-white">Cases</div>
      <form onSubmit={create} className="space-y-2">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Subject"
          className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={2}
          placeholder="Details"
          className="w-full text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5"
        />
        <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white disabled:opacity-50">
          Open case
        </button>
      </form>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">No cases on this client.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li key={c.id} className="text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-200">{c.subject}</span>
              <span className="ml-2 text-xs text-slate-500">{c.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
