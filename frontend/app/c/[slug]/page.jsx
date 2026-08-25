'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicWebToCasePage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading');
  const [meta, setMeta] = useState({ headline: '', company_name: '' });
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    body: '',
    website: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/public/cases/${slug}`);
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMeta({
            headline: data.headline || 'Request support',
            company_name: data.company_name || '',
          });
          setStatus('form');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    if (slug) load();
    return () => { cancelled = true; };
  }, [slug]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/public/cases/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 429) {
        setError('Too many submissions. Please try again later.');
        return;
      }
      if (res.status === 400) {
        setError('Please enter your name, email, subject, and message.');
        return;
      }
      if (!res.ok) {
        setError('Could not send. Please try again.');
        return;
      }
      setStatus('success');
    } catch {
      setError('Could not send. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 shadow-sm">
        {status === 'loading' && (
          <p className="text-sm text-muted text-center">Loading form…</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600 text-center">This form is not available.</p>
        )}
        {status === 'success' && (
          <p className="text-sm text-slate-700 text-center">Thanks. We received your request.</p>
        )}
        {status === 'form' && (
          <form onSubmit={onSubmit} className="space-y-3">
            <h1 className="text-lg font-semibold text-slate-900">{meta.headline}</h1>
            {meta.company_name && (
              <p className="text-xs text-slate-500">{meta.company_name}</p>
            )}
            <label className="block text-xs text-slate-500">
              Name
              <input name="name" value={form.name} onChange={onChange} required className="mt-1 w-full text-sm rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="block text-xs text-slate-500">
              Email
              <input name="email" type="email" value={form.email} onChange={onChange} required className="mt-1 w-full text-sm rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="block text-xs text-slate-500">
              Subject
              <input name="subject" value={form.subject} onChange={onChange} required className="mt-1 w-full text-sm rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <label className="block text-xs text-slate-500">
              Message
              <textarea name="body" value={form.body} onChange={onChange} required rows={4} className="mt-1 w-full text-sm rounded-md border border-slate-300 px-2 py-1.5" />
            </label>
            <div className="hidden" aria-hidden="true">
              <input name="website" value={form.website} onChange={onChange} tabIndex={-1} autoComplete="off" />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" className="w-full px-3 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
