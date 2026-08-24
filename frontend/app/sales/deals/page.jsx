'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '../../../services/api';
import { useNotification } from '../../../contexts/NotificationContext';
import Skeleton from '../../../components/shared/Skeleton';
import { Plus, TrendingUp, Trophy } from 'lucide-react';

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value ?? '—';
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function DealsBoard() {
  const [board, setBoard] = useState(null);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState(null);

  const basePath = usePathname();
  const { showToast } = useNotification();

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardRes, stagesRes] = await Promise.all([
        api.get('/deals/board'),
        api.get('/deals/stages'),
      ]);
      setBoard(boardRes.data);
      const rawStages = stagesRes.data?.items ?? stagesRes.data;
      setStages(Array.isArray(rawStages) ? rawStages : []);
    } catch (err) {
      console.error('Failed to fetch deals board', err);
      setError('Unable to load deals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async () => {
    const title = window.prompt('Deal title:');
    if (!title) return;
    const amountStr = window.prompt('Amount:', '0');
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (Number.isNaN(amount)) {
      showToast('Amount must be a number', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post('/deals', { title, amount });
      showToast('Deal created', 'success');
      await fetchBoard();
    } catch (err) {
      console.error('Failed to create deal', err);
      showToast(err.response?.data?.detail || 'Failed to create deal', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleMoveStage = async (dealId, newStageId) => {
    setMovingId(dealId);
    try {
      await api.patch(`/deals/${dealId}/stage`, { stage_id: newStageId });
      await fetchBoard();
    } catch (err) {
      console.error('Failed to move deal', err);
      showToast(err.response?.data?.detail || 'Failed to move deal', 'error');
    } finally {
      setMovingId(null);
    }
  };

  const totalDeals = (board?.stages || []).reduce((sum, s) => sum + (s.deals?.length || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-page">
        <div className="bg-surface border-b border-border px-6 py-4">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 opacity-60" />
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
        <div className="flex flex-col items-center gap-3">
          <div className="text-[13px] text-error font-bold uppercase tracking-widest">{error}</div>
          <button onClick={fetchBoard} className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight">Retry</button>
        </div>
      </div>
    );
  }

  const isEmpty = totalDeals === 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-page flex flex-col">
      <div className="bg-surface border-b border-border px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">Deals Pipeline</h1>
            <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">Track opportunities across stages</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 px-4 py-1.5 bg-surface-elevated/50 border border-border rounded-md shadow-inner">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} strokeWidth={2.5} className="text-accent" />
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Open Forecast</span>
                <span className="text-[12px] font-bold text-primary tabular-nums">{formatMoney(board?.open_forecast)}</span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-1.5">
                <Trophy size={14} strokeWidth={2.5} className="text-success" />
                <span className="text-[10px] font-black text-muted uppercase tracking-widest">Won</span>
                <span className="text-[12px] font-bold text-primary tabular-nums">{formatMoney(board?.won_value)}</span>
              </div>
            </div>
            <button
              onClick={handleCreateDeal}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10 disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.5} /> New Deal
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-8 flex-1 w-full">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <p className="text-[13px] text-muted font-medium italic">No deals yet.</p>
            <button
              onClick={handleCreateDeal}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10 disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.5} /> Create your first deal
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {(board?.stages || []).map((stage) => (
              <div key={stage.id} className="w-72 shrink-0 flex flex-col bg-surface rounded border border-border shadow-sm">
                <div className="px-4 py-3 border-b border-border bg-surface-elevated/50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[12px] font-black text-primary uppercase tracking-tight truncate">{stage.name}</h2>
                    <span className="text-[10px] font-bold text-muted bg-surface px-1.5 py-0.5 rounded border border-border">{stage.deals?.length || 0}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-wide">
                    <span>Total {formatMoney(stage.stage_total)}</span>
                    <span>Wtd {formatMoney(stage.weighted_value)}</span>
                  </div>
                </div>
                <div className="p-2 space-y-2 flex-1 min-h-[80px]">
                  {(stage.deals || []).length === 0 ? (
                    <p className="text-[11px] text-muted italic text-center py-4">No deals in this stage</p>
                  ) : (
                    stage.deals.map((deal) => (
                      <div key={deal.id} className="bg-surface-elevated/40 border border-border rounded-md p-3 hover:border-accent/40 transition-colors">
                        <Link href={`${basePath}/${deal.id}`} className="block">
                          <p className="text-[12px] font-bold text-primary truncate">{deal.title}</p>
                          <p className="text-[12px] font-bold text-accent tabular-nums mt-1">{formatMoney(deal.amount)}</p>
                          <p className="text-[10px] text-muted font-medium uppercase tracking-wide mt-0.5">
                            {deal.effective_probability != null ? `${deal.effective_probability}% probability` : ''}
                          </p>
                        </Link>
                        <select
                          value={stage.id}
                          disabled={movingId === deal.id}
                          onChange={(e) => handleMoveStage(deal.id, Number(e.target.value))}
                          className="mt-2 w-full text-[10px] font-bold uppercase tracking-tight bg-surface border border-border rounded px-1.5 py-1 text-muted focus:outline-none focus:border-accent disabled:opacity-50"
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
