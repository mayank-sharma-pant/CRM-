'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Search, Trash2, Loader2 } from 'lucide-react';
import { financeService } from '../../services/financeService';

const HIDDEN_KEYS = new Set(['id', 'company_id', 'created_at', 'updated_at']);

function formatCellValue(val, col) {
    if (val == null || val === '') return '';
    if (col.type === 'date' && val) {
        try {
            const d = typeof val === 'string' ? val.split('T')[0] : val;
            return d;
        } catch {
            return String(val);
        }
    }
    return String(val);
}

export default function FinancialLedgerGrid({
    ledgerSlug,
    ledgerName,
    canView,
    canEdit,
    columns,
    rows: initialRows,
    onRefresh
}) {
    const [rows, setRows] = useState(Array.isArray(initialRows) ? initialRows : []);
    useEffect(() => {
        setRows(Array.isArray(initialRows) ? initialRows : []);
    }, [initialRows]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [editingCell, setEditingCell] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [newRow, setNewRow] = useState(null);

    const visibleColumns = columns.filter(c => !HIDDEN_KEYS.has(c.key));

    const filteredRows = rows.filter(row => {
        const matchSearch = !searchQuery || Object.entries(row).some(([k, v]) => {
            if (HIDDEN_KEYS.has(k)) return false;
            return String(v ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        });
        const matchDate = !dateFilter || !row.date || String(row.date).startsWith(dateFilter);
        return matchSearch && matchDate;
    });

    const hasDateColumn = visibleColumns.some(c => c.key === 'date');

    const handleCellBlur = useCallback(async (rowId, key, value, rowData) => {
        if (!canEdit || editingCell?.rowId !== rowId || editingCell?.key !== key) return;
        setEditingCell(null);
        const prev = rowData[key];
        if (String(prev ?? '') === String(value ?? '')) return;
        setSavingId(rowId);
        try {
            const { id: _id, ...dataOnly } = rowData;
            const nextData = { ...dataOnly, [key]: value };
            await financeService.updateEntry(ledgerSlug, rowId, nextData);
            setRows(prevRows => prevRows.map(r => r.id === rowId ? { ...r, [key]: value } : r));
        } catch (err) {
            console.error('Save failed', err);
        } finally {
            setSavingId(null);
        }
    }, [canEdit, ledgerSlug, editingCell]);

    const handleAddRow = useCallback(() => {
        const empty = {};
        visibleColumns.forEach(c => { empty[c.key] = c.key === 'date' ? new Date().toISOString().split('T')[0] : ''; });
        setNewRow(empty);
    }, [visibleColumns]);

    const handleSaveNewRow = useCallback(async () => {
        if (!newRow || !canEdit) return;
        setSavingId('new');
        try {
            await financeService.addEntry(ledgerSlug, newRow);
            setNewRow(null);
            onRefresh?.();
        } catch (err) {
            console.error('Add failed', err);
        } finally {
            setSavingId(null);
        }
    }, [ledgerSlug, newRow, canEdit, onRefresh]);

    const handleCancelNewRow = useCallback(() => setNewRow(null), []);

    const handleDelete = useCallback(async (rowId) => {
        if (!canEdit || !window.confirm('Delete this entry? This cannot be undone.')) return;
        try {
            await financeService.deleteEntry(ledgerSlug, rowId);
            setRows(prev => prev.filter(r => r.id !== rowId));
        } catch (err) {
            console.error('Delete failed', err);
        }
    }, [canEdit, ledgerSlug]);

    if (!canView) return null;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-700 rounded-lg">
            {/* Action bar */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-7 pr-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 w-44 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                    </div>
                    {hasDateColumn && (
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="py-1.5 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                    )}
                </div>
                {canEdit && !newRow && (
                    <button
                        type="button"
                        onClick={handleAddRow}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 rounded border border-slate-600"
                    >
                        <Plus size={14} /> Add Row
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            {visibleColumns.map(col => (
                                <th
                                    key={col.key}
                                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-r border-slate-200 dark:border-slate-600 last:border-r-0 whitespace-nowrap"
                                    style={{ minWidth: col.width || '80px' }}
                                >
                                    {col.label}
                                </th>
                            ))}
                            {canEdit && (
                                <th className="px-2 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider w-16 text-center">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900">
                        {newRow && (
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                {visibleColumns.map(col => (
                                    <td key={col.key} className="px-3 py-1 border-r border-slate-100 dark:border-slate-700 last:border-r-0 align-middle">
                                        {col.type === 'number' ? (
                                            <input
                                                type="number"
                                                value={newRow[col.key] ?? ''}
                                                onChange={e => setNewRow(prev => ({ ...prev, [col.key]: e.target.value }))}
                                                className="w-full py-1 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                            />
                                        ) : col.type === 'date' ? (
                                            <input
                                                type="date"
                                                value={newRow[col.key] ?? ''}
                                                onChange={e => setNewRow(prev => ({ ...prev, [col.key]: e.target.value }))}
                                                className="w-full py-1 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={newRow[col.key] ?? ''}
                                                onChange={e => setNewRow(prev => ({ ...prev, [col.key]: e.target.value }))}
                                                className="w-full py-1 px-2 text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                            />
                                        )}
                                    </td>
                                ))}
                                <td className="px-2 py-1 border-slate-100 dark:border-slate-700 text-center align-middle">
                                    <button
                                        type="button"
                                        onClick={handleSaveNewRow}
                                        disabled={savingId === 'new'}
                                        className="text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                    >
                                        {savingId === 'new' ? <Loader2 size={14} className="animate-spin inline" /> : 'Save'}
                                    </button>
                                    <button type="button" onClick={handleCancelNewRow} className="ml-2 text-xs text-slate-400 hover:text-slate-600">Cancel</button>
                                </td>
                            </tr>
                        )}
                        {filteredRows.length === 0 && !newRow ? (
                            <tr>
                                <td colSpan={visibleColumns.length + (canEdit ? 1 : 0)} className="px-4 py-8 text-center text-sm text-slate-500">
                                    No records.
                                </td>
                            </tr>
                        ) : (
                            filteredRows.map(row => (
                                <tr
                                    key={row.id}
                                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                >
                                    {visibleColumns.map(col => {
                                        const isEditing = canEdit && editingCell?.rowId === row.id && editingCell?.key === col.key;
                                        const val = row[col.key];
                                        return (
                                            <td
                                                key={col.key}
                                                className={`px-3 py-1.5 text-sm border-r border-slate-100 dark:border-slate-700 last:border-r-0 align-middle tabular-nums ${col.className || 'text-slate-700 dark:text-slate-300'}`}
                                            >
                                                {isEditing ? (
                                                    col.type === 'number' ? (
                                                        <input
                                                            type="number"
                                                            defaultValue={val}
                                                            autoFocus
                                                            onBlur={e => handleCellBlur(row.id, col.key, e.target.value ? Number(e.target.value) : '', row)}
                                                            className="w-full py-0.5 px-1.5 text-sm border border-slate-300 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                                        />
                                                    ) : col.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            defaultValue={formatCellValue(val, col)}
                                                            autoFocus
                                                            onBlur={e => handleCellBlur(row.id, col.key, e.target.value || null, row)}
                                                            className="w-full py-0.5 px-1.5 text-sm border border-slate-300 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            defaultValue={val}
                                                            autoFocus
                                                            onBlur={e => handleCellBlur(row.id, col.key, e.target.value, row)}
                                                            className="w-full py-0.5 px-1.5 text-sm border border-slate-300 rounded bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                                        />
                                                    )
                                                ) : (
                                                    <span
                                                        onClick={() => canEdit && setEditingCell({ rowId: row.id, key: col.key })}
                                                        className={canEdit ? 'cursor-text block min-h-[1.5rem]' : ''}
                                                    >
                                                        {savingId === row.id ? <Loader2 size={12} className="animate-spin inline" /> : formatCellValue(val, col)}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {canEdit && (
                                        <td className="px-2 py-1.5 text-center align-middle border-slate-100 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(row.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
