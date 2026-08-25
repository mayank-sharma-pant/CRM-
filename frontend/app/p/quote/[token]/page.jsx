'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import InvoiceGstSummary from '../../../../components/invoices/InvoiceGstSummary';

function fmt(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function QuoteActions({ token, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const act = async (path) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/quotes/${token}/${path}`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.detail === 'string' ? data.detail : 'Could not update quote');
        return;
      }
      onChanged({
        status: data.status || '',
        canAccept: Boolean(data.can_accept),
        canReject: Boolean(data.can_reject),
      });
    } catch {
      setError('Could not update quote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-4 border-t border-border space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => act('accept')}
          disabled={busy}
          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          Accept quote
        </button>
        <button
          type="button"
          onClick={() => act('reject')}
          disabled={busy}
          className="flex-1 px-4 py-2.5 border border-slate-300 text-sm font-semibold rounded-lg disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

export default function PublicQuotePage() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/portal/quotes/${token}`);
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setDoc({
            number: data.quote_number,
            title: data.title || '',
            companyName: data.company_name || '',
            clientName: data.client_name || '',
            status: data.status || '',
            subtotal: fmt(data.subtotal),
            tax: fmt(data.tax),
            cgst: fmt(data.cgst),
            sgst: fmt(data.sgst),
            igst: fmt(data.igst),
            taxMode: data.tax_mode,
            total: fmt(data.total),
            sellerGstin: data.seller_gstin || '',
            buyerGstin: data.buyer_gstin || '',
            placeOfSupply: data.place_of_supply || '',
            notes: data.notes || '',
            canAccept: Boolean(data.can_accept),
            canReject: Boolean(data.can_reject),
            items: (data.items || []).map((i) => ({
              description: i.description,
              qty: i.quantity || 1,
              unitPrice: fmt(i.unit_price),
              total: fmt(i.total),
              hsn: i.hsn || '',
            })),
          });
          setStatus('success');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }
    if (token) load();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-lg p-8 shadow-sm">
        {status === 'loading' && (
          <p className="text-sm text-muted text-center">Loading quote…</p>
        )}
        {status === 'error' && (
          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-primary">Quote not available</h1>
            <p className="text-sm text-muted">This link is invalid or has been revoked.</p>
          </div>
        )}
        {status === 'success' && doc && (
          <div className="space-y-6">
            <div>
              {doc.companyName && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">{doc.companyName}</p>
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-primary">{doc.number}</h1>
                  {doc.title && <p className="text-sm text-muted mt-1">{doc.title}</p>}
                  <p className="text-sm text-muted mt-1">{doc.clientName}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted">{doc.status}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-medium text-muted">Description</th>
                    <th className="text-left py-2 font-medium text-muted w-20">HSN</th>
                    <th className="text-center py-2 font-medium text-muted w-16">Qty</th>
                    <th className="text-right py-2 font-medium text-muted w-24">Unit</th>
                    <th className="text-right py-2 font-medium text-muted w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {doc.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 text-primary">{item.description}</td>
                      <td className="py-2 text-muted font-mono">{item.hsn || '—'}</td>
                      <td className="py-2 text-center text-muted">{item.qty}</td>
                      <td className="py-2 text-right text-muted">{item.unitPrice}</td>
                      <td className="py-2 text-right font-medium text-primary">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="text-primary">{doc.subtotal}</span>
              </div>
              <InvoiceGstSummary invoice={doc} />
              <div className="border-t border-border pt-2 flex justify-between text-base font-semibold">
                <span className="text-primary">Total</span>
                <span className="text-primary">{doc.total}</span>
              </div>
            </div>

            {(doc.sellerGstin || doc.buyerGstin || doc.placeOfSupply) && (
              <div className="text-xs text-muted space-y-1 pt-2 border-t border-border">
                {doc.sellerGstin && <p>Seller GSTIN: <span className="font-mono">{doc.sellerGstin}</span></p>}
                {doc.buyerGstin && <p>Buyer GSTIN: <span className="font-mono">{doc.buyerGstin}</span></p>}
                {doc.placeOfSupply && <p>Place of supply: {doc.placeOfSupply}</p>}
              </div>
            )}

            {doc.notes && (
              <p className="text-sm text-muted border-t border-border pt-4">{doc.notes}</p>
            )}

            {(doc.canAccept || doc.canReject) && (
              <QuoteActions token={token} onChanged={(next) => setDoc((prev) => ({ ...prev, ...next }))} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
