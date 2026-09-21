'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { clientsHomePath } from '../../lib/leadsPaths';
import Link from 'next/link';
import { ChevronRight, Briefcase, Loader2, Upload, Undo2 } from 'lucide-react';
import api from '../../services/api';
import CsvImportModal, { useImportUndo } from '../shared/CsvImportModal';

export default function ClientsPage() {
    const pathname = usePathname();
    const isManager = pathname?.startsWith('/manager');
    const basePath = clientsHomePath(pathname);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [importOpen, setImportOpen] = useState(false);

    const fetchClients = async () => {
        try {
            setLoading(true);
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

    const { canUndo, undo, undoing, refreshBatch } = useImportUndo('client', fetchClients);

    useEffect(() => {
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
        <div className="bg-page min-h-full">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Clients</h1>
                    <p className="page-subtitle">
                        {isManager ? 'Team accounts' : 'Converted leads and ongoing work'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canUndo && (
                        <button
                            type="button"
                            onClick={undo}
                            disabled={undoing}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            <Undo2 size={14} /> Undo last import
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setImportOpen(true)}
                        className="btn btn-primary"
                    >
                        <Upload size={14} /> Import CSV
                    </button>
                </div>
            </div>

            <div className="page-body">
                {clients.length === 0 ? (
                    <div className="panel p-12 text-center">
                        <p className="text-[13px] text-muted">No clients yet</p>
                    </div>
                ) : (
                    <div className="panel divide-y divide-border">
                        {clients.map((client) => (
                            <Link
                                key={client.id}
                                href={`${basePath}/${client.id}`}
                                className="group block hover:bg-surface-elevated transition-colors"
                            >
                                <div className="px-4 py-3.5 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-8">
                                        <div className="flex items-center gap-2.5 mb-1">
                                            <span className="text-[14px] font-medium text-primary truncate">
                                                {client.name}
                                            </span>
                                            <span className="badge badge-success">Active</span>
                                        </div>

                                        <div className="flex items-center text-[13px] text-muted gap-2">
                                            {(client.account_name || client.company) && (
                                                <>
                                                    <span className="flex items-center gap-1.5 truncate text-secondary">
                                                        <Briefcase size={12} />
                                                        {client.account_name || client.company}
                                                    </span>
                                                    <span className="text-border-strong">&bull;</span>
                                                </>
                                            )}
                                            <span className="truncate">{client.email}</span>
                                            {client.assigned_to_name && (
                                                <>
                                                    <span className="text-border-strong">&bull;</span>
                                                    <span className="flex items-center gap-1 text-secondary truncate">
                                                        {client.assigned_to_name}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {client.created_at && (
                                            <div className="hidden md:block text-right">
                                                <div className="text-[12px] text-muted">
                                                    Since {client.created_at}
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-muted group-hover:text-accent transition-colors pl-2">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                <div className="mt-6 text-center">
                    <p className="text-[13px] text-muted">
                        {clients.length} client{clients.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
            <CsvImportModal
                entity="clients"
                isOpen={importOpen}
                onClose={() => setImportOpen(false)}
                onRefresh={() => { fetchClients(); refreshBatch(); }}
            />
        </div>
    );
}
