'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicLeadFormPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState('loading');
  const [meta, setMeta] = useState({ headline: '', company_name: '' });
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    service_type: '',
    notes: '',
    website: '',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
      const res = await fetch(`/api/public/forms/${slug}`);
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setMeta({ headline: data.headline || 'Get a quote', company_name: data.company_name || '' });
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
      const res = await fetch(`/api/public/forms/${slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 429) {
        setError('Too many submissions. Please try again later.');
        return;
      }
      if (res.status === 400) {
        setError('Please enter your name and a phone number or email.');
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
          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-primary">Link not available</h1>
            <p className="text-sm text-muted">This form is invalid or no longer accepting submissions.</p>
          </div>
        )}
        {status === 'success' && (
          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-primary">Thanks</h1>
            <p className="text-sm text-muted">We received your details and will be in touch.</p>
          </div>
        )}
        {status === 'form' && (
          <form onSubmit={onSubmit} className="space-y-4 relative">
            <div>
              {meta.company_name && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">{meta.company_name}</p>
              )}
              <h1 className="text-xl font-bold text-primary">{meta.headline}</h1>
            </div>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Name *
              <input name="name" value={form.name} onChange={onChange} required
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Phone
              <input name="phone" value={form.phone} onChange={onChange}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Email
              <input name="email" type="email" value={form.email} onChange={onChange}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Company
              <input name="company" value={form.company} onChange={onChange}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Service type
              <input name="service_type" value={form.service_type} onChange={onChange}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-tight text-muted">
              Notes
              <textarea name="notes" value={form.notes} onChange={onChange} rows={3}
                className="mt-1 w-full border border-border rounded-md px-3 py-2 text-sm text-primary bg-surface" />
            </label>
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
              <label>
                Website
                <input name="website" value={form.website} onChange={onChange} tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight">
              Submit
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
