'use client';

/**
 * MANAGER TASKS PAGE
 * 
 * Purpose: View and manage Team Tasks.
 * Scope: Strict Team Scope (Backend Driven).
 */

import { useState, useEffect } from 'react';
import {
    CornerDownRight,
    Briefcase,
    UserCircle,
    Plus,
    Check,
    Clock,
    User
} from 'lucide-react';
import api from '../../../services/api';
import { isPast, isSameDay, parseISO, isFuture } from 'date-fns';

export default function ManagerTasksPage() {
    const [activeTab, setActiveTab] = useState('Today');
    const [completedTasks, setCompletedTasks] = useState(new Set());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                // API implicitly returns Team Scope for Manager
                const res = await api.get('/tasks/list');
                const raw = res.data?.items ?? res.data;
                setTasks(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    const toggleTask = (id) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(id)) {
            newCompleted.delete(id);
        } else {
            newCompleted.add(id);
        }
        setCompletedTasks(newCompleted);
    };

    // Filter Logic simulating the original tabs using string matching on 'dueDate'
    const getTasksForTab = () => {
        if (!tasks.length) return [];

        return tasks.filter(t => {
            const d = (t.dueDate || '').toLowerCase();
            if (activeTab === 'Overdue') {
                return d.includes('yesterday') || d.includes('ago');
            }
            if (activeTab === 'Today') {
                return d.includes('am') || d.includes('pm') || d.includes('today');
            }
            if (activeTab === 'Upcoming') {
                return d.includes('tomorrow') || d.includes('jan') || d.includes('feb') || d.includes('mar') || d.includes('apr') || d.includes('may') || d.includes('jun') || d.includes('jul') || d.includes('aug') || d.includes('sep') || d.includes('oct') || d.includes('nov') || d.includes('dec');
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

    return (
        <div className="min-h-screen bg-page">
            {/* Header: Precise & Integrated */}
            <div className="bg-surface border-b border-border px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight">Team Tasks</h1>
                        <p className="text-[13px] text-muted font-medium mt-0.5 opacity-80">Priority management and execution flow</p>
                    </div>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[13px] font-bold transition-all shadow-sm">
                        <Plus size={14} strokeWidth={3} />
                        Add Task
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 space-y-4">
                {/* Precise Switcher */}
                <div className="flex items-center gap-1 p-1 bg-surface-elevated/50 border border-border rounded-lg w-fit">
                    {['Overdue', 'Today', 'Upcoming'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === tab
                                ? 'bg-surface text-accent shadow-sm ring-1 ring-border'
                                : 'text-muted hover:text-secondary hover:bg-surface-elevated'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Task List: Integrated Tool Style */}
                <div className="bg-surface border border-border rounded shadow-sm overflow-hidden min-h-[400px]">
                    <div className="divide-y divide-border/50">
                        {getTasksForTab().length === 0 ? (
                            <div className="p-16 text-center text-muted text-[13px] font-medium italic">
                                No active tasks found in this trajectory.
                            </div>
                        ) : (
                            getTasksForTab().map((task) => (
                                <div
                                    key={task.id}
                                    className={`group flex items-center gap-4 px-5 py-3 hover:bg-surface-elevated/20 transition-colors ${task.isChild ? 'pl-12 bg-surface-elevated/10' : ''
                                        } ${completedTasks.has(task.id) ? 'opacity-40 saturate-0' : ''}`}
                                >
                                    {/* Checkbox Action */}
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`shrink-0 w-4 h-4 rounded border transition-all flex items-center justify-center ${completedTasks.has(task.id)
                                            ? 'bg-success border-success text-white'
                                            : 'border-border-strong hover:border-accent text-transparent bg-surface'
                                            }`}
                                    >
                                        <Check size={10} strokeWidth={4} />
                                    </button>

                                    {/* Task Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            {task.isChild && <CornerDownRight size={12} className="text-muted opacity-50" />}
                                            <span className={`text-[13px] font-bold text-primary group-hover:text-accent transition-colors ${completedTasks.has(task.id) ? 'line-through opacity-50' : ''
                                                }`}>
                                                {task.title}
                                            </span>

                                            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border tabular-nums ${task.entityType === 'Lead' ? 'bg-accent/5 text-accent border-accent/10 whitespace-nowrap' :
                                                task.entityType === 'Client' ? 'bg-secondary/5 text-secondary border-secondary/10 whitespace-nowrap' :
                                                    'bg-surface-elevated text-muted border-border whitespace-nowrap'
                                                }`}>
                                                {task.entityType === 'Lead' ? <UserCircle size={10} strokeWidth={2.5} /> : <Briefcase size={10} strokeWidth={2.5} />}
                                                {task.entity}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Metadata Row: Due Date */}
                                    <div className="shrink-0 flex items-center gap-2 tabular-nums">
                                        <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight ${activeTab === 'Overdue' ? 'text-error' : activeTab === 'Today' ? 'text-success' : 'text-muted'
                                            }`}>
                                            <Clock size={12} strokeWidth={2.5} />
                                            {task.dueDate}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Analysis Strip */}
                <div className="bg-surface-elevated/30 border border-border p-3 rounded flex items-center justify-between text-[11px] font-bold text-muted uppercase tracking-tight">
                    <div className="flex items-center gap-4">
                        <span>{getTasksForTab().length} active priorities</span>
                        <div className="w-1 h-1 bg-border rounded-full" />
                        <span>Completion Rate: {Math.round((completedTasks.size / (tasks.length || 1)) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-success rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        <span>Live</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
