'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '../../services/api';
import { format, isPast, isToday, parseISO, compareAsc, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  ChevronRight,
  Filter
} from 'lucide-react';

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    transition: { duration: 0.2 }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

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
      setFollowUps(response.data);
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

    followUps.forEach(item => {
      const date = parseISO(item.scheduled_date);
      if (item.status === 'Completed' || item.status === 'Missed') {
        groups.completed.push(item);
      } else if (isPast(date) && !isToday(date)) {
        groups.overdue.push(item);
      } else if (isToday(date)) {
        groups.today.push(item);
      } else {
        groups.upcoming.push(item);
      }
    });

    groups.overdue.sort((a, b) => compareAsc(parseISO(a.scheduled_date), parseISO(b.scheduled_date)));
    groups.today.sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''));
    groups.upcoming.sort((a, b) => compareAsc(parseISO(a.scheduled_date), parseISO(b.scheduled_date)));
    groups.completed.sort((a, b) => compareAsc(parseISO(b.scheduled_date), parseISO(a.scheduled_date)));

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] pb-20 font-sans">

      {/* Dense Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
            Execution Mode
          </h1>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {['all', 'today', 'overdue'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all
                      ${filter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {!hasFollowUps ? (
          <EmptyState />
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >

            {/* OVERDUE SECTION - "Pressure" */}
            <AnimatePresence>
              {groupedData.overdue.length > 0 && (
                <div key="overdue-section" className="space-y-2">
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
                </div>
              )}
            </AnimatePresence>

            {/* TODAY SECTION */}
            <AnimatePresence>
              {groupedData.today.length > 0 && (
                <div key="today-section" className="space-y-2">
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
                </div>
              )}
            </AnimatePresence>

            {/* UPCOMING SECTION */}
            <AnimatePresence>
              {groupedData.upcoming.length > 0 && (
                <div key="upcoming-section" className="space-y-2">
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
                </div>
              )}
            </AnimatePresence>

            {/* COMPLETED SECTION */}
            {groupedData.completed.length > 0 && (
              <div className="pt-8 opacity-60 hover:opacity-100 transition-opacity">
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
              </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  );
}

function FollowUpCard({ item, type, onStatusChange }) {
  const isCompleted = type === 'completed';
  const isOverdue = type === 'overdue';
  const isTodayDate = type === 'today';

  const date = parseISO(item.scheduled_date);
  const overdueDays = isOverdue ? differenceInDays(new Date(), date) : 0;
  const overdueLabel = overdueDays > 0 ? `+${overdueDays}d` : '!';

  const styles = {
    overdue: "border-l-rose-500 bg-rose-50/10 dark:bg-rose-900/10 hover:border-l-[6px]",
    today: "border-l-indigo-500 bg-white dark:bg-[#1E293B] hover:border-l-[6px]",
    upcoming: "border-l-slate-300 dark:border-l-slate-600 bg-white dark:bg-[#1E293B] opacity-90",
    completed: "border-l-emerald-500 bg-slate-50 dark:bg-slate-900 opacity-60 grayscale"
  };

  return (
    <motion.div
      variants={itemVariants}
      layout
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
            {item.notes || 'Contact Lead'}
          </h3>
          {isOverdue && (
            <span className="flex-shrink-0 text-[10px] font-black bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
              {overdueLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer">
            {item.lead_name}
          </span>
          <span>•</span>
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}`}>
            {isTodayDate ? 'Today' : format(date, 'MMM d')}
            {item.scheduled_time && ` @ ${item.scheduled_time}`}
          </span>
        </div>
      </div>

      {/* 3. Hover Actions */}
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/leads/${item.lead_id}`}>
          <div className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-indigo-600 transition-colors">
            <ChevronRight size={16} />
          </div>
        </Link>
      </div>

    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <CheckCircle2 size={20} className="text-emerald-500" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Clear</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mt-1">No tasks require attention in this view.</p>
    </div>
  );
}
