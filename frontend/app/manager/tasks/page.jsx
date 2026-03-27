'use client';

import { useState, useEffect } from 'react';
import { CornerDownRight, Briefcase, UserCircle, Plus, Check, Clock, User, X } from 'lucide-react';
import api from '../../../services/api';

export default function ManagerTasksPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [completedTasks, setCompletedTasks] = useState(new Set());
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [form, setForm] = useState({ title: '', assignee_id: '', due_date: '', priority: 'medium' });

    useEffect(() => {
        fetchTasks();
        fetchTeam();
    }, []);

    const fetchTasks = async () => {
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

    const fetchTeam = async () => {
        try {
            const res = await api.get('/manager/monitoring');
            setTeamMembers(res.data?.team_members || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.assignee_id || !form.due_date) return;
        setCreating(true);
        try {
            await api.post(`/manager/tasks?title=${encodeURIComponent(form.title)}&assignee_id=${form.assignee_id}&due_date=${form.due_date}&priority=${form.priority}`);
            setShowCreate(false);
            setForm({ title: '', assignee_id: '', due_date: '', priority: 'medium' });
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to create task');
        } finally {
            setCreating(false);
        }
    };

    const toggleTask = async (id) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(id)) {
            newCompleted.delete(id);
        } else {
            newCompleted.add(id);
            try { await api.post(`/tasks/${id}/complete`); } catch (err) { console.error(err); }
        }
        setCompletedTasks(newCompleted);
    };

    const getTasksForTab = () => {
        if (!tasks.length) return [];
        if (activeTab === 'all') return tasks;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return tasks.filter(t => {
            const dueRaw = t.due_date_iso || t.due_date || t.dueDate;
            if (!dueRaw) return activeTab === 'Upcoming';
            const due = new Date(dueRaw);
            if (Number.isNaN(due.getTime())) return false;
            if (activeTab === 'Overdue') return due < today && t.status !== 'Completed';
            if (activeTab === 'Today') return due.toDateString() === today.toDateString();
            if (activeTab === 'Upcoming') return due > today;
            return false;
        });
    };

    return (
        <div className="min-h-screen bg-page">
            <div className="bg-surface border-b border-border px-6 py-4 mb-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight">Team Tasks</h1>
                        <p className="text-[13px] text-muted font-medium mt-0.5 opacity-80">Priority management and execution flow</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-[13px] font-bold transition-all shadow-sm">
                        <Plus size={14} strokeWidth={3} /> Add Task
                    </button>
                </div>
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="bg-surface rounded-xl shadow-2xl border border-border w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h3 className="text-base font-bold text-primary">Assign New Task</h3>
                            <button onClick={() => setShowCreate(false)} className="text-muted hover:text-primary"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-5 space-y-3">
                            <input required placeholder="Task Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary placeholder:text-muted focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                            <select required value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="">Assign to... *</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <input required type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                            <button type="submit" disabled={creating}
                                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg text-sm disabled:opacity-50 transition-all">
                                {creating ? 'Creating...' : 'Create & Assign Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-6 space-y-4">
                <div className="flex items-center gap-1 p-1 bg-surface-elevated/50 border border-border rounded-lg w-fit">
                    {['all', 'Overdue', 'Today', 'Upcoming'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === tab
                                ? 'bg-surface text-accent shadow-sm ring-1 ring-border' : 'text-muted hover:text-secondary hover:bg-surface-elevated'}`}>
                            {tab === 'all' ? 'All' : tab}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <div className="bg-surface border border-border rounded shadow-sm overflow-hidden min-w-[600px] min-h-[400px]">
                        <div className="divide-y divide-border/50">
                            {loading ? (
                                <div className="p-16 text-center text-muted text-[13px] font-medium animate-pulse">Loading tasks...</div>
                            ) : getTasksForTab().length === 0 ? (
                                <div className="p-16 text-center text-muted text-[13px] font-medium italic">No tasks found.</div>
                            ) : (
                                getTasksForTab().map((task) => (
                                    <div key={task.id}
                                        className={`group flex items-center gap-4 px-5 py-3 hover:bg-surface-elevated/20 transition-colors ${completedTasks.has(task.id) ? 'opacity-40 saturate-0' : ''}`}>
                                        <button onClick={() => toggleTask(task.id)}
                                            className={`shrink-0 w-4 h-4 rounded border transition-all flex items-center justify-center ${completedTasks.has(task.id)
                                                ? 'bg-success border-success text-white' : 'border-border-strong hover:border-accent text-transparent bg-surface'}`}>
                                            <Check size={10} strokeWidth={4} />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[13px] font-bold text-primary group-hover:text-accent transition-colors ${completedTasks.has(task.id) ? 'line-through opacity-50' : ''}`}>
                                                    {task.title}
                                                </span>
                                                {task.assigned_to && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border">
                                                        <User size={9} className="inline mr-1" />{task.assigned_to}
                                                    </span>
                                                )}
                                                {task.priority && (
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${task.priority === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                                                            task.priority === 'medium' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                                                'text-slate-500 bg-slate-50 border-slate-200'}`}>
                                                        {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2 tabular-nums">
                                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-muted">
                                                <Clock size={12} strokeWidth={2.5} />
                                                {task.dueDate || task.due_date || 'No date'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-surface-elevated/30 border border-border p-3 rounded flex items-center justify-between text-[11px] font-bold text-muted uppercase tracking-tight">
                    <div className="flex items-center gap-4">
                        <span>{getTasksForTab().length} tasks</span>
                        <div className="w-1 h-1 bg-border rounded-full" />
                        <span>Completion: {Math.round((completedTasks.size / (tasks.length || 1)) * 100)}%</span>
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
