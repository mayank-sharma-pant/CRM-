'use client';

/**
 * TEAM LEAD TASKS
 * 
 * Capability: View and Assign tasks.
 * Scope: Team Scoped.
 */

import { useState, useEffect } from 'react';
import api from '../../../services/api';
import { CheckSquare, Calendar, User, Clock, Filter, Plus } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';

export default function TeamLeadTasks() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            // Use Manager endpoint for team-wide tasks visibility
            const response = await api.get('/manager/tasks');
            setTasks(response.data.tasks || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch tasks', error);
            setLoading(false);
        }
    };

    const filteredTasks = filter === 'all'
        ? tasks
        : tasks.filter(t => t.status.toLowerCase() === filter);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading tasks...</div>;

    return (
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Team Tasks</h1>
                        <p className="text-sm text-slate-500 mt-1">Manage and assign tasks to your team</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-8 py-8">

                {/* Filters */}
                <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2">
                    {['all', 'pending', 'in progress', 'completed'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide transition-colors ${filter === f
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    {filteredTasks.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">No tasks found.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredTasks.map(task => (
                                <div key={task.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group flex items-start gap-4">
                                    <div className="pt-1">
                                        <div className={`p-2 rounded-lg ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <CheckSquare size={18} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className={`font-semibold text-slate-800 dark:text-white ${task.status === 'Completed' ? 'line-through text-slate-400' : ''}`}>
                                                {task.title}
                                            </h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {task.priority || 'Normal'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <User size={14} />
                                                <span>{task.assigned_to || 'Unassigned'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                <span className={task.dueDate && isPast(parseISO(task.dueDate)) ? 'text-red-500 font-medium' : ''}>
                                                    {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No Date'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
