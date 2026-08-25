'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import api from '../../../services/api';

const MATCH_FIELDS = [
  { value: 'service_type', label: 'Service type' },
  { value: 'source', label: 'Source' },
];

function canManage(user) {
  const role = user?.role;
  return role === 'admin' || role === 'md';
}

function teamsEndpoint(role) {
  return role === 'md' ? '/md/teams' : '/admin/teams';
}

function formatError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  return typeof detail === 'object' ? JSON.stringify(detail) : detail;
}

export default function TerritoriesSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const allowed = canManage(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [territories, setTerritories] = useState([]);
  const [teams, setTeams] = useState([]);

  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [priority, setPriority] = useState('100');
  const [creating, setCreating] = useState(false);

  const [ruleDrafts, setRuleDrafts] = useState({});

  const load = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [territoriesRes, teamsRes] = await Promise.all([
        api.get('/territories'),
        api.get(teamsEndpoint(user?.role)),
      ]);
      setTerritories(territoriesRes.data.items || []);
      const teamRows = teamsRes.data.teams || [];
      setTeams(teamRows);
      setTeamId((current) => current || (teamRows[0] ? String(teamRows[0].id) : ''));
    } catch (err) {
      setError(formatError(err, 'Could not load territories.'));
    } finally {
      setLoading(false);
    }
  }, [allowed, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const teamName = (id) => teams.find((t) => t.id === id)?.name || `Team #${id}`;

  const createTerritory = async (e) => {
    e.preventDefault();
    if (!teamId) {
      showToast('Select a team', 'error');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.post('/territories', {
        name: name.trim(),
        team_id: Number(teamId),
        priority: Number(priority) || 100,
      });
      setName('');
      setPriority('100');
      showToast('Territory created', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not create territory.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const removeTerritory = async (id, territoryName) => {
    if (!window.confirm(`Delete territory "${territoryName}" and all its rules?`)) return;
    try {
      await api.delete(`/territories/${id}`);
      showToast('Territory deleted', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete territory.'), 'error');
    }
  };

  const addRule = async (territoryId) => {
    const draft = ruleDrafts[territoryId] || { match_field: 'service_type', match_value: '' };
    const value = draft.match_value.trim();
    if (!value) {
      showToast('Rule value is required', 'error');
      return;
    }
    try {
      await api.post(`/territories/${territoryId}/rules`, {
        match_field: draft.match_field,
        match_value: value,
      });
      setRuleDrafts((prev) => ({
        ...prev,
        [territoryId]: { match_field: draft.match_field, match_value: '' },
      }));
      showToast('Rule added', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not add rule.'), 'error');
    }
  };

  const removeRule = async (territoryId, ruleId) => {
    try {
      await api.delete(`/territories/${territoryId}/rules/${ruleId}`);
      showToast('Rule removed', 'success');
      await load();
    } catch (err) {
      showToast(formatError(err, 'Could not delete rule.'), 'error');
    }
  };

  const updateRuleDraft = (territoryId, field, value) => {
    setRuleDrafts((prev) => ({
      ...prev,
      [territoryId]: {
        match_field: prev[territoryId]?.match_field || 'service_type',
        match_value: prev[territoryId]?.match_value || '',
        [field]: value,
      },
    }));
  };

  if (!allowed) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-12">
        <p className="text-sm text-slate-500">Only admin or MD can manage territories.</p>
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">Territories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Route new leads to teams by service type or source. Lower priority runs first.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 space-y-6">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <form
              onSubmit={createTerritory}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Create territory</h2>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Territory name"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs">
                  <span className="text-slate-500">Team</span>
                  <select
                    required
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                  >
                    {teams.length === 0 ? (
                      <option value="">No teams available</option>
                    ) : (
                      teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-slate-500">Priority (lower first)</span>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={creating || teams.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-lg disabled:opacity-50"
              >
                <Plus size={12} />
                {creating ? 'Creating…' : 'Create territory'}
              </button>
            </form>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={14} />
                Territories ({territories.length})
              </h2>

              {territories.length === 0 ? (
                <p className="text-xs text-slate-400">No territories yet. Create one above to start routing leads.</p>
              ) : (
                <ul className="space-y-6">
                  {territories.map((territory) => {
                    const draft = ruleDrafts[territory.id] || {
                      match_field: 'service_type',
                      match_value: '',
                    };
                    return (
                      <li
                        key={territory.id}
                        className="border border-slate-100 dark:border-slate-700 rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{territory.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {teamName(territory.team_id)} · priority {territory.priority}
                              {!territory.is_active && ' · inactive'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTerritory(territory.id, territory.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600"
                            aria-label={`Delete ${territory.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Rules</p>
                          {territory.rules?.length > 0 ? (
                            <ul className="space-y-1.5 mb-3">
                              {territory.rules.map((rule) => (
                                <li
                                  key={rule.id}
                                  className="flex items-center justify-between gap-2 text-xs bg-slate-50 dark:bg-slate-900/50 rounded px-2 py-1.5"
                                >
                                  <span className="text-slate-700 dark:text-slate-200">
                                    <span className="font-mono text-slate-500">{rule.match_field}</span>
                                    {' = '}
                                    {rule.match_value}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeRule(territory.id, rule.id)}
                                    className="p-1 text-slate-400 hover:text-red-600"
                                    aria-label="Delete rule"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-400 mb-3">No rules — this territory will never match.</p>
                          )}

                          <div className="flex flex-wrap items-end gap-2">
                            <select
                              value={draft.match_field}
                              onChange={(e) => updateRuleDraft(territory.id, 'match_field', e.target.value)}
                              className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
                            >
                              {MATCH_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            <input
                              value={draft.match_value}
                              onChange={(e) => updateRuleDraft(territory.id, 'match_value', e.target.value)}
                              placeholder="Match value"
                              className="flex-1 min-w-[8rem] px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded text-xs bg-white dark:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => addRule(territory.id)}
                              className="px-2 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                              Add rule
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
