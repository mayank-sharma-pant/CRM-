'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import api from '../../services/api';
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
    ChevronDown,
    ChevronRight,
    Receipt
} from 'lucide-react';
import TaskModal from '../leads/TaskModal';
import NoteModal from '../leads/NoteModal';
import CreateOrderModal from '../shared/CreateOrderModal';
import ClientGstinField from './ClientGstinField';
import ClientAccountField from './ClientAccountField';
import DocumentsList from '../documents/DocumentsList';
import ActivityFeed from '../activity/ActivityFeed';
import MeetingCallPanel from '../activity/MeetingCallPanel';
import LeadEmailPanel from '../leads/LeadEmailPanel';
import { clientsHomePath, invoicesHomePath } from '../../lib/leadsPaths';
import { useAuth } from '../../contexts/AuthContext';
import ChurnBadge from '../ChurnBadge';

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [client, setClient] = useState(null);
    const { user } = useAuth();
    const canPrivacy = user?.role === 'admin' || user?.role === 'md';

    const isMD = pathname?.startsWith('/md');
    const isManager = pathname?.startsWith('/manager');
    const basePath = clientsHomePath(pathname);

    const fetchClientData = async () => {
        if (!params?.id) return;
        try {
            const res = await api.get(`/clients/${params.id}`);
            const data = res.data;
            const clientData = {
                id: data.id,
                name: data.name,
                title: '',
                company: data.company || '',
                status: 'Active',
                email: data.email || '',
                phone: data.phone || '',
                address: data.address || '',
                gstin: data.gstin || '',
                account_id: data.account_id || null,
                account_name: data.account_name || '',
                industry: '',
                source: '',
                internal_id: `CLI-${data.id}`,
                since: data.created_at || '',
                owner: data.assigned_to_name || 'Unassigned',
                tasks: data.tasks || [],
                notes: data.notes || [],
                invoices: data.invoices || [],
                permissions: isMD
                    ? { canEdit: true, canAddNote: true, canCreateTask: true }
                    : isManager
                        ? { canEdit: false, canAddNote: false, canCreateTask: false }
                        : { canEdit: true, canAddNote: true, canCreateTask: true }
            };
            setClient(clientData);
        } catch (err) {
            console.error(`Failed to fetch client ${params.id}:`, err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientData();
    }, [params, isManager]);

    const handleExportClient = async () => {
        try {
            const res = await api.get(`/privacy/export/clients/${params.id}`);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `client-${params.id}-export.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.response?.data?.detail || 'Could not export client');
        }
    };

    const handleEraseClient = async () => {
        if (!window.confirm('Erase personal data on this contact? Invoices are kept. This cannot be undone.')) return;
        try {
            await api.post(`/privacy/erase/clients/${params.id}`);
            fetchClientData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Could not erase client');
        }
    };

    const handleAddNote = () => {
        setIsNoteModalOpen(true);
    };

    const handleCreateTask = () => {
        setIsTaskModalOpen(true);
    };

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
                    href={basePath}
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
    return (
        <div className="min-h-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">

            {/* --- HEADER --- */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5 sticky top-0 z-10 transition-all">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={basePath}
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
                                <ChurnBadge id={params.id} />
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                <Building size={12} /> {client.company}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {canPrivacy && (
                            <>
                                <button type="button" onClick={handleExportClient}
                                    className="hidden sm:inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg">
                                    Export data
                                </button>
                                <button type="button" onClick={handleEraseClient}
                                    className="hidden sm:inline-flex items-center px-3 py-1.5 border border-red-200 text-red-700 text-sm font-medium rounded-lg">
                                    Erase PII
                                </button>
                            </>
                        )}
                        {/* PERMISSION CHECK: Add Note */}
                        {client.permissions?.canAddNote && (
                            <button onClick={handleAddNote} className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                                <Plus size={14} /> Add Note
                            </button>
                        )}
                        {/* PERMISSION CHECK: Create Order (Initiate Order) */}
                        {client.permissions?.canCreateTask && (
                            <button onClick={() => setIsOrderModalOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                                <Receipt size={14} /> Create Order
                            </button>
                        )}
                        {/* PERMISSION CHECK: Create Task */}
                        {client.permissions?.canCreateTask && (
                            <button onClick={handleCreateTask} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                                <CheckSquare size={14} /> Create Task
                            </button>
                        )}
                        {/* PERMISSION CHECK: Edit (More) */}
                        {client.permissions?.canEdit && (
                            <button className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                <MoreHorizontal size={20} />
                            </button>
                        )}
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
                                        <ClientGstinField
                                            clientId={client.id}
                                            gstin={client.gstin}
                                            canEdit={!!client.permissions?.canEdit}
                                            onSaved={() => fetchClientData()}
                                        />
                                        <ClientAccountField
                                            clientId={client.id}
                                            accountId={client.account_id}
                                            accountName={client.account_name}
                                            canEdit={!!client.permissions?.canEdit}
                                            onSaved={() => fetchClientData()}
                                        />
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

                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
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

                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Receipt size={18} className="text-emerald-500" />
                                    Orders & Invoices
                                </h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => router.push(isMD ? `${invoicesHomePath(pathname)}?search=${encodeURIComponent(String(client.id || params.id))}` : `/sales/orders?clientId=${encodeURIComponent(params.id)}&clientName=${encodeURIComponent(client.name)}`)}
                                        className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                                    >
                                        View all
                                    </button>
                                    <span className="text-xs font-medium text-slate-400">{client.invoices?.length || 0} Total</span>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
                                {client.invoices && client.invoices.length > 0 ? (
                                    client.invoices.map((inv) => (
                                        <div 
                                            key={inv.id} 
                                            onClick={() => router.push(`${invoicesHomePath(pathname)}/${inv.id}`)}
                                            className="group flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                    <Receipt size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                        {inv.invoice_number}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
                                                        Issue: {inv.issued_date || 'Draft'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        ${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <p className={`text-[10px] font-black uppercase tracking-tighter ${
                                                        inv.status === 'Paid' ? 'text-emerald-500' : 
                                                        inv.status === 'Draft' ? 'text-slate-400' :
                                                        inv.status === 'Rejected' ? 'text-red-500' : 'text-amber-500'
                                                    }`}>
                                                        {inv.status}
                                                    </p>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-5 py-8 text-center text-sm text-slate-500">
                                        No transaction history found.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section: Documents */}
                        <DocumentsList 
                            entityType="client" 
                            entityId={params.id} 
                            canDelete={true} 
                            canUpload={true} 
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Section 4: Client Notes */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <FileText size={18} className="text-amber-500" />
                                        Notes
                                    </h2>
                                    {client.permissions?.canAddNote && (
                                        <button onClick={handleAddNote} className="text-xs text-blue-600 hover:underline font-medium">Add Note</button>
                                    )}
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

                            <ActivityFeed entityType="client" entityId={params.id} reloadKey={client.id} />

                        </div>

                        <MeetingCallPanel parentType="client" parentId={params.id} hideHistory onChanged={fetchClientData} />
                        <LeadEmailPanel clientId={params.id} contactEmail={client.email} hideHistory onChanged={fetchClientData} />

                    </div>

                </div>
            </div>

            <TaskModal 
                isOpen={isTaskModalOpen} 
                onClose={() => setIsTaskModalOpen(false)} 
                onRefresh={fetchClientData} 
                currentClientId={params.id} 
            />
            <NoteModal 
                isOpen={isNoteModalOpen} 
                onClose={() => setIsNoteModalOpen(false)} 
                onRefresh={fetchClientData} 
                endpoint={`/clients/${params.id}/notes`} 
            />
            <CreateOrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                onCreated={() => { setIsOrderModalOpen(false); fetchClientData(); }}
                clientId={params.id}
                clientName={client.name}
            />

        </div>
    );
}
