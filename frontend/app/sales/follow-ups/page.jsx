'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { format, isPast, isToday, parseISO, compareAsc, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { VARIANTS, TRANSITIONS } from '../../../lib/motion';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  ChevronRight,
  Filter
} from 'lucide-react';

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, overdue, pending

  useEffect(() => {
    fetchFollowUps();
  }, [filter]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      let response;
      if (filter === 'today') {
        response = await api.get('/follow-ups/today');
      } else if (filter === 'overdue') {
        response = await api.get('/follow-ups/overdue');
      } else {
        const params = filter === 'pending' ? { status: 'Pending' } : {};
        response = await api.get('/follow-ups', { params });
      }
      const data = response.data?.items ?? response.data?.follow_ups ?? (Array.isArray(response.data) ? response.data : []);
      setFollowUps(data);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      setFollowUps(prev => prev.map(item =>
        item.id === id ? { ...item, status: newStatus } : item
      ));
      await api.put(`/follow-ups/${id}`, { status: newStatus });
    } catch (error) {
      console.error('Failed to update follow-up:', error);
      fetchFollowUps(); // Revert on failure
    }
  };

  // --- CLIENT-SIDE GROUPING & COUNTS ---
  const groupedData = useMemo(() => {
    if (!followUps) return { overdue: [], today: [], upcoming: [], completed: [], counts: {} };

    const groups = {
      overdue: [],
      today: [],
      upcoming: [],
      completed: []
    };

    const safeParse = (s) => {
      if (!s) return null;
      try {
        const d = parseISO(s);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    followUps.forEach(item => {
      const date = safeParse(item.scheduled_date);
      if (item.status === 'Completed' || item.status === 'Missed') {
        groups.completed.push(item);
      } else if (date && isPast(date) && !isToday(date)) {
        groups.overdue.push(item);
      } else if (date && isToday(date)) {
        groups.today.push(item);
      } else if (date) {
        groups.upcoming.push(item);
      } else {
        groups.upcoming.push(item);
      }
    });

    const sortByDate = (a, b) => {
      const da = safeParse(a.scheduled_date)?.getTime() ?? 0;
      const db = safeParse(b.scheduled_date)?.getTime() ?? 0;
      return da - db;
    };
    groups.overdue.sort(sortByDate);
    groups.today.sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
    groups.upcoming.sort(sortByDate);
    groups.completed.sort((a, b) => sortByDate(b, a));

    return { ...groups };
  }, [followUps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasFollowUps = followUps.length > 0;

  return (
    <motion.div
      variants={VARIANTS.page}
      initial="hidden"
      animate="show"
      className="min-h-[calc(100vh-56px)] bg-page pb-8"
    >
      <motion.div variants={VARIANTS.header} className="page-header">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="page-subtitle">Due, overdue, and upcoming</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface" role="group" aria-label="Filter follow-ups">
          {['all', 'today', 'overdue'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md capitalize transition-colors ${
                filter === f ? 'bg-accent/15 text-accent' : 'text-muted hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="page-body space-y-4">
        {!hasFollowUps ? (
          <EmptyState />
        ) : (
          <motion.div
            variants={VARIANTS.container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >

            {/* OVERDUE SECTION - "Pressure" */}
            <AnimatePresence>
              {groupedData.overdue.length > 0 && (
                <motion.div key="overdue-section" variants={VARIANTS.container} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <h2 className="text-sm font-bold text-rose-600 uppercase tracking-widest">Overdue Requirements</h2>
                  </div>
                  <div className="space-y-2">
                    {groupedData.overdue.map((item) => (
                      <FollowUpCard
                        key={item.id}
                        item={item}
                        type="overdue"
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TODAY SECTION */}
            <AnimatePresence>
              {groupedData.today.length > 0 && (
                <motion.div key="today-section" variants={VARIANTS.container} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Today's Focus</h2>
                  </div>
                  <div className="space-y-2">
                    {groupedData.today.map((item) => (
                      <FollowUpCard
                        key={item.id}
                        item={item}
                        type="today"
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* UPCOMING SECTION */}
            <AnimatePresence>
              {groupedData.upcoming.length > 0 && (
                <motion.div key="upcoming-section" variants={VARIANTS.container} className="space-y-2">
                  <div className="flex items-center gap-2 mb-3 opacity-60">
                    <Calendar size={14} className="text-slate-500" />
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Upcoming</h2>
                  </div>
                  <div className="space-y-2">
                    {groupedData.upcoming.map((item) => (
                      <FollowUpCard
                        key={item.id}
                        item={item}
                        type="upcoming"
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* COMPLETED SECTION */}
            {groupedData.completed.length > 0 && (
              <motion.div variants={VARIANTS.container} className="pt-8 opacity-60 hover:opacity-100 transition-opacity">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Completed Recently</h3>
                <div className="space-y-2">
                  {groupedData.completed.map((item) => (
                    <FollowUpCard
                      key={item.id}
                      item={item}
                      type="completed"
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function FollowUpCard({ item, type, onStatusChange }) {
  const isCompleted = type === 'completed';
  const isOverdue = type === 'overdue';
  const isTodayDate = type === 'today';

  const date = item.scheduled_date ? (() => { try { const d = parseISO(item.scheduled_date); return isNaN(d.getTime()) ? null : d; } catch { return null; } })() : null;
  const overdueDays = isOverdue && date ? differenceInDays(new Date(), date) : 0;
  const overdueLabel = overdueDays > 0 ? `+${overdueDays}d` : '!';

  const styles = {
    overdue: "border-l-rose-500 bg-rose-50/10 dark:bg-rose-900/10 hover:border-l-[6px]",
    today: "border-l-indigo-500 bg-card hover:border-l-[6px]",
    upcoming: "border-l-subtle bg-card opacity-90",
    completed: "border-l-emerald-500 bg-surface opacity-60 grayscale"
  };

  return (
    <motion.div
      variants={VARIANTS.row}
      layout
      exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
      className={`group relative flex items-center gap-4 p-4 rounded-r-lg border-l-4 shadow-sm border border-y-slate-100 dark:border-y-slate-800 border-r-slate-100 dark:border-r-slate-800 transition-all ${styles[type] || styles.upcoming}`}
    >
      {/* 1. Checkbox Action */}
      <div className="flex-shrink-0">
        <button
          onClick={() => onStatusChange(item.id, isCompleted ? 'Pending' : 'Completed')}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
               ${isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 text-transparent hover:text-indigo-500'}`}
        >
          <CheckCircle2 size={12} fill="currentColor" />
        </button>
      </div>

      {/* 2. Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className={`text-sm font-bold text-slate-900 dark:text-white truncate ${isCompleted ? 'line-through text-slate-500' : ''}`}>
            {item.channel ? `${item.channel.toUpperCase()} · ` : ''}{item.notes || 'Contact Lead'}
          </h3>
          {isOverdue && (
            <span className="flex-shrink-0 text-[10px] font-black bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
              {overdueLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted font-medium">
          <span className="flex items-center gap-1 hover:text-accent transition-colors cursor-pointer">
            {item.lead_name}
          </span>
          <span>•</span>
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-error font-semibold' : ''}`}>
            {isTodayDate ? 'Today' : (date ? format(date, 'MMM d') : (item.scheduled_date || '—'))}
            {item.scheduled_time && ` @ ${item.scheduled_time}`}
          </span>
        </div>
      </div>

      {/* 3. Hover Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/sales/leads/${item.lead_id}`}>
          <div className="p-2 hover:bg-surface-elevated rounded-md text-muted hover:text-accent transition-colors">
            <ChevronRight size={16} />
          </div>
        </Link>
      </div>

    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mb-3">
        <CheckCircle2 size={18} className="text-success" />
      </div>
      <h3 className="text-sm font-medium text-primary">All clear</h3>
      <p className="text-[13px] text-muted max-w-[220px] mt-1">No follow-ups need attention in this view.</p>
    </div>
  );
}

