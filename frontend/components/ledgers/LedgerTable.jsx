'use client';

import { useState, useRef, useEffect } from 'react';
import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Check,
    X,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

/**
 * Reusable Ledger Table Component
 * Supports: Sticky headers, Inline editing, Permission handling
 */
export default function LedgerTable({
    columns = [],
    data = [],
    loading = false,
    canEdit = false,
    onSaveRow,
    onDeleteRow,
    pagination = null,
    onPageChange
}) {
    const [editingRowId, setEditingRowId] = useState(null);
    const [editValues, setEditValues] = useState({});
    const tableContainerRef = useRef(null);

    // Initialize edit values when entering edit mode
    const startEditing = (row) => {
        if (!canEdit) return;
        setEditingRowId(row.id);
        setEditValues({ ...row });
    };

    const cancelEditing = () => {
        setEditingRowId(null);
        setEditValues({});
    };

    const saveEditing = () => {
        if (onSaveRow) {
            onSaveRow(editValues);
        }
        setEditingRowId(null);
        setEditValues({});
    };

    const handleInputChange = (colKey, value) => {
        setEditValues(prev => ({
            ...prev,
            [colKey]: value
        }));
    };

    // Handle click outside to save/cancel? 
    // For now, explicit save/cancel buttons in action column are safer UX.

    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-500">Loading ledger data...</p>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="text-center">
                    <p className="text-slate-500 dark:text-slate-400">No records found</p>
                    {canEdit && (
                        <p className="text-xs text-slate-400 mt-1">Click "Add Entry" to start</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Table Container with Overflow settings for Excel-feel */}
            <div
                ref={tableContainerRef}
                className="relative w-full overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-sm"
                style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
                <table className="w-full text-left border-collapse min-w-max">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap bg-slate-50 dark:bg-slate-900"
                                    style={{ minWidth: col.width || 'auto' }}
                                >
                                    {col.label}
                                </th>
                            ))}
                            {canEdit && (
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-right w-[100px] bg-slate-50 dark:bg-slate-900 sticky right-0 shadow-[ -4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {data.map((row) => {
                            const isEditing = editingRowId === row.id;

                            return (
                                <tr
                                    key={row.id}
                                    className={`
                    group transition-colors
                    ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}
                  `}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className="px-4 py-2.5 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300"
                                        >
                                            {isEditing && !col.readOnly ? (
                                                <input
                                                    type={col.type || 'text'}
                                                    value={editValues[col.key] || ''}
                                                    onChange={(e) => handleInputChange(col.key, e.target.value)}
                                                    className="w-full px-2 py-1 -mx-2 text-sm bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                    autoFocus={col.autoFocus}
                                                />
                                            ) : (
                                                <span className={col.className || ''}>
                                                    {col.format ? col.format(row[col.key]) : row[col.key]}
                                                </span>
                                            )}
                                        </td>
                                    ))}

                                    {/* Actions Column */}
                                    {canEdit && (
                                        <td className="px-4 py-2.5 text-right sticky right-0 bg-white/95 dark:bg-slate-800/95 group-hover:bg-slate-50/95 dark:group-hover:bg-slate-700/95 border-l border-transparent group-hover:border-slate-100 dark:group-hover:border-slate-700 transition-colors shadow-[ -4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={saveEditing}
                                                        className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                        title="Save"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={cancelEditing}
                                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(row)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteRow && onDeleteRow(row)}
                                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination (Simple scaffolding) */}
            {pagination && (
                <div className="flex items-center justify-between px-2 pt-2 text-sm text-slate-500 dark:text-slate-400">
                    <div>
                        Showing <span className="font-medium text-slate-900 dark:text-white">1</span> to <span className="font-medium text-slate-900 dark:text-white">{data.length}</span> of <span className="font-medium text-slate-900 dark:text-white">100+</span> results
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-2">Page 1</span>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-50">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
