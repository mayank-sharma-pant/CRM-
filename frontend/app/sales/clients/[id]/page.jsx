'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CLIENTS_DATA } from '../data';
import {
    ArrowLeft,
    MoreHorizontal,
    Plus,
    CheckSquare,
    FileText,
    Clock,
    Mail,
    Phone,
    MapPin,
    Building,
    Calendar,
    User,
    History,
    ChevronDown,
    ChevronRight
} from 'lucide-react';

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params?.id) {
            const foundClient = CLIENTS_DATA.find(c => c.id === parseInt(params.id));
            if (foundClient) {
                setClient(foundClient);
            } else {
                // Handle not found - could redirect or show error
                console.error(`Client ${params.id} not found`);
            }
            setLoading(false);
        }
    }, [params]);

    if (loading) {
        return (
            <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="text-slate-500">Loading client details...</div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Client Not Found</h2>
                <p className="text-slate-500 mb-6">The client you are looking for does not exist.</p>
                <Link
                    href="/sales/clients"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Return to Clients
                </Link>
            </div>
        );
    }

    // --- RENDER HELPERS ---
    const getTasks = () => client.tasks || [];
    const getNotes = () => client.notes || [];
    const getTimeline = () => client.timeline || [];

    return (
        <div className="min-h-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

            {/* --- HEADER --- */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 sticky top-0 z-10 transition-all">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/sales/clients"
                            className="p-2 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                {client.name}
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 uppercase tracking-wide">
                                    Client
                                </span>
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <Building size={12} /> {client.company}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                            <Plus size={14} /> Add Note
                        </button>
                        <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                            <CheckSquare size={14} /> Create Task
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* --- LEFT COLUMN (Context & Reference - 4 Columns) --- */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* Section 1: Client Overview */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                                    {client.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{client.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{client.title}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                    <Mail size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{client.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                    <Phone size={14} className="text-slate-400 flex-shrink-0" />
                                    <span>{client.phone}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                                    <span className="truncate">{client.address}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700/50">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500">Status</span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{client.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs mt-2">
                                    <span className="text-slate-500">Since</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{client.since}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 5: Client Details (Read-Only) */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Additional Details</span>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isDetailsOpen && (
                                <div className="px-5 pb-5 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <div>
                                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Industry</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{client.industry}</p>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Source</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{client.source}</p>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Internal Ref</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 font-mono text-xs">{client.internal_id}</p>
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Account Owner</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{client.owner}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* --- RIGHT COLUMN (Activity & Management - 8 Columns) --- */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Section 3: Tasks */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <CheckSquare size={18} className="text-blue-500" />
                                    Tasks
                                </h2>
                                <span className="text-xs font-medium text-slate-400">{getTasks().filter(t => t.status === 'Open').length} Open</span>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                {getTasks().length > 0 ? (
                                    getTasks().map((task) => (
                                        <div key={task.id} className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center ${task.status === 'Completed' ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-500'}`}>
                                                    {task.status === 'Completed' && <CheckSquare size={10} className="text-white" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                                        {task.title}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                {task.priority === 'High' && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400">High Priority</span>
                                                )}
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 w-24 justify-end">
                                                    <Calendar size={12} className="opacity-70" />
                                                    <span>{task.due}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                                        No tasks found for this client.
                                    </div>
                                )}
                                {getTasks().length > 0 && (
                                    <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800/50 text-center">
                                        <button className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline">
                                            View all tasks
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Section 4: Client Notes */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <FileText size={18} className="text-amber-500" />
                                        Notes
                                    </h2>
                                    <button className="text-xs text-blue-600 hover:underline font-medium">Add Note</button>
                                </div>

                                <div className="space-y-4">
                                    {getNotes().length > 0 ? (
                                        getNotes().map((note) => (
                                            <div key={note.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    "{note.content}"
                                                </p>
                                                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                                                    <span className="font-medium text-slate-500 dark:text-slate-500">{note.author}</span>
                                                    <span>{note.date}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-400 italic">No notes available.</div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Activity Timeline */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <History size={18} className="text-violet-500" />
                                        Activity
                                    </h2>
                                </div>

                                <div className="relative pl-4 border-l border-slate-200 dark:border-slate-700 space-y-6">
                                    {getTimeline().map((item) => (
                                        <div key={item.id} className="relative group">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-600 ring-4 ring-slate-50 dark:ring-slate-900 group-hover:bg-blue-500 transition-colors"></div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                    {item.label}
                                                </p>
                                                <span className="text-xs text-slate-400 mt-0.5 block">
                                                    {item.timestamp}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                        <p className="text-xs text-slate-400 italic">Start of history</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </div>

        </div>
    );
}
