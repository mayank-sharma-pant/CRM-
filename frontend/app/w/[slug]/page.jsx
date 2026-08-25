'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function WebsiteWidgetPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading');
  const [meta, setMeta] = useState({ headline: '', company_name: '' });
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '', website: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/public/widget/${slug}`);
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMeta({
            headline: data.headline || 'How can we help?',
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
      const res = await fetch(`/api/public/widget/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 429) {
        setError('Too many messages. Please try again later.');
        return;
      }
      if (res.status === 400) {
        setError('Enter your name and a phone number or email.');
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
    <div className="h-full min-h-screen bg-slate-50 text-slate-900 p-4">
      {status === 'loading' && <p className="text-sm text-slate-500">Loading…</p>}
      {status === 'error' && (
        <div>
          <h1 className="text-base font-semibold">Widget unavailable</h1>
          <p className="text-sm text-slate-500 mt-1">This chat form is not accepting messages.</p>
        </div>
      )}
      {status === 'success' && (
        <div>
          <h1 className="text-base font-semibold">Thanks</h1>
          <p className="text-sm text-slate-500 mt-1">We received your message and will be in touch.</p>
        </div>
      )}
      {status === 'form' && (
        <form onSubmit={onSubmit} className="space-y-3 relative">
          {meta.company_name && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{meta.company_name}</p>
          )}
          <h1 className="text-lg font-semibold">{meta.headline}</h1>
          <label className="block text-[12px] font-medium text-slate-600">
            Name
            <input name="name" value={form.name} onChange={onChange} required
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block text-[12px] font-medium text-slate-600">
            Phone
            <input name="phone" value={form.phone} onChange={onChange}
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block text-[12px] font-medium text-slate-600">
            Email
            <input name="email" type="email" value={form.email} onChange={onChange}
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block text-[12px] font-medium text-slate-600">
            Message
            <textarea name="message" value={form.message} onChange={onChange} rows={3}
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </label>
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
            <label>
              Website
              <input name="website" value={form.website} onChange={onChange} tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
