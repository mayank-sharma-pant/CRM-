'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';

function apiDetail(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

export default function QuotationWizard({
  initialClientId = null,
  initialDealId = null,
  lockClient = false,
  lockDeal = false,
  onCreated,
  onCancel,
}) {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [clientId, setClientId] = useState(initialClientId ? String(initialClientId) : '');
  const [dealId, setDealId] = useState(initialDealId ? String(initialDealId) : '');
  const [planId, setPlanId] = useState('');
  const [planName, setPlanName] = useState('');
  const [project, setProject] = useState('');
  const [website, setWebsite] = useState('');
  const [fee, setFee] = useState('');
  const [feeInclusive, setFeeInclusive] = useState(true);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [validityDays, setValidityDays] = useState('5');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [scopeText, setScopeText] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [clientsRes, plansRes, settingsRes] = await Promise.all([
          api.get('/clients', { params: { limit: 200 } }),
          api.get('/quote-plans', { params: { active_only: true } }),
          api.get('/admin/settings').catch(() => null),
        ]);
        if (cancelled) return;
        const clientItems = clientsRes.data?.items || clientsRes.data || [];
        setClients(Array.isArray(clientItems) ? clientItems : []);
        setPlans(Array.isArray(plansRes.data?.items) ? plansRes.data.items : []);
        if (settingsRes?.data?.quote_validity_days) {
          setValidityDays(String(settingsRes.data.quote_validity_days));
        }
      } catch (err) {
        if (!cancelled) setError(apiDetail(err, 'Could not load quotation form.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => String(p.id) === String(planId)) || null,
    [plans, planId]
  );

  useEffect(() => {
    if (!selectedPlan) return;
    setPlanName(selectedPlan.name || '');
    setFee(String(selectedPlan.default_fee || ''));
    setFeeInclusive(Boolean(selectedPlan.fee_inclusive));
    setBillingInterval(selectedPlan.billing_interval || 'monthly');
    setScopeText(selectedPlan.scope_text || '');
    if (!project) setProject(selectedPlan.tagline || selectedPlan.name || '');
  }, [selectedPlan]);

  const submit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      setError('Select a client.');
      return;
    }
    if (!planName.trim() && !planId) {
      setError('Select a plan or enter a plan name.');
      return;
    }
    if (fee === '' || Number(fee) < 0) {
      setError('Enter a valid fee.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        client_id: Number(clientId),
        deal_id: dealId ? Number(dealId) : null,
        plan_id: planId ? Number(planId) : null,
        plan_name: planName.trim() || null,
        project: project.trim() || null,
        website: website.trim() || null,
        fee: String(Number(fee)),
        fee_inclusive: feeInclusive,
        billing_interval: billingInterval,
        validity_days: Number(validityDays) || 5,
        executive_summary: executiveSummary.trim() || null,
        scope_text: scopeText.trim() || null,
        title: planName.trim() || null,
      };
      const res = await api.post('/quotes', payload);
      onCreated?.(res.data);
    } catch (err) {
      setError(apiDetail(err, 'Could not create quotation.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Client</span>
          <select
            value={clientId}
            disabled={lockClient}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
            required
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Deal ID (optional)</span>
          <input
            type="number"
            value={dealId}
            disabled={lockDeal}
            onChange={(e) => setDealId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
            placeholder="Link to a deal"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Plan</span>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
          >
            <option value="">Custom / one-off</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · ₹{Number(p.default_fee).toLocaleString('en-IN')} ({p.billing_interval})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Plan name</span>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
            required
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Billing</span>
          <select
            value={billingInterval}
            onChange={(e) => setBillingInterval(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
          >
            <option value="monthly">Monthly</option>
            <option value="one_time">One time</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Fee (₹)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
            required
          />
        </label>

        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={feeInclusive}
            onChange={(e) => setFeeInclusive(e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-secondary">Fee includes GST</span>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Project</span>
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Website</span>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
            placeholder="example.com"
          />
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Validity (days)</span>
          <input
            type="number"
            min={1}
            value={validityDays}
            onChange={(e) => setValidityDays(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Executive summary</span>
        <textarea
          value={executiveSummary}
          onChange={(e) => setExecutiveSummary(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface"
          placeholder="Optional commercial proposal paragraph"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-wide text-muted mb-1">Scope (one bullet per line)</span>
        <textarea
          value={scopeText}
          onChange={(e) => setScopeText(e.target.value)}
          rows={6}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-surface font-mono"
          placeholder={"Visibility audit\nOngoing optimization\nMonthly summary"}
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm font-semibold rounded-lg border border-border"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Create quotation
        </button>
      </div>
    </form>
  );
}
