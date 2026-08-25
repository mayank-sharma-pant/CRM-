'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clientsHomePath } from '../../lib/leadsPaths';
import Link from 'next/link';
import { ChevronRight, Briefcase, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function ClientsPage() {
    const pathname = usePathname();
    const isManager = pathname?.startsWith('/manager');
    const basePath = clientsHomePath(pathname);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await api.get('/clients');
                const raw = res.data?.items ?? res.data;
                setClients(Array.isArray(raw) ? raw : []);
            } catch (err) {
                console.error('Failed to fetch clients:', err);
                setError('Failed to load clients');
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-full">
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-6">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                        Clients
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {isManager ? 'Team managed accounts' : 'Converted leads and ongoing accounts'}
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-8">
                {clients.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                        <p className="text-slate-500 dark:text-slate-400">No clients found</p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                        {clients.map((client) => (
                            <Link
                                key={client.id}
                                href={`${basePath}/${client.id}`}
                                className="group block hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors duration-150"
                            >
                                <div className="px-6 py-5 flex items-center justify-between">
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
                                            {(client.account_name || client.company) && (
                                                <>
                                                    <span className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300">
                                                        <Briefcase size={12} className="opacity-70" />
                                                        {client.account_name || client.company}
                                                    </span>
                                                    <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                                                </>
                                            )}
                                            <span className="truncate">{client.email}</span>
                                            {client.assigned_to_name && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                                                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium truncate">
                                                        Owner: {client.assigned_to_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {client.created_at && (
                                            <div className="hidden md:block text-right">
                                                <div className="text-[10px] text-slate-400">
                                                    Since {client.created_at}
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors pl-2">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Displaying {clients.length} client{clients.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
