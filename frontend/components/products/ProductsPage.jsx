'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { ShoppingBag, Plus, Search, Trash2, Ban, Package, Wrench, Repeat } from 'lucide-react';

const KINDS = [
    { value: 'goods', label: 'Goods', hint: 'Physical / inventory', Icon: Package },
    { value: 'service', label: 'Service', hint: 'One-off work', Icon: Wrench },
    { value: 'subscription', label: 'Subscription', hint: 'Recurring plan', Icon: Repeat },
];

const BILLING_INTERVALS = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'one_time', label: 'One-time' },
];

const DEFAULT_UNITS = {
    goods: 'unit',
    service: 'job',
    subscription: 'seat',
};

const EMPTY_FORM = {
    name: '',
    sku: '',
    kind: 'goods',
    billing_interval: 'monthly',
    unit: 'unit',
    unit_price: 0,
    tax_rate: 18,
    hsn: '',
    stock_item_id: '',
};

const ALL_KIND_VALUES = KINDS.map((k) => k.value);

function kindMeta(kind) {
    return KINDS.find((k) => k.value === kind) || KINDS[0];
}

function emptyForm(kind) {
    const next = kind || 'goods';
    return { ...EMPTY_FORM, kind: next, unit: DEFAULT_UNITS[next] || 'unit' };
}

export default function ProductsPage({ canManage = false, roleLabel = 'Team', manageKinds }) {
    const writableKinds = manageKinds ?? (canManage ? ALL_KIND_VALUES : []);
    const canWrite = writableKinds.length > 0;
    const defaultKind = writableKinds.includes('goods') ? 'goods' : (writableKinds[0] || 'goods');
    const addKinds = KINDS.filter((k) => writableKinds.includes(k.value));
    const canLinkStock = writableKinds.includes('goods');

    const [items, setItems] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [kindFilter, setKindFilter] = useState('all');
    const [newItem, setNewItem] = useState(() => emptyForm(defaultKind));

    const fetchItems = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }
            setError(null);
            const [productsRes, inventoryRes] = await Promise.all([
                api.get('/products', { params: { active_only: false, limit: 500 } }),
                canLinkStock
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
    }, [canLinkStock]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const setKind = (kind) => {
        setNewItem((prev) => ({
            ...prev,
            kind,
            unit: DEFAULT_UNITS[kind] || 'unit',
            stock_item_id: kind === 'goods' ? prev.stock_item_id : '',
            billing_interval: kind === 'subscription' ? (prev.billing_interval || 'monthly') : 'monthly',
        }));
    };

    const handleCreate = async () => {
        if (!newItem.name.trim()) return;
        try {
            const payload = {
                name: newItem.name.trim(),
                sku: newItem.sku.trim() || null,
                kind: newItem.kind,
                unit: newItem.unit.trim() || DEFAULT_UNITS[newItem.kind] || 'unit',
                unit_price: Number(newItem.unit_price) || 0,
                tax_rate: Number(newItem.tax_rate) || 0,
                hsn: newItem.hsn.trim() || null,
            };
            if (newItem.kind === 'subscription') {
                payload.billing_interval = newItem.billing_interval || 'monthly';
            }
            if (newItem.kind === 'goods' && newItem.stock_item_id) {
                payload.stock_item_id = Number(newItem.stock_item_id);
            }
            await api.post('/products', payload);
            setNewItem(emptyForm(defaultKind));
            fetchItems(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create product.');
        }
    };

    const deactivateItem = async (id, name) => {
        if (!window.confirm(`Deactivate “${name}”? It will stay on past quotes/invoices.`)) return;
        try {
            await api.patch(`/products/${id}`, { is_active: false });
            fetchItems(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to deactivate.');
        }
    };

    const deleteItem = async (id, name) => {
        if (!window.confirm(`Delete “${name}”? This fails if it is used on a quote or invoice.`)) return;
        try {
            await api.delete(`/products/${id}`);
            fetchItems(false);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to delete.');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            const kind = item.kind || 'goods';
            if (kindFilter !== 'all' && kind !== kindFilter) return false;
            if (!q) return true;
            return (
                (item.name || '').toLowerCase().includes(q) ||
                (item.sku || '').toLowerCase().includes(q) ||
                (item.hsn || '').toLowerCase().includes(q) ||
                kind.includes(q)
            );
        });
    }, [items, search, kindFilter]);

    const isEmptyCatalog = !loading && items.length === 0;

    return (
        <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
            <div className="page-header">
                <div>
                    <p className="text-[11px] font-medium text-muted uppercase tracking-[0.12em] mb-1">
                        {roleLabel} · Catalog
                    </p>
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">
                        {writableKinds.includes('goods')
                            ? 'Goods, services, and subscriptions. Stock links only apply to goods.'
                            : 'Services and subscriptions you sell. Physical inventory is on Stock.'}
                    </p>
                </div>
            </div>

            <div className="page-body space-y-5">
                {error && (
                    <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                        <label htmlFor="products-search" className="sr-only">Search products</label>
                        <input
                            id="products-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, SKU, HSN, or type"
                            className="input pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-surface" role="group" aria-label="Filter by type">
                        <button
                            type="button"
                            onClick={() => setKindFilter('all')}
                            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                                kindFilter === 'all' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-primary'
                            }`}
                        >
                            All
                        </button>
                        {KINDS.map((k) => (
                            <button
                                key={k.value}
                                type="button"
                                onClick={() => setKindFilter(k.value)}
                                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                                    kindFilter === k.value ? 'bg-accent/15 text-accent' : 'text-muted hover:text-primary'
                                }`}
                            >
                                {k.label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[13px] text-muted tabular-nums whitespace-nowrap">
                        {filtered.length} items
                    </span>
                </div>

                {canWrite && (
                    <div className="panel p-5 space-y-4">
                        <h2 className="text-[13px] font-semibold text-primary">Add catalog item</h2>

                        <div className="flex flex-wrap gap-2" role="group" aria-label="Product type">
                            {addKinds.map(({ value, label, hint, Icon }) => {
                                const selected = newItem.kind === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setKind(value)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                                            selected
                                                ? 'border-accent/50 bg-accent/10 text-primary'
                                                : 'border-border bg-surface-elevated text-muted hover:border-border hover:text-primary'
                                        }`}
                                    >
                                        <Icon size={14} aria-hidden="true" />
                                        <span>
                                            <span className="block text-[13px] font-medium">{label}</span>
                                            <span className="block text-[11px] opacity-70">{hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4 items-end">
                            <div className="space-y-1.5 md:col-span-2">
                                <label htmlFor="product-name" className="text-[12px] font-medium text-muted ml-0.5">Name</label>
                                <input
                                    id="product-name"
                                    className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                    placeholder="Name"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="product-sku" className="text-[12px] font-medium text-muted ml-0.5">SKU</label>
                                <input
                                    id="product-sku"
                                    className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                    placeholder="SKU"
                                    value={newItem.sku}
                                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="product-unit" className="text-[12px] font-medium text-muted ml-0.5">Unit</label>
                                <input
                                    id="product-unit"
                                    className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                    placeholder={DEFAULT_UNITS[newItem.kind] || 'unit'}
                                    value={newItem.unit}
                                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="product-price" className="text-[12px] font-medium text-muted ml-0.5">
                                    {newItem.kind === 'subscription' ? 'Price / period' : 'Price'}
                                </label>
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
                                <label htmlFor="product-tax" className="text-[12px] font-medium text-muted ml-0.5">Tax %</label>
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
                                <label htmlFor="product-hsn" className="text-[12px] font-medium text-muted ml-0.5">
                                    {newItem.kind === 'goods' ? 'HSN' : 'HSN / SAC'}
                                </label>
                                <input
                                    id="product-hsn"
                                    className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                    placeholder={newItem.kind === 'goods' ? 'HSN' : 'SAC'}
                                    value={newItem.hsn}
                                    onChange={(e) => setNewItem({ ...newItem, hsn: e.target.value })}
                                />
                            </div>

                            {newItem.kind === 'subscription' && (
                                <div className="space-y-1.5">
                                    <label htmlFor="product-billing" className="text-[12px] font-medium text-muted ml-0.5">Billing</label>
                                    <select
                                        id="product-billing"
                                        className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                        value={newItem.billing_interval}
                                        onChange={(e) => setNewItem({ ...newItem, billing_interval: e.target.value })}
                                    >
                                        {BILLING_INTERVALS.map((b) => (
                                            <option key={b.value} value={b.value}>{b.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {newItem.kind === 'goods' && (
                                <div className="space-y-1.5 lg:col-span-2">
                                    <label htmlFor="product-stock" className="text-[12px] font-medium text-muted ml-0.5">
                                        Stock link (optional)
                                    </label>
                                    <select
                                        id="product-stock"
                                        className="w-full px-4 py-2.5 bg-surface-elevated border border-border/60 rounded-lg text-sm text-primary focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all font-medium"
                                        value={newItem.stock_item_id}
                                        onChange={(e) => setNewItem({ ...newItem, stock_item_id: e.target.value })}
                                    >
                                        <option value="">None — no inventory deduction</option>
                                        {stockItems.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}{s.sku ? ` (${s.sku})` : ''} — {s.quantity} {s.unit || 'pcs'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCreate}
                                className="btn btn-primary w-full"
                            >
                                <Plus size={14} aria-hidden="true" /> Add
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-surface/40 backdrop-blur-sm rounded-xl border border-border/60 overflow-hidden shadow-sm">
                    {loading ? (
                        <div className="py-16 text-center text-[13px] text-muted">Loading catalog…</div>
                    ) : isEmptyCatalog ? (
                        <div className="py-24 text-center">
                            <ShoppingBag size={28} className="mx-auto text-muted mb-3" aria-hidden="true" />
                            <h3 className="text-sm font-medium text-primary">No catalog items</h3>
                            <p className="text-[13px] text-muted mt-1">
                                {canWrite
                                    ? (writableKinds.includes('goods')
                                        ? 'Add goods, a service, or a subscription above.'
                                        : 'Add a service or subscription above. Physical stock stays on Stock.')
                                    : 'Ask an admin to add catalog items.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-border bg-surface-elevated/40">
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Item</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Type</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">SKU</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Unit</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Price</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Tax %</th>
                                            <th className="py-2.5 px-4 text-[12px] font-medium text-muted">Status</th>
                                            {canWrite && (
                                                <th className="py-2.5 px-4 text-[12px] font-medium text-muted text-right">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filtered.map((item) => {
                                            const meta = kindMeta(item.kind || 'goods');
                                            const Icon = meta.Icon;
                                            const interval =
                                                item.kind === 'subscription' && item.billing_interval
                                                    ? BILLING_INTERVALS.find((b) => b.value === item.billing_interval)?.label
                                                    : null;
                                            return (
                                                <tr key={item.id} className="group hover:bg-surface-elevated/40 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                                                                <Icon size={16} aria-hidden="true" />
                                                            </div>
                                                            <div>
                                                                <span className="text-sm font-semibold text-primary block">{item.name}</span>
                                                                {item.stock_item_id != null && (
                                                                    <span className="text-[11px] text-muted">
                                                                        Linked stock
                                                                        {item.stock_quantity != null ? ` · qty ${item.stock_quantity}` : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="badge badge-neutral">
                                                            {meta.label}
                                                            {interval ? ` · ${interval}` : ''}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-xs font-mono text-muted bg-surface-elevated/40 px-2 py-1 rounded border border-border/30">
                                                            {item.sku || '—'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-secondary">{item.unit || 'unit'}</td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-sm font-semibold text-primary tabular-nums">
                                                            ₹{Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            {interval ? (
                                                                <span className="text-[11px] font-normal text-muted"> / {interval.toLowerCase()}</span>
                                                            ) : null}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm tabular-nums text-primary">{Number(item.tax_rate || 0)}%</td>
                                                    <td className="py-3 px-4">
                                                        {item.is_active ? (
                                                            <span className="badge badge-success">Active</span>
                                                        ) : (
                                                            <span className="badge badge-neutral">Inactive</span>
                                                        )}
                                                    </td>
                                                    {canWrite && (
                                                        <td className="py-3 px-4 text-right">
                                                            {writableKinds.includes(item.kind || 'goods') ? (
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
                                                            ) : null}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {filtered.length === 0 && (
                                <div className="py-16 text-center">
                                    <p className="text-xs text-muted">No products match your current filters.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
