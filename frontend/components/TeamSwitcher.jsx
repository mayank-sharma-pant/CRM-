'use client';

import { useEffect, useState } from 'react';
import api, { getActiveTeamId, setActiveTeamId } from '../services/api';

export default function TeamSwitcher({ className = '' }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(getActiveTeamId() || '');

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await api.get('/teams/mine');
        if (!mounted) return;
        setTeams(res.data?.teams || []);
        const serverActive = res.data?.active_team_id;
        const current = getActiveTeamId();
        if (!current && serverActive) {
          setActiveTeamId(serverActive);
          setValue(String(serverActive));
        }
      } catch {
        // ignore (e.g. not logged in)
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || teams.length === 0) return null;

  return (
    <div className={className}>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          setActiveTeamId(v);
        }}
        className="h-9 px-3 rounded-md border border-border bg-surface text-sm text-primary font-semibold"
      >
        <option value="" disabled>
          Select team
        </option>
        {teams.map((t) => (
          <option key={t.id} value={String(t.id)}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

