'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Target, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';

const STRING_OPS = ['eq', 'ne', 'in', 'is_set', 'is_empty'];
const ENUM_OPS = ['eq', 'ne', 'in'];
const PRESENCE_OPS = ['is_set', 'is_empty'];
const NUM_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];

const FIELDS = {
  lead: [
    { value: 'source', label: 'Source', ops: STRING_OPS },
    { value: 'industry', label: 'Industry', ops: STRING_OPS },
    { value: 'status', label: 'Status', ops: ENUM_OPS },
    { value: 'email', label: 'Email', ops: PRESENCE_OPS },
    { value: 'phone', label: 'Phone', ops: PRESENCE_OPS },
    { value: 'website', label: 'Website', ops: PRESENCE_OPS },
    { value: 'days_since_last_contact', label: 'Days since last contact', ops: NUM_OPS },
    { value: 'age_days', label: 'Age (days)', ops: NUM_OPS },
  ],
  deal: [
    { value: 'amount', label: 'Amount', ops: NUM_OPS },
    { value: 'stage_id', label: 'Stage id', ops: ENUM_OPS },
    { value: 'probability', label: 'Probability', ops: NUM_OPS },
    { value: 'days_to_expected_close', label: 'Days to expected close', ops: NUM_OPS },
    { value: 'age_days', label: 'Age (days)', ops: NUM_OPS },
  ],
};

const OP_LABELS = {
  eq: '=', ne: '≠', in: 'in', gt: '>', gte: '≥', lt: '<', lte: '≤',
  is_set: 'is set', is_empty: 'is empty',
};

const NO_VALUE = new Set(['is_set', 'is_empty']);

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function ScoringSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [entityType, setEntityType] = useState('lead');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rules, setRules] = useState([]);
  const [recomputing, setRecomputing] = useState(false);

  const fieldsForType = FIELDS[entityType];
  const [field, setField] = useState(fieldsForType[0].value);
  const [operator, setOperator] = useState(fieldsForType[0].ops[0]);
  const [value, setValue] = useState('');
  const [points, setPoints] = useState('10');
  const [creating, setCreating] = useState(false);

  const currentField = fieldsForType.find((f) => f.value === field) || fieldsForType[0];
  const needsValue = !NO_VALUE.has(operator);

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/scoring/rules?entity_type=${entityType}`);
      setRules(res.data.items || []);
    } catch (err) {
      setError(formatError(err, 'Could not load scoring rules.'));
    } finally {
      setLoading(false);
    }
  }, [allowed, entityType]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep field/operator valid when entity type changes.
  useEffect(() => {
    const first = FIELDS[entityType][0];
    setField(first.value);
    setOperator(first.ops[0]);
  }, [entityType]);

  const onFieldChange = (nextField) => {
    setField(nextField);
    const def = fieldsForType.find((f) => f.value === nextField);
    if (def && !def.ops.includes(operator)) {
      setOperator(def.ops[0]);
    }
  };

  const createRule = async (e) => {
    e.preventDefault();
    if (needsValue && !value.trim()) {
      showToast('Value is required for this operator', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post('/scoring/rules', {
        entity_type: entityType,
        field,
        operator,
        value: needsValue ? value.trim() : null,
        points: Number(points) || 0,
      });
      setValue('');
      setPoints('10');
      showToast('Rule created', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create rule.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const removeRule = async (id) => {
    if (!window.confirm('Delete this scoring rule?')) return;
    try {
      await api.delete(`/scoring/rules/${id}`);
      showToast('Rule deleted', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete rule.'), 'error');
    }
  };

  const recompute = async () => {
    setRecomputing(true);
    try {
      const res = await api.post('/scoring/recompute', { entity_type: entityType });
      showToast(`Recomputed ${res.data.updated} ${entityType}s`, 'success');
    } catch (err) {
      showToast(formatError(err, 'Could not recompute scores.'), 'error');
    } finally {
      setRecomputing(false);
    }
  };

  const fieldLabel = (v) => fieldsForType.find((f) => f.value === v)?.label || v;

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <p className="text-sm text-slate-500">Only admin or MD can manage scoring rules.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6 mb-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            ← Settings
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Lead &amp; deal scoring</h1>
          <p className="text-sm text-slate-500 mt-1">
            Add point rules; each matching rule adds (or subtracts) its points. Scores refresh on
            create/update and when rules change.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {['lead', 'deal'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEntityType(t)}
                className={`px-4 py-1.5 text-xs font-semibold capitalize ${
                  entityType === t
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={recompute}
            disabled={recomputing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={recomputing ? 'animate-spin' : ''} />
            {recomputing ? 'Recomputing…' : 'Recompute now'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <form
          onSubmit={createRule}
          className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Add rule</h2>
          <div className="flex flex-wrap items-end gap-2">
            <select
              value={field}
              onChange={(e) => onFieldChange(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
            >
              {fieldsForType.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
            >
              {currentField.ops.map((op) => (
                <option key={op} value={op}>{OP_LABELS[op]}</option>
              ))}
            </select>
            <input
              value={needsValue ? value : ''}
              onChange={(e) => setValue(e.target.value)}
              disabled={!needsValue}
              placeholder={operator === 'in' ? 'a, b, c' : 'value'}
              className="flex-1 min-w-[8rem] px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900 disabled:opacity-40"
            />
            <label className="text-xs text-slate-500">
              Points
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="ml-1 w-20 px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg disabled:opacity-50"
            >
              <Plus size={12} />
              {creating ? 'Adding…' : 'Add rule'}
            </button>
          </div>
        </form>

        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Target size={14} />
            {entityType === 'lead' ? 'Lead' : 'Deal'} rules ({rules.length})
          </h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-xs text-slate-400">No rules yet. Add one above — until then every score is 0.</p>
          ) : (
            <ul className="space-y-1.5">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5"
                >
                  <span className="text-slate-700 dark:text-slate-200">
                    <span className="font-mono text-slate-500">{fieldLabel(rule.field)}</span>
                    {' '}
                    {OP_LABELS[rule.operator] || rule.operator}
                    {!NO_VALUE.has(rule.operator) && rule.value != null && ` ${rule.value}`}
                    {' → '}
                    <span className={rule.points < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                      {rule.points >= 0 ? `+${rule.points}` : rule.points}
                    </span>
                    {!rule.is_active && ' · inactive'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    aria-label="Delete rule"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
