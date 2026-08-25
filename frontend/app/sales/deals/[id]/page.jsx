'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import api from '../../../../services/api';
import { useNotification } from '../../../../contexts/NotificationContext';
import MeetingCallPanel from '../../../../components/activity/MeetingCallPanel';
import ShareLinkControls from '../../../../components/portal/ShareLinkControls';

export default function DealDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { id } = useParams();
  const { showToast } = useNotification();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [amount, setAmount] = useState('');
  const [probability, setProbability] = useState('');
  const [expectedClose, setExpectedClose] = useState('');
  const [quotes, setQuotes] = useState([]);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [quoteLines, setQuoteLines] = useState([
    { description: '', quantity: 1, unit_price: 0, product_id: null, tax_rate: null },
  ]);

  useEffect(() => {
    fetchDeal();
  }, [id]);

  useEffect(() => {
    api.get('/products', { params: { active_only: true } })
      .then((res) => setProducts(res.data?.items || []))
      .catch(() => setProducts([]));
  }, []);

  const fetchDeal = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await api.get(`/deals/${id}`);
      const data = res.data;
      setDeal(data);
      setAmount(data.amount ?? '');
      setProbability(data.probability ?? '');
      setExpectedClose(data.expected_close ? String(data.expected_close).slice(0, 10) : '');
      const q = await api.get('/quotes', { params: { deal_id: id } });
      setQuotes(q.data.items || []);
    } catch (err) {
      console.error('Failed to fetch deal', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError('Unable to load this deal. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      if (amount !== '') payload.amount = Number(amount);
      if (probability !== '') payload.probability = Number(probability);
      payload.expected_close = expectedClose || null;
      await api.patch(`/deals/${id}`, payload);
      showToast('Deal updated', 'success');
      await fetchDeal();
    } catch (err) {
      console.error('Failed to update deal', err);
      showToast(err.response?.data?.detail || 'Failed to update deal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const refreshQuotes = async () => {
    const q = await api.get('/quotes', { params: { deal_id: id } });
    setQuotes(q.data.items || []);
  };

  const openQuoteEditor = () => {
    setQuoteLines([
      {
        description: deal?.title || '',
        quantity: 1,
        unit_price: Number(deal?.amount || 0),
        product_id: null,
        tax_rate: null,
      },
    ]);
    setQuoteEditorOpen(true);
  };

  const updateQuoteLine = (idx, field, value) => {
    setQuoteLines((prev) => {
      const next = [...prev];
      if (field === 'product_id') {
        const productId = value ? parseInt(value, 10) : null;
        next[idx] = {
          ...next[idx],
          product_id: Number.isFinite(productId) ? productId : null,
        };
        if (next[idx].product_id) {
          const selected = products.find((p) => p.id === next[idx].product_id);
          if (selected) {
            next[idx].description = selected.name || next[idx].description;
            next[idx].unit_price = Number(selected.unit_price || 0);
            next[idx].tax_rate = Number(selected.tax_rate);
          }
        } else {
          next[idx].tax_rate = null;
        }
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  const addQuoteLine = () => {
    setQuoteLines((prev) => [
      ...prev,
      { description: '', quantity: 1, unit_price: 0, product_id: null, tax_rate: null },
    ]);
  };

  const removeQuoteLine = (idx) => {
    setQuoteLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const quoteSubtotal = quoteLines.reduce(
    (sum, line) => sum + (Number(line.unit_price) || 0) * (Number(line.quantity) || 0),
    0
  );
  const quoteTaxPreview = quoteLines.reduce((sum, line) => {
    const amount = (Number(line.unit_price) || 0) * (Number(line.quantity) || 0);
    return sum + amount * (Number(line.tax_rate ?? 18) / 100);
  }, 0);

  const createQuote = async () => {
    if (!deal.client_id) {
      showToast('Attach a client on this deal before quoting', 'error');
      return;
    }
    if (quoteLines.some((line) => !String(line.description || '').trim())) {
      showToast('Each quote line needs a description', 'error');
      return;
    }
    setQuoteBusy(true);
    try {
      await api.post('/quotes', {
        deal_id: Number(id),
        client_id: deal.client_id,
        items: quoteLines.map((line) => ({
          description: String(line.description).trim(),
          quantity: Number(line.quantity) || 1,
          unit_price: String(Number(line.unit_price) || 0),
          product_id: line.product_id || null,
        })),
      });
      showToast('Quote created', 'success');
      setQuoteEditorOpen(false);
      await refreshQuotes();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not create quote', 'error');
    } finally {
      setQuoteBusy(false);
    }
  };

  const quoteAction = async (quoteId, action) => {
    setQuoteBusy(true);
    try {
      const res = await api.post(`/quotes/${quoteId}/${action}`);
      if (action === 'accept' && res.data.invoice_id) {
        await api.post(`/invoices/${res.data.invoice_id}/payment-link`);
        showToast('Quote accepted — payment link ready', 'success');
        await refreshQuotes();
        return;
      }
      showToast(action === 'reject' ? 'Quote rejected' : 'Updated', 'success');
      await refreshQuotes();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Quote action failed', 'error');
    } finally {
      setQuoteBusy(false);
    }
  };

  const backHref = pathname.replace(/\/[^/]+$/, '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[13px] text-muted font-bold uppercase tracking-widest">Deal not found</div>
          <button onClick={() => router.push(backHref)} className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight">Back to Deals</button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</div>
          <button onClick={fetchDeal} className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100 pb-12">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push(backHref)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{deal.title}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">
                {deal.stage_name || deal.stage?.name || `Stage ${deal.stage_id ?? ''}`}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>Amount: {deal.amount}</span>
              <span>•</span>
              <span>Effective probability: {deal.effective_probability != null ? `${deal.effective_probability}%` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Deal Overview</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Created</span>
              <span className="text-slate-700 dark:text-slate-300">{deal.created_at ? new Date(deal.created_at).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Closed at</span>
              <span className="text-slate-700 dark:text-slate-300">{deal.closed_at ? new Date(deal.closed_at).toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Weighted value</span>
              <span className="text-slate-700 dark:text-slate-300">{deal.weighted_value ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Edit Deal</h2>

          <label className="block">
            <span className="block text-[10px] text-slate-400 uppercase mb-1">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="block text-[10px] text-slate-400 uppercase mb-1">Probability (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="block">
            <span className="block text-[10px] text-slate-400 uppercase mb-1">Expected close</span>
            <input
              type="date"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save changes
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quotes</h2>
            <button
              type="button"
              onClick={openQuoteEditor}
              disabled={quoteBusy}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg disabled:opacity-50"
            >
              New quote
            </button>
          </div>

          {quoteEditorOpen && (
            <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Quote lines</h3>
                <button
                  type="button"
                  onClick={addQuoteLine}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  Add line
                </button>
              </div>
              {quoteLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 md:col-span-3">
                    <label htmlFor={`quote-product-${idx}`} className="block text-[10px] text-slate-400 uppercase mb-1">Product</label>
                    <select
                      id={`quote-product-${idx}`}
                      value={line.product_id || ''}
                      onChange={(e) => updateQuoteLine(idx, 'product_id', e.target.value)}
                      className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    >
                      <option value="">Free-text</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.tax_rate}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-12 md:col-span-4">
                    <label htmlFor={`quote-desc-${idx}`} className="block text-[10px] text-slate-400 uppercase mb-1">Description</label>
                    <input
                      id={`quote-desc-${idx}`}
                      type="text"
                      value={line.description}
                      onChange={(e) => updateQuoteLine(idx, 'description', e.target.value)}
                      className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label htmlFor={`quote-qty-${idx}`} className="block text-[10px] text-slate-400 uppercase mb-1">Qty</label>
                    <input
                      id={`quote-qty-${idx}`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => updateQuoteLine(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div className="col-span-5 md:col-span-2">
                    <label htmlFor={`quote-price-${idx}`} className="block text-[10px] text-slate-400 uppercase mb-1">Price</label>
                    <input
                      id={`quote-price-${idx}`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.unit_price}
                      onChange={(e) => updateQuoteLine(idx, 'unit_price', e.target.value)}
                      className="w-full px-2 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1 flex justify-end pb-0.5">
                    {quoteLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuoteLine(idx)}
                        className="px-2 py-2 text-[11px] font-bold text-slate-400 hover:text-red-500"
                        aria-label="Remove line"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-300 space-x-4">
                  <span>Subtotal ₹{quoteSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span>Tax ₹{quoteTaxPreview.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteEditorOpen(false)}
                    className="px-3 py-1.5 border border-slate-300 text-[11px] font-bold uppercase rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={createQuote}
                    disabled={quoteBusy}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase rounded-lg disabled:opacity-50"
                  >
                    Create quote
                  </button>
                </div>
              </div>
            </div>
          )}

          {quotes.length === 0 ? (
            <p className="text-sm text-slate-500">No quotes yet. Add lines and create one from this deal.</p>
          ) : (
            <ul className="space-y-3">
              {quotes.map((q) => (
                <li key={q.id} className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{q.quote_number}</span>
                    <span className="uppercase text-[10px] font-bold tracking-wide">{q.status}</span>
                  </div>
                  <div className="text-slate-500 mt-1">
                    Subtotal {q.subtotal ?? '—'} · Tax {q.tax ?? 0} · Total {q.total}
                  </div>
                  {q.invoice_id && <div className="text-slate-500">Invoice #{q.invoice_id}</div>}
                  {q.payment_url && (
                    <div className="mt-1 break-all text-xs text-blue-600">{q.payment_url}</div>
                  )}
                  <div className="mt-2">
                    <ShareLinkControls
                      kind="quote"
                      id={q.id}
                      shareActive={q.share_active}
                      onChange={fetchDeal}
                    />
                  </div>
                  {q.status === 'draft' && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" disabled={quoteBusy} onClick={() => quoteAction(q.id, 'accept')}
                        className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-bold uppercase rounded">Accept</button>
                      <button type="button" disabled={quoteBusy} onClick={() => quoteAction(q.id, 'reject')}
                        className="px-2 py-1 border border-slate-300 text-[11px] font-bold uppercase rounded">Reject</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-6">
        <MeetingCallPanel parentType="deal" parentId={id} />
      </div>
    </div>
  );
}
