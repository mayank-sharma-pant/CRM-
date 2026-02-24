'use client';

import { useState } from 'react';
import {
    Table,
    Plus,
    Download,
    Filter,
    Search,
    MoreHorizontal,
    Edit2,
    Trash2,
    Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { financeService } from '../../services/financeService';
import LedgerEntryModal from './LedgerEntryModal';

export default function LedgerView({ data }) {
    const { ledger, ledger_name, can_edit, columns, rows: initialRows } = data;
    const [rows, setRows] = useState(initialRows);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEntry, setCurrentEntry] = useState(null); // Null for Data, Object for Edit
    const [isSaving, setIsSaving] = useState(false);

    // Filter rows based on search
    const filteredRows = rows.filter(row =>
        Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const handleAdd = () => {
        setCurrentEntry(null);
        setIsModalOpen(true);
    };

    const handleEdit = (row) => {
        setCurrentEntry(row);
        setIsModalOpen(true);
    };

    const handleDelete = async (rowId) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;

        try {
            await financeService.deleteEntry(ledger, rowId);
            setRows(prev => prev.filter(r => r.id !== rowId));
        } catch (error) {
            console.error("Failed to delete entry", error);
            alert("Failed to delete entry");
        }
    };

    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            if (currentEntry) {
                // Update
                const updatedRow = await financeService.updateEntry(ledger, currentEntry.id, formData);
                setRows(prev => prev.map(r => r.id === updatedRow.id ? { ...updatedRow.data, id: updatedRow.id } : r));
            } else {
                // Create
                const newRow = await financeService.addEntry(ledger, formData);
                setRows(prev => [{ ...newRow.data, id: newRow.id }, ...prev]);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save entry", error);
            alert("Failed to save entry. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
            {/* Header Toolbar - Compact & Solid */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-bold text-primary tracking-tight">{ledger_name || 'Ledger'}</h1>
                    {!can_edit && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted bg-surface-elevated border border-border rounded">
                            <Lock size={12} /> Read Only
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-8 pr-3 py-1.5 text-[13px] bg-surface-elevated border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent w-48 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-secondary hover:bg-surface-elevated border border-border rounded-md transition-colors">
                        <Download size={14} /> Export
                    </button>

                    {can_edit && (
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-accent hover:bg-accent-hover rounded-md shadow-sm transition-all"
                        >
                            <Plus size={14} strokeWidth={2.5} /> Add Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Excel-style Table Grid - High Density */}
            <div className="flex-1 overflow-auto bg-page">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                        <tr className="bg-white dark:bg-slate-900">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-2 text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border border-r border-border/50 last:border-r-0 select-none whitespace-nowrap"
                                    style={{ width: col.width || 'auto' }}
                                >
                                    {col.label || col}
                                </th>
                            ))}
                            {can_edit && (
                                <th className="px-4 py-2 text-[11px] font-bold text-muted uppercase tracking-wider border-b border-border w-16 text-center">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-border/50">
                        {filteredRows.length > 0 ? (
                            filteredRows.map((row, rIdx) => (
                                <tr
                                    key={row.id || rIdx}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 even:bg-slate-50/30 dark:even:bg-slate-800/10 transition-colors group"
                                >
                                    {columns.map((col, cIdx) => (
                                        <td
                                            key={cIdx}
                                            className={`px-4 py-1.5 text-[13px] text-secondary border-r border-border/30 last:border-r-0 truncate max-w-xs tabular-nums ${col.className || ''}`}
                                        >
                                            {row[col.key] || row[col]}
                                        </td>
                                    ))}
                                    {can_edit && (
                                        <td className="px-2 py-1.5 text-center whitespace-nowrap border-border/30">
                                            <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(row)}
                                                    className="p-1 text-muted hover:text-accent rounded hover:bg-accent/10 transition-colors"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(row.id)}
                                                    className="p-1 text-muted hover:text-error rounded hover:bg-error/10 transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (can_edit ? 1 : 0)} className="px-4 py-10 text-center text-muted italic text-[13px]">
                                    No records found in this ledger.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Status Footer - Minimalist */}
            <div className="px-6 py-1.5 border-t border-border bg-white dark:bg-slate-900 text-[11px] font-medium text-muted flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <span>{filteredRows.length} records found</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span>Scanned in 12ms</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${can_edit ? 'bg-success' : 'bg-warning'}`} />
                    <span className="uppercase tracking-wider">{can_edit ? 'Full Access' : 'View Only'}</span>
                </div>
            </div>

            <LedgerEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                columns={columns}
                initialData={currentEntry}
                onSave={handleSave}
                isSaving={isSaving}
            />
        </div>
    );
}
