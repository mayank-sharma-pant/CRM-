'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Package, Plus, Search, AlertTriangle } from 'lucide-react';

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

    if (loading) {
        return (
            <div className="mx-auto max-w-[1440px] px-6 py-6 bg-page min-h-screen">
                <div className="h-10 w-64 bg-surface border border-border rounded mb-6 animate-pulse" />
                <div className="h-80 bg-surface border border-border rounded animate-pulse" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-8 pb-12 bg-page min-h-screen">
            <div className="flex items-center justify-between py-6 border-b border-border bg-gradient-to-r from-surface-elevated/10 to-transparent rounded-b-xl px-4 -mx-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-br from-primary to-primary/60">
                        Stock Inventory
                    </h1>
                    <p className="text-[11px] text-muted font-black uppercase tracking-[0.2em] mt-1 opacity-70 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-accent/30" /> Live visibility for {roleLabel}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-success uppercase tracking-widest">System Online</span>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-surface/40 backdrop-blur-sm p-4 rounded-xl border border-border/60 shadow-sm transition-all hover:shadow-md hover:border-border">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name / SKU / category..."
                        className="w-full pl-11 pr-4 py-2.5 bg-surface-elevated/50 border border-border/40 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                    />
                </div>
                <div className="px-4 py-2 bg-surface-elevated/40 rounded-lg border border-border/30 text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap">
                    {filtered.length} items total
                </div>
            </div>

            {canManage && (
                <div className="bg-surface/60 backdrop-blur-md rounded-xl border border-border/80 p-6 shadow-sm transition-all hover:shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Plus size={16} className="text-accent" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-primary">Add New Inventory</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Item Name</label>
                            <input className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="e.g., Premium Solar Panel"
                                value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">SKU</label>
                            <input className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="SKU-001"
                                value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Category</label>
                            <input className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary placeholder:text-muted/40 focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Category"
                                value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Price</label>
                            <input type="number" className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="0.00"
                                value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Qty</label>
                            <input type="number" className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="0"
                                value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus size={14} strokeWidth={3} /> ADD ITEM
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-surface/40 backdrop-blur-sm rounded-xl border border-border/60 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/40">
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Item Details</th>
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">SKU / ID</th>
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Category</th>
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Unit Price</th>
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Available</th>
                                <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Status</th>
                                {canManage && <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-right">Actions</th>}
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
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-warning/10 text-warning border-warning/20 shadow-sm shadow-warning/5 animate-pulse">
                                                <AlertTriangle size={10} /> CRITICAL
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20 shadow-sm shadow-success/5">
                                                <div className="h-1.5 w-1.5 rounded-full bg-success" /> OPTIMAL
                                            </span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-error/10 hover:border-error/30 hover:text-error transition-all"
                                                >
                                                    <div className="w-2.5 h-[2px] bg-current rounded-full" />
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
                    <div className="py-24 text-center">
                        <Package size={48} className="mx-auto text-muted/20 mb-4" />
                        <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Workspace Empty</h3>
                        <p className="text-xs text-muted/60 mt-1">No stock items match your current filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
