'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { ShoppingBag, Plus, Search, Trash2, Ban } from 'lucide-react';

const EMPTY_FORM = {
    name: '',
    sku: '',
    unit: 'unit',
    unit_price: 0,
    tax_rate: 18,
    hsn: '',
    stock_item_id: '',
};

export default function ProductsPage({ canManage = false, roleLabel = 'Team' }) {
    const [items, setItems] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [newItem, setNewItem] = useState({ ...EMPTY_FORM });

    const fetchItems = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            setError(null);
            const [productsRes, inventoryRes] = await Promise.all([
                api.get('/products', { params: { active_only: false, limit: 500 } }),
                canManage
                    ? api.get('/inventory', { params: { limit: 500 } })
                    : Promise.resolve({ data: { items: [] } }),
            ]);
            setItems(productsRes.data?.items || []);
            setStockItems(inventoryRes.data?.items || []);
        } catch (err) {
            console.error('Failed to fetch products', err);
            setItems([]);
            setError(err.response?.data?.detail || 'Unable to load products. Please try again.');
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, [canManage]);

    useEffect(() => {
        fetchItems(true);
    }, [fetchItems]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            [it.name, it.sku, it.hsn, it.unit].some((v) => (v || '').toLowerCase().includes(q))
        );
    }, [items, search]);

    const handleCreate = async () => {
        if (!newItem.name.trim()) {
            alert('Product name is required');
            return;
        }
        try {
            const stockId = newItem.stock_item_id ? parseInt(newItem.stock_item_id, 10) : null;
            await api.post('/products', {
                name: newItem.name.trim(),
                sku: newItem.sku.trim() || null,
                unit: newItem.unit.trim() || 'unit',
                unit_price: Number(newItem.unit_price || 0),
                tax_rate: Number(newItem.tax_rate || 0),
                hsn: newItem.hsn.trim() || null,
                stock_item_id: Number.isFinite(stockId) ? stockId : null,
            });
            setNewItem({ ...EMPTY_FORM });
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to create product');
        }
    };

    const deactivateItem = async (id, name) => {
        const confirmed = window.confirm(`Deactivate "${name}"? It will be hidden from pickers.`);
        if (!confirmed) return;
        try {
            await api.patch(`/products/${id}`, { is_active: false });
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to deactivate product');
        }
    };

    const deleteItem = async (id, name) => {
        const confirmed = window.confirm(`Permanently delete "${name}"? This cannot be undone.`);
        if (!confirmed) return;
        try {
            await api.delete(`/products/${id}`);
            fetchItems(false);
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'string' ? detail : 'Failed to delete product');
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

    if (error) {
        return (
            <div className="mx-auto max-w-[1440px] px-6 py-6 bg-page min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-bold text-error uppercase tracking-widest">{typeof error === 'string' ? error : 'Failed to load'}</p>
                    <button
                        type="button"
                        onClick={() => fetchItems(true)}
                        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const isEmptyCatalog = items.length === 0;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-8 pb-12 bg-page min-h-screen">
            <div className="flex items-center justify-between py-6 border-b border-border bg-gradient-to-r from-surface-elevated/10 to-transparent rounded-b-xl px-4 -mx-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-br from-primary to-primary/60">
                        Products
                    </h1>
                    <p className="text-[11px] text-muted font-black uppercase tracking-[0.2em] mt-1 opacity-70 flex items-center gap-2">
                        <span className="w-8 h-[1px] bg-accent/30" /> Price book for {roleLabel}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-surface/40 backdrop-blur-sm p-4 rounded-xl border border-border/60 shadow-sm">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" aria-hidden="true" />
                    <label htmlFor="products-search" className="sr-only">Search products</label>
                    <input
                        id="products-search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name / SKU / HSN..."
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-border/40 rounded-lg text-sm text-black placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                    />
                </div>
                <div className="px-4 py-2 bg-surface-elevated/40 rounded-lg border border-border/30 text-[10px] font-black uppercase tracking-widest text-muted whitespace-nowrap">
                    {filtered.length} items
                </div>
            </div>

            {canManage && (
                <div className="bg-surface/60 backdrop-blur-md rounded-xl border border-border/80 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Plus size={16} className="text-accent" aria-hidden="true" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-primary">Add Product</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="product-name" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Name</label>
                            <input
                                id="product-name"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="Name"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="product-sku" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">SKU</label>
                            <input
                                id="product-sku"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="SKU"
                                value={newItem.sku}
                                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="product-unit" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Unit</label>
                            <input
                                id="product-unit"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="unit"
                                value={newItem.unit}
                                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="product-price" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Price</label>
                            <input
                                id="product-price"
                                type="number"
                                min={0}
                                step={0.01}
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                value={newItem.unit_price}
                                onChange={(e) => setNewItem({ ...newItem, unit_price: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="product-tax" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Tax %</label>
                            <input
                                id="product-tax"
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                value={newItem.tax_rate}
                                onChange={(e) => setNewItem({ ...newItem, tax_rate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="product-hsn" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">HSN</label>
                            <input
                                id="product-hsn"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                placeholder="HSN"
                                value={newItem.hsn}
                                onChange={(e) => setNewItem({ ...newItem, hsn: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5 lg:col-span-2">
                            <label htmlFor="product-stock" className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Stock link</label>
                            <select
                                id="product-stock"
                                className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                value={newItem.stock_item_id}
                                onChange={(e) => setNewItem({ ...newItem, stock_item_id: e.target.value })}
                            >
                                <option value="">None</option>
                                {stockItems.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}{s.sku ? ` (${s.sku})` : ''} — {s.quantity} {s.unit || 'pcs'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreate}
                            className="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                        >
                            <Plus size={14} strokeWidth={3} aria-hidden="true" /> ADD
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-surface/40 backdrop-blur-sm rounded-xl border border-border/60 overflow-hidden shadow-sm">
                {isEmptyCatalog ? (
                    <div className="py-24 text-center">
                        <ShoppingBag size={48} className="mx-auto text-muted/20 mb-4" aria-hidden="true" />
                        <h3 className="text-sm font-bold text-muted uppercase tracking-widest">No products</h3>
                        <p className="text-xs text-muted/60 mt-1">
                            {canManage
                                ? 'Add your first catalog item above.'
                                : 'Ask an admin to add catalog items.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border bg-surface-elevated/40">
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Product</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">SKU</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Unit</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Price</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Tax %</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">HSN</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Status</th>
                                        {canManage && (
                                            <th className="py-4 px-6 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-right">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {filtered.map((item) => (
                                        <tr key={item.id} className="group hover:bg-surface-elevated/40 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                        <ShoppingBag size={16} aria-hidden="true" />
                                                    </div>
                                                    <span className="text-sm font-bold text-primary">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-mono text-muted/80 bg-surface-elevated/40 px-2 py-1 rounded border border-border/30">
                                                    {item.sku || '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-secondary">{item.unit || 'unit'}</td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-bold text-primary tabular-nums">
                                                    ₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm font-bold tabular-nums text-primary">{Number(item.tax_rate || 0)}%</td>
                                            <td className="py-4 px-6 text-xs text-muted">{item.hsn || '—'}</td>
                                            <td className="py-4 px-6">
                                                {item.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-muted/10 text-muted border-border">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            {canManage && (
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {item.is_active && (
                                                            <button
                                                                type="button"
                                                                onClick={() => deactivateItem(item.id, item.name)}
                                                                title="Deactivate"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-warning/10 hover:border-warning/30 hover:text-warning focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                                                            >
                                                                <Ban size={14} aria-hidden="true" />
                                                                <span className="sr-only">Deactivate {item.name}</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteItem(item.id, item.name)}
                                                            title="Delete"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface-elevated hover:bg-error/10 hover:border-error/30 hover:text-error focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                                                        >
                                                            <Trash2 size={14} aria-hidden="true" />
                                                            <span className="sr-only">Delete {item.name}</span>
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
                                <p className="text-xs text-muted/60">No products match your current filters.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
