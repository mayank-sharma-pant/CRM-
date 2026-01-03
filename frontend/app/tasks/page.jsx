'use client';

/**
 * TASKS PAGE - Sales Executive
 * 
 * Purpose: Execution-focused task management
 * Not a dashboard, not analytics, not configurable
 * 
 * Features:
 * - Tab-based filtering (Overdue, Today, Upcoming)
 * - Parent-child task hierarchy (max depth 2)
 * - Inline expansion for notes and actions
 * - Manager-assigned vs self-created indicators
 */

import { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import api from '../../services/api';
import {
    CheckCircle,
    Circle,
    ChevronRight,
    ChevronDown,
    User,
    Briefcase,
    Plus,
    FileText,
    Clock
} from 'lucide-react';

/**
 * Safe date formatting helper
 * Returns formatted date or fallback if invalid
 */
function safeDateFormat(dateString, formatStr, fallback = 'No date') {
    if (!dateString) return fallback;
    try {
        const date = parseISO(dateString);
        return isValid(date) ? format(date, formatStr) : fallback;
    } catch {
        return fallback;
    }
}

export default function Tasks() {
    const [activeTab, setActiveTab] = useState('today'); // overdue | today | upcoming
    const [tasks, setTasks] = useState([]);
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, [activeTab]);

    /**
     * Fetch tasks from backend based on active tab
     * Backend returns pre-filtered tasks with hierarchy
     */
    const fetchTasks = async () => {
        setLoading(true);
        try {
            // In production: /tasks?filter=today
            // Backend returns tasks with parent_id, children array, etc.
            const response = await api.get('/follow-ups/today');

            // Mock transform to task structure
            const mockTasks = response.data.map(item => ({
                id: item.id,
                title: `Follow up with ${item.lead_name}`,
                dueDate: item.scheduled_date,
                dueTime: item.scheduled_time,
                relatedTo: { type: 'Lead', name: item.lead_name, id: item.lead_id },
                assignedBy: null, // null = self-created, otherwise manager name
                completed: item.status === 'Completed',
                parentId: null,
                children: [],
                notes: item.notes ? [{ text: item.notes, createdAt: item.scheduled_date }] : []
            }));

            setTasks(mockTasks);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (taskId) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) {
                next.delete(taskId);
            } else {
                next.add(taskId);
            }
            return next;
        });
    };

    const toggleComplete = async (taskId) => {
        // Optimistic update
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        ));

        try {
            await api.put(`/follow-ups/${taskId}`, {
                status: tasks.find(t => t.id === taskId)?.completed ? 'Pending' : 'Completed'
            });
        } catch (error) {
            console.error('Failed to toggle task:', error);
            fetchTasks(); // Revert on error
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900">
                <div className="text-sm text-slate-600 dark:text-slate-400">Loading tasks...</div>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-56px)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Header: Modern, clean */}
            <div className="bg-white dark:bg-slate-800 shadow-sm px-8 py-5">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                    Tasks
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your daily work and priorities</p>
            </div>

            {/* Tabs: Modern pill style */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-3">
                <div className="flex gap-2">
                    {[
                        { id: 'overdue', label: 'Overdue' },
                        { id: 'today', label: 'Today' },
                        { id: 'upcoming', label: 'Upcoming' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/50'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Task List: Modern, clean container */}
            <div className="max-w-7xl mx-auto px-8 py-6">
                {tasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 px-6 py-16 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-1">
                            No tasks in this view
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            You're all caught up!
                        </p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {tasks.map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                isExpanded={expandedTasks.has(task.id)}
                                onToggleExpand={toggleExpand}
                                onToggleComplete={toggleComplete}
                                depth={0}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * TASK ROW COMPONENT
 * Handles rendering of task with optional children (hierarchy)
 * Supports inline expansion for notes and actions
 */
function TaskRow({ task, isExpanded, onToggleExpand, onToggleComplete, depth }) {
    const hasChildren = task.children && task.children.length > 0;
    const canComplete = !hasChildren; // Parent tasks cannot be completed directly
    const isIndented = depth > 0;

    return (
        <>
            {/* Main Task Row */}
            <div
                className={`group border-b border-slate-100 dark:border-slate-700/50 hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-transparent dark:hover:from-indigo-900/10 dark:hover:to-transparent transition-all ${isIndented ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                    }`}
            >
                <div className="px-6 py-4 flex items-center gap-4">
                    {/* Indentation for child tasks */}
                    {isIndented && <div style={{ width: `${depth * 24}px` }} />}

                    {/* Expand/Collapse Icon */}
                    {(hasChildren || task.notes.length > 0) && (
                        <button
                            onClick={() => onToggleExpand(task.id)}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded p-1 transition-all"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}

                    {/* Completion Checkbox */}
                    <button
                        onClick={() => canComplete && onToggleComplete(task.id)}
                        disabled={!canComplete}
                        className={`flex-shrink-0 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1 transition-all ${!canComplete ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                    >
                        {task.completed ? (
                            <CheckCircle size={20} className="text-indigo-600 dark:text-indigo-500" strokeWidth={2.5} />
                        ) : (
                            <Circle size={20} className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400" strokeWidth={2} />
                        )}
                    </button>

                    {/* Task Title */}
                    <div className="flex-1 min-w-0">
                        <p className={`text-[15px] font-semibold truncate leading-tight ${task.completed
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-800 dark:text-slate-100'
                            }`}>
                            {task.title}
                        </p>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <Clock size={14} className="text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {task.dueTime || safeDateFormat(task.dueDate, 'MMM d')}
                        </span>
                    </div>

                    {/* Related Entity */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        {task.relatedTo.type === 'Lead' ? (
                            <User size={13} className="text-blue-600 dark:text-blue-400" />
                        ) : (
                            <Briefcase size={13} className="text-blue-600 dark:text-blue-400" />
                        )}
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300 max-w-[120px] truncate">{task.relatedTo.name}</span>
                    </div>

                    {/* Assignment Indicator */}
                    <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${task.assignedBy
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                        }`}>
                        {task.assignedBy ? 'Manager Assigned' : 'Self-created'}
                    </div>
                </div>
            </div>

            {/* Expanded Content: Notes and Actions */}
            {isExpanded && (
                <div className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700/50">
                    <div className="px-6 py-3" style={{ marginLeft: isIndented ? `${depth * 24}px` : 0 }}>

                        {/* Notes Section */}
                        {task.notes.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                    Notes
                                </h4>
                                <div className="space-y-1.5">
                                    {task.notes.map((note, idx) => (
                                        <div key={idx} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                                            <FileText size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                            <span>{note.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inline Actions */}
                        <div className="flex gap-3">
                            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg text-sm font-medium transition-all shadow-sm">
                                <Plus size={14} />
                                Add Note
                            </button>
                            {!hasChildren && (
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md">
                                    <Plus size={14} />
                                    Create Subtask
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Child Tasks (Recursive, max depth 2) */}
            {isExpanded && hasChildren && depth < 2 && (
                <>
                    {task.children.map(child => (
                        <TaskRow
                            key={child.id}
                            task={child}
                            isExpanded={false}
                            onToggleExpand={onToggleExpand}
                            onToggleComplete={onToggleComplete}
                            depth={depth + 1}
                        />
                    ))}
                </>
            )}
        </>
    );
}
