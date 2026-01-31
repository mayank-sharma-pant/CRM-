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
        <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-stone-800">{ledger_name || 'Ledger'}</h1>
                    {!can_edit && (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded">
                            <Lock size={12} /> Read Only
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search records..."
                            className="pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-500 w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-md hover:bg-stone-50">
                        <Filter size={16} /> Filter
                    </button>

                    <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-stone-600 bg-white border border-stone-300 rounded-md hover:bg-stone-50">
                        <Download size={16} /> Export
                    </button>

                    {can_edit && (
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-md hover:bg-stone-800 shadow-sm"
                        >
                            <Plus size={16} /> Add Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Excel-style Table Grid */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-100 sticky top-0 z-10">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200 border-r border-stone-200 last:border-r-0 select-none whitespace-nowrap"
                                    style={{ width: col.width || 'auto' }}
                                >
                                    {col.label || col}
                                </th>
                            ))}
                            {can_edit && (
                                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider border-b border-stone-200 w-20 text-center">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredRows.length > 0 ? (
                            filteredRows.map((row, rIdx) => (
                                <motion.tr
                                    key={row.id || rIdx}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: rIdx * 0.03 }}
                                    className="hover:bg-stone-50 transition-colors group"
                                >
                                    {columns.map((col, cIdx) => (
                                        <td
                                            key={cIdx}
                                            className={`px-4 py-3 text-sm text-stone-700 border-r border-stone-100 last:border-r-0 truncate max-w-xs ${col.className || ''}`}
                                        >
                                            {row[col.key] || row[col]}
                                        </td>
                                    ))}
                                    {can_edit && (
                                        <td className="px-2 py-2 text-center whitespace-nowrap">
                                            <div className="invisible group-hover:visible flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => handleEdit(row)}
                                                    className="p-1 text-stone-400 hover:text-stone-900 rounded"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(row.id)}
                                                    className="p-1 text-stone-400 hover:text-red-600 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </motion.tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + (can_edit ? 1 : 0)} className="px-4 py-12 text-center text-stone-400 italic">
                                    No records found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Status Bar */}
            <div className="px-4 py-2 border-t border-stone-200 bg-stone-50 text-xs text-stone-500 flex justify-between items-center">
                <span>{filteredRows.length} records</span>
                <span>{can_edit ? 'Editing Mode' : 'View Only Mode'}</span>
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
