'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function StubPayPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('ready');
  const [error, setError] = useState(null);

  const complete = async () => {
    setStatus('busy');
    setError(null);
    try {
      const res = await fetch(`/api/portal/pay-stub/${token}`, { method: 'POST' });
      if (!res.ok) {
        setStatus('error');
        const data = await res.json().catch(() => ({}));
        setError(typeof data.detail === 'string' ? data.detail : 'Payment could not be completed');
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setError('Payment could not be completed');
    }
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-border rounded-lg p-8 shadow-sm space-y-4 text-center">
        <h1 className="text-lg font-bold text-primary">Test payment</h1>
        <p className="text-sm text-muted">
          Razorpay is not configured. Confirm to mark this invoice paid in the CRM (local stub).
        </p>
        {status === 'done' && (
          <p className="text-sm text-emerald-700">Payment recorded. You can close this page.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {status !== 'done' && (
          <button
            type="button"
            onClick={complete}
            disabled={status === 'busy'}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {status === 'busy' ? 'Recording…' : 'Complete test payment'}
          </button>
        )}
      </div>
    </div>
  );
}
