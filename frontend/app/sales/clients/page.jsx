'use client';

import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ChevronRight, Briefcase, FileText } from 'lucide-react';

import { CLIENTS_DATA as CLIENTS } from './data';

export default function ClientsPage() {
    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full">

            {/* Page Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        Clients
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Converted leads and ongoing accounts
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-8 py-8">

                {/* Client List Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">

                    {CLIENTS.map((client) => (
                        <Link
                            key={client.id}
                            href={`/sales/clients/${client.id}`}
                            className="group block hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150"
                        >
                            <div className="px-6 py-5 flex items-center justify-between">

                                {/* Left: Identity & Source */}
                                <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center gap-3 mb-1.5">
                                        <span className="text-[15px] font-semibold text-slate-900 dark:text-white truncate">
                                            {client.name}
                                        </span>
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 uppercase tracking-wide">
                                            Active
                                        </span>
                                    </div>

                                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
                                        <span className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                                            <Briefcase size={12} className="opacity-70" />
                                            {client.company}
                                        </span>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span className="truncate">{client.source}</span>
                                    </div>
                                </div>

                                {/* Right: Activity & Time */}
                                <div className="flex items-center gap-6">

                                    {/* Activity Summary */}
                                    <div className="hidden md:block w-72 text-right">
                                        <div className="flex items-center justify-end gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <FileText size={12} className="text-slate-400" />
                                            <span className="truncate max-w-[250px]">{client.last_activity}</span>
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-400">
                                            {formatDistanceToNow(parseISO(client.last_interaction_at), { addSuffix: true })}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors pl-2">
                                        <ChevronRight size={18} />
                                    </div>

                                </div>

                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">Displaying {CLIENTS.length} active clients</p>
                </div>

            </div>

        </div>
    );
}

