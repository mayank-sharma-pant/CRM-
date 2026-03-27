'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { Package, Plus, Search, AlertTriangle } from 'lucide-react';

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

    const fetchItems = async () => {
        try {
            setLoading(true);
            const res = await api.get('/inventory', { params: { limit: 500 } });
            setItems(res.data?.items || []);
        } catch (err) {
            console.error('Failed to fetch stock', err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

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
            fetchItems();
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
            fetchItems();
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
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Stock Inventory</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">
                        Live visibility for {roleLabel}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3 bg-surface p-3 rounded-md border border-border">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name / SKU / category"
                        className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-border rounded-md text-sm"
                    />
                </div>
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                    {filtered.length} items
                </div>
            </div>

            {canManage && (
                <div className="bg-surface rounded-md border border-border p-4 grid grid-cols-1 md:grid-cols-7 gap-2">
                    <input className="px-3 py-2 border border-border rounded-md text-sm" placeholder="Name"
                        value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                    <input className="px-3 py-2 border border-border rounded-md text-sm" placeholder="SKU"
                        value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} />
                    <input className="px-3 py-2 border border-border rounded-md text-sm" placeholder="Category"
                        value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} />
                    <input className="px-3 py-2 border border-border rounded-md text-sm" placeholder="Unit"
                        value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} />
                    <input type="number" className="px-3 py-2 border border-border rounded-md text-sm" placeholder="Price"
                        value={newItem.unit_price} onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })} />
                    <input type="number" className="px-3 py-2 border border-border rounded-md text-sm" placeholder="Qty"
                        value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} />
                    <div className="flex gap-2">
                        <input type="number" className="px-3 py-2 border border-border rounded-md text-sm w-full" placeholder="Reorder"
                            value={newItem.reorder_level} onChange={(e) => setNewItem({ ...newItem, reorder_level: e.target.value })} />
                        <button
                            onClick={handleCreate}
                            className="px-3 py-2 bg-accent text-white rounded-md text-sm font-bold flex items-center gap-1"
                        >
                            <Plus size={14} /> Add
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-surface rounded-md border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border bg-surface-elevated/20">
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">Item</th>
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">SKU</th>
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">Category</th>
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">Price</th>
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">Available</th>
                                <th className="py-3 px-4 text-[10px] font-black text-muted uppercase tracking-widest">Status</th>
                                {canManage && <th className="py-3 px-4"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-elevated/30">
                                    <td className="py-3 px-4 text-sm font-bold text-primary flex items-center gap-2">
                                        <Package size={14} className="text-muted" /> {item.name}
                                    </td>
                                    <td className="py-3 px-4 text-xs font-mono text-secondary">{item.sku || '-'}</td>
                                    <td className="py-3 px-4 text-xs text-secondary">{item.category || '-'}</td>
                                    <td className="py-3 px-4 text-sm font-bold text-primary">${Number(item.unit_price || 0).toFixed(2)}</td>
                                    <td className="py-3 px-4 text-sm font-bold tabular-nums">{item.quantity} {item.unit}</td>
                                    <td className="py-3 px-4">
                                        {item.is_low_stock ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest bg-warning/10 text-warning border-warning/20">
                                                <AlertTriangle size={10} /> Low
                                            </span>
                                        ) : (
                                            <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20">
                                                Healthy
                                            </span>
                                        )}
                                    </td>
                                    {canManage && (
                                        <td className="py-3 px-4 text-right">
                                            <button onClick={() => adjustQty(item.id, +1)} className="px-2 py-1 text-xs border border-border rounded mr-2">+ Add</button>
                                            <button onClick={() => adjustQty(item.id, -1)} className="px-2 py-1 text-xs border border-border rounded">- Remove</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-14 text-center text-sm text-muted">No stock items found.</div>
                )}
            </div>
        </div>
    );
}
