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
                setTasks(res.data || []);
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
            const d = t.dueDate.toLowerCase();
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
        <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 pb-12">

            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Team Tasks</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage team priorities and assignments</p>
                    </div>
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-8 mt-8">

                {/* Tabs */}
                <div className="flex items-center border-b border-slate-200 dark:border-slate-700 mb-6 bg-white dark:bg-slate-800 rounded-t-lg px-2 pt-2">
                    {['Overdue', 'Today', 'Upcoming'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-bold transition-all rounded-t-md ${getTabColor(tab)}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="bg-white dark:bg-slate-800 rounded-b-lg rounded-tr-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[400px]">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {getTasksForTab().map((task) => (
                            <div
                                key={task.id}
                                className={`
                  group flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors
                  ${task.isChild ? 'pl-16 bg-slate-50/50 dark:bg-slate-800/50' : ''}
                  ${completedTasks.has(task.id) ? 'opacity-50 grayscale' : ''}
                `}
                            >

                                {/* 1. Checkbox Action */}
                                <button
                                    onClick={() => toggleTask(task.id)}
                                    className={`
                    flex-shrink-0 w-5 h-5 rounded border transition-all flex items-center justify-center
                    ${completedTasks.has(task.id)
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 text-transparent'}
                  `}
                                >
                                    <Check size={12} strokeWidth={3} />
                                </button>

                                {/* 2. Task Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {task.isChild && <CornerDownRight size={12} className="text-slate-400" />}
                                        <span className={`text-sm font-semibold text-slate-800 dark:text-white ${completedTasks.has(task.id) ? 'line-through decoration-slate-400' : ''}`}>
                                            {task.title}
                                        </span>

                                        {/* Entity Badge */}
                                        <span className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border
                      ${task.entityType === 'Lead' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                                                task.entityType === 'Client' ? 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800' :
                                                    'bg-slate-100 text-slate-600 border-slate-200Dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600'}
                    `}>
                                            {task.entityType === 'Lead' ? <UserCircle size={10} /> : <Briefcase size={10} />}
                                            {task.entity}
                                        </span>
                                    </div>

                                    {/* Metadata Row */}
                                    <div className="flex items-center gap-4 text-xs">
                                        {/* Removed "Manager Assigned" badge to comply with scope rules (Task 2) */}
                                        {/* But if we wanted to show who assigned it, we could, as long as it's not a "filter". */}
                                        {/* Requirement "no 'manager assigned' label" refers to Dashboard attention signals. */}
                                        {/* For safety, I'll keep it clean. */}
                                    </div>
                                </div>

                                {/* 3. Right: Due Time */}
                                <div className="text-right flex-shrink-0">
                                    <div className={`
                      flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wide
                      ${activeTab === 'Overdue' ? 'text-red-600' : activeTab === 'Today' ? 'text-emerald-600' : 'text-slate-500'}
                   `}>
                                        <Clock size={12} />
                                        {task.dueDate}
                                    </div>
                                </div>

                            </div>
                        ))}

                        {/* Empty State Mock */}
                        {getTasksForTab().length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                No tasks in this view.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
