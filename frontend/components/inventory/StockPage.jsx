'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Package, Plus, Minus, Search, AlertTriangle, Trash2 } from 'lucide-react';

const STOCK_POLL_INTERVAL_MS = 30000;

export default function StockPage({ canManage = false, roleLabel = 'Team' }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [newItem, setNewItem] = useState({
        name: '',
        sku: '',
        category: '',
        unit: 'pcs',
        unit_price: 0,
        quantity: 0,
        reorder_level: 0,
    });

    const fetchItems = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            const res = await api.get('/inventory', { params: { limit: 500 } });
            setItems(res.data?.items || []);
        } catch (err) {
            console.error('Failed to fetch stock', err);
            setItems([]);
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchItems(true);
        const intervalId = setInterval(() => {
            fetchItems(false);
        }, STOCK_POLL_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchItems]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            [it.name, it.sku, it.category].some((v) => (v || '').toLowerCase().includes(q))
        );
    }, [items, search]);

    const handleCreate = async () => {
        if (!newItem.name.trim()) {
            alert('Item name is required');
            return;
        }
        try {
            await api.post('/inventory', {
                ...newItem,
                unit_price: Number(newItem.unit_price || 0),
                quantity: Number(newItem.quantity || 0),
                reorder_level: Number(newItem.reorder_level || 0),
            });
            setNewItem({
                name: '',
                sku: '',
                category: '',
                unit: 'pcs',
                unit_price: 0,
                quantity: 0,
                reorder_level: 0,
            });
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to create stock item');
        }
    };

    const adjustQty = async (id, delta) => {
        const raw = window.prompt(`Enter quantity to ${delta > 0 ? 'add' : 'remove'}:`, '1');
        if (raw === null) return;
        const abs = Number(raw);
        if (!Number.isFinite(abs) || abs <= 0) {
            alert('Enter a valid positive number');
            return;
        }
        const qty = delta > 0 ? abs : -abs;
        try {
            await api.post(`/inventory/${id}/adjust`, { quantity_change: qty });
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to update quantity');
        }
    };

    const deleteItem = async (id, name) => {
        const confirmed = window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`);
        if (!confirmed) return;
        try {
            // Some hosting layers block DELETE; backend provides POST alias for compatibility.
            await api.post(`/inventory/${id}/delete`);
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to delete stock item');
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-[1440px] px-6 py-6 bg-page min-h-screen">
                <div className="h-10 w-64 bg-surface border border-border rounded mb-6 animate-pulse" />
                <div className="h-80 bg-surface border border-border rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div className="bg-page min-h-screen">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Stock</h1>
                    <p className="page-subtitle">Inventory for {roleLabel.toLowerCase()}</p>
                </div>
            </div>

            <div className="page-body space-y-5">
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, SKU, or category"
                        className="input pl-9"
                    />
                </div>
                <span className="text-[13px] text-muted tabular-nums whitespace-nowrap">
                    {filtered.length} items
                </span>
            </div>

            {canManage && (
                <div className="panel p-5">
                    <h2 className="text-[13px] font-semibold text-primary mb-4">Add item</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Item Name</label>
                            <input
                                aria-label="Name"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Name"
                                value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">SKU</label>
                            <input
                                aria-label="SKU"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="SKU"
                                value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Category</label>
                            <input
                                aria-label="Category"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Category"
                                value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Price</label>
                            <input
                                aria-label="Price"
                                type="number"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Price"
                                value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Qty</label>
                            <input
                                aria-label="Qty"
                                type="number"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Qty"
                                value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Reorder</label>
                            <input
                                aria-label="Reorder"
                                type="number"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Reorder"
                                value={newItem.reorder_level}
                                onChange={(e) => setNewItem({ ...newItem, reorder_level: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="btn btn-primary w-full"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-surface/40 backdrop-blur-sm rounded-xl border border-border/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/40">
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Item</th>
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">SKU</th>
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Category</th>
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Unit price</th>
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Available</th>
                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Status</th>
                                {canManage && <th className="py-2.5 px-4 text-[12px] font-medium text-muted text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {filtered.map((item) => (
                                <tr key={item.id} className="group hover:bg-surface-elevated/40 transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent/20 transition-colors">
                                                <Package size={16} />
                                            </div>
                                            <span className="text-sm font-bold text-primary">{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-mono text-muted/80 bg-surface-elevated/40 px-2 py-1 rounded border border-border/30">
                                            {item.sku || 'NO-SKU'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-medium text-secondary bg-surface-elevated/30 px-2.5 py-1 rounded-full border border-border/20">
                                            {item.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-bold text-primary tabular-nums">
                                            ₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black tabular-nums text-primary">{item.quantity}</span>
                                            <span className="text-[10px] font-bold text-muted uppercase tracking-tighter opacity-60">{item.unit || 'pcs'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        {item.is_low_stock ? (
                                            <span className="badge badge-warning">
                                                <AlertTriangle size={10} /> Low
                                            </span>
                                        ) : (
                                            <span className="badge badge-success">
                                                In stock
                                            </span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => adjustQty(item.id, +1)}
                                                    title="Add Stock"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-success/10 hover:border-success/30 hover:text-success transition-all"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <button
                                                    onClick={() => adjustQty(item.id, -1)}
                                                    title="Remove Stock"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-warning/10 hover:border-warning/30 hover:text-warning transition-all"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteItem(item.id, item.name)}
                                                    title="Delete Item"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-error/10 hover:border-error/30 hover:text-error transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-16 text-center">
                        <Package size={28} className="mx-auto text-muted mb-3" />
                        <h3 className="text-sm font-medium text-primary">No stock items</h3>
                        <p className="text-[13px] text-muted mt-1">Nothing matches this search.</p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
