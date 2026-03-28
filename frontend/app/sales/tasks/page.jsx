'use client';

/**
 * TASKS PAGE - Sales Executive Execution View
 *
 * Purpose: Manage daily work with API-backed task states.
 * Pattern: Static Tabs (Overdue, Today, Upcoming)
 */

import { useState, useEffect } from 'react';
import {
    CornerDownRight,
    Briefcase,
    UserCircle,
    Plus,
    Check,
    Clock,
    User,
    ShieldAlert
} from 'lucide-react';
import api from '../../../services/api';
import TaskModal from '../../../components/leads/TaskModal';
import { isPast, isSameDay, isFuture, startOfDay } from 'date-fns';
import { parseTaskDueDate } from '../../../lib/taskDue';

// --- MOCK DATA REMOVED (Replaced by API) ---

export default function TasksPage() {
    const [activeTab, setActiveTab] = useState('Today');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await api.get('/tasks/list');
            const raw = res.data?.items ?? res.data;
            setTasks(Array.isArray(raw) ? raw : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const toggleTask = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
            await api.put(`/tasks/${id}`, { status: newStatus });
            fetchTasks();
        } catch (err) {
            console.error("Failed to toggle task", err);
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : (detail || "Action failed"));
        }
    };

    const getTasksForTab = () => {
        if (!tasks.length) return [];
        const today = startOfDay(new Date());

        return tasks.filter(t => {
            if (t.status === 'Completed') {
                return false;
            }
            const dueRaw = t.due_date_iso || t.due_date || null;
            if (!dueRaw) {
                return activeTab === 'Upcoming';
            }
            const dueDate = parseTaskDueDate(dueRaw);
            if (!dueDate) {
                return false;
            }
            const dueDay = startOfDay(dueDate);

            if (activeTab === 'Overdue') {
                return isPast(dueDay) && !isSameDay(dueDay, today);
            }
            if (activeTab === 'Today') {
                return isSameDay(dueDay, today);
            }
            if (activeTab === 'Upcoming') {
                return isFuture(dueDay) && !isSameDay(dueDay, today);
            }
            return false;
        });
    };

    // Color logic for tabs
    const getTabColor = (tabName) => {
        if (activeTab !== tabName) return 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200';
        switch (tabName) {
            case 'Overdue': return 'text-red-600 border-b-2 border-red-600 bg-red-50 dark:bg-red-900/10';
            case 'Today': return 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-900/10';
            case 'Upcoming': return 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/10';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-page">
                <div className="text-[13px] text-muted font-bold uppercase tracking-widest animate-pulse">Syncing Task Grid...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-12">

            {/* Header: Precise & Integrated */}
            <div className="bg-surface border-b border-border px-6 py-4">
                <div className="max-w-[1000px] mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight">Task Control Plane</h1>
                        <p className="text-[12px] text-muted font-medium mt-0.5 opacity-80 uppercase tracking-wider">Execution & Priority Matrix</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[12px] font-bold uppercase tracking-tight transition-all shadow-sm shadow-accent/10"
                    >
                        <Plus size={14} strokeWidth={2.5} /> New Task
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1000px] mx-auto px-6 mt-6">

                {/* Tabs: Compact Switchers */}
                <div className="flex items-center gap-1 border-b border-border mb-4 bg-surface rounded-t-lg px-1.5 pt-1.5 shadow-sm">
                    {['Overdue', 'Today', 'Upcoming'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-tight transition-all rounded-t-md border-b-2 ${activeTab === tab
                                ? tab === 'Overdue' ? 'text-error border-error bg-error/5' :
                                    tab === 'Today' ? 'text-success border-success bg-success/5' :
                                        'text-accent border-accent bg-accent/5'
                                : 'text-muted border-transparent hover:text-primary hover:bg-surface-elevated'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Task List: Dense Grid */}
                <div className="bg-surface rounded border border-border overflow-hidden shadow-sm min-h-[400px]">
                    <div className="divide-y divide-border/50">
                        {getTasksForTab().map((task, idx) => (
                            <div
                                key={task.id}
                                className={`
                  group flex items-center gap-4 px-5 py-2.5 hover:bg-surface-elevated/30 transition-all
                  ${task.isChild ? 'pl-12 bg-surface-elevated/10' : ''}
                  ${task.status === 'Completed' ? 'opacity-40 grayscale-[0.8]' : ''}
                  ${!task.isChild && idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}
                `}
                            >

                                {/* 1. Checkbox Action: Refined */}
                                <button
                                    onClick={() => toggleTask(task.id, task.status)}
                                    className={`
                    flex-shrink-0 w-4.5 h-4.5 rounded border transition-all flex items-center justify-center
                    ${task.status === 'Completed'
                                            ? 'bg-accent border-accent text-white'
                                            : 'bg-surface border-border hover:border-accent text-transparent shadow-inner'}
                  `}
                                >
                                    <Check size={10} strokeWidth={4} />
                                </button>

                                {/* 2. Task Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2.5 mb-0.5">
                                        {task.isChild && <CornerDownRight size={12} strokeWidth={2.5} className="text-muted opacity-50" />}
                                        <span className={`text-[13px] font-bold text-primary ${task.status === 'Completed' ? 'line-through decoration-muted' : ''}`}>
                                            {task.title}
                                        </span>

                                        {/* Entity Badge: Precise */}
                                        <span className={`
                                            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-widest border shadow-sm
                                            ${task.entityType === 'Lead' ? 'bg-info/10 text-info border-info/20' :
                                                task.entityType === 'Client' ? 'bg-accent/10 text-accent border-accent/20' :
                                                    'bg-muted/10 text-muted border-border'}
                                        `}>
                                            {task.entityType === 'Lead' ? <UserCircle size={10} strokeWidth={2.5} /> : <Briefcase size={10} strokeWidth={2.5} />}
                                            {task.entity}
                                        </span>
                                    </div>

                                    {/* Metadata Row: Minimal */}
                                    <div className="flex items-center gap-3">
                                        {task.assignedBy === 'manager' && (
                                            <span className="flex items-center gap-1 text-[10px] text-warning font-black uppercase tracking-tight bg-warning/5 px-1 rounded-sm">
                                                <ShieldAlert size={10} strokeWidth={2.5} /> Assigned By Manager
                                            </span>
                                        )}
                                        {task.assignedBy === 'self' && (
                                            <span className="text-[10px] text-muted font-bold uppercase tracking-tight opacity-50">
                                                Self Assigned
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Right: Due Time: Tabular */}
                                <div className="text-right flex-shrink-0">
                                    <div className={`
                                        flex items-center justify-end gap-1.5 text-[11px] font-black uppercase tracking-widest tabular-nums
                                        ${activeTab === 'Overdue' ? 'text-error' : activeTab === 'Today' ? 'text-success' : 'text-muted'}
                                    `}>
                                        <Clock size={12} strokeWidth={2.5} />
                                        {task.dueDate}
                                    </div>
                                </div>

                            </div>
                        ))}

                        {/* Empty State */}
                        {getTasksForTab().length === 0 && (
                            <div className="p-16 text-center">
                                <div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center mx-auto mb-3 border border-border/50">
                                    <Check className="text-muted/30" size={24} strokeWidth={1} />
                                </div>
                                <p className="text-muted text-[13px] font-bold uppercase tracking-widest opacity-40">Queue Purged</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Strip */}
                <div className="mt-3 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                        <span className="text-[10px] font-black text-muted uppercase tracking-widest">Task Matrix Operational</span>
                    </div>
                    <span className="text-[10px] font-black text-muted uppercase tracking-widest tabular-nums">{getTasksForTab().length} Vectors ACTIVE</span>
                </div>

            </div>
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onRefresh={fetchTasks}
            />
        </div>
    );
}

