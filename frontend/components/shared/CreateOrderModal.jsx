'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
    X,
    Trash2,
    Plus,
    Receipt
} from 'lucide-react';

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: 0, stock_item_id: null, hsn: '' };

export default function CreateOrderModal({ isOpen, onClose, onCreated, clientId, clientName, endpoint = '/invoices' }) {
    const [clients, setClients] = useState([]);
    const [selectedClientId, setSelectedClientId] = useState(clientId || '');
    const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [dueDays, setDueDays] = useState(30);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || clientId) return;
        api.get('/clients').then(res => {
            const data = res.data?.items ?? res.data?.clients ?? res.data;
            setClients(Array.isArray(data) ? data : []);
        }).catch(() => { });
    }, [clientId, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedClientId(clientId || '');
    }, [clientId, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setInventoryLoading(true);
        api.get('/inventory', { params: { limit: 500, in_stock_only: true } }).then((res) => {
            setInventory(res.data?.items || []);
        }).catch(() => {
            setInventory([]);
        }).finally(() => {
            setInventoryLoading(false);
        });
    }, [isOpen]);

    const stockById = useMemo(
        () => Object.fromEntries(inventory.map((item) => [item.id, item])),
        [inventory]
    );

    const getReservedQty = (stockItemId, excludeIndex = -1) => {
        return items.reduce((sum, item, index) => {
            if (index === excludeIndex) return sum;
            if (item.stock_item_id !== stockItemId) return sum;
            return sum + (Number(item.quantity) || 0);
        }, 0);
    };

    const validateStockLimits = () => {
        for (let idx = 0; idx < items.length; idx += 1) {
            const item = items[idx];
            if (!item.stock_item_id) continue;
            const stock = stockById[item.stock_item_id];
            if (!stock) return `Selected stock item on row ${idx + 1} is not available.`;
            const requested = (Number(item.quantity) || 0) + getReservedQty(item.stock_item_id, idx);
            if (requested > Number(stock.quantity || 0)) {
                return `Insufficient stock for "${stock.name}". Available: ${stock.quantity}, requested total: ${requested}.`;
            }
        }
        return null;
    };

    const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const updateItem = (idx, field, value) => {
        const updated = [...items];
        if (field === 'quantity') {
            updated[idx][field] = value;
        } else if (field === 'unit_price') {
            updated[idx][field] = value;
        } else if (field === 'stock_item_id') {
            const stockId = value ? parseInt(value, 10) : null;
            updated[idx].stock_item_id = Number.isFinite(stockId) ? stockId : null;
            if (updated[idx].stock_item_id) {
                const selectedStock = stockById[updated[idx].stock_item_id];
                if (selectedStock) {
                    updated[idx].description = selectedStock.name || updated[idx].description;
                    updated[idx].unit_price = Number(selectedStock.unit_price || 0);
                }
            }
        } else {
            updated[idx][field] = value;
        }
        setItems(updated);
    };

    if (!isOpen) return null;

    const subtotal = items.reduce((sum, item) => sum + ((parseFloat(item.unit_price) || 0) * (parseInt(item.quantity) || 0)), 0);
    const total = subtotal + tax - discount;

    const handleSubmit = async () => {
        const targetClientId = clientId || selectedClientId;
        if (!targetClientId) { alert('Please select a client'); return; }
        if (items.some(i => !i.description.trim())) { alert('All items need a description'); return; }

        const stockError = validateStockLimits();
        if (stockError) { alert(stockError); return; }

        setSubmitting(true);
        try {
            await api.post(endpoint, {
                client_id: parseInt(targetClientId, 10),
                items: items.map(i => ({
                    description: i.description,
                    quantity: parseInt(i.quantity, 10) || 1,
                    unit_price: parseFloat(i.unit_price) || 0,
                    stock_item_id: i.stock_item_id || null,
                    hsn: (i.hsn || '').trim() || null,
                })),
                ...(tax ? { tax } : {}),
                discount,
                due_days: dueDays,
                notes: notes || null
            });
            alert('Order created successfully!');
            setItems([{ ...EMPTY_ITEM }]);
            setNotes('');
            setTax(0);
            setDiscount(0);
            onCreated();
        } catch (err) {
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Receipt size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Draft Record</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Initiate a new entry</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!clientId && (
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Client Selection</label>
                            <select
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            >
                                <option value="">Select a client...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {clientId && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-100 dark:border-slate-700/50">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Order For</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{clientName || 'Selected Client'}</span>
                        </div>
                    )}

                    <div>
                        <div className="flex items-center justify-between mb-2 ml-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Items</label>
                            <button onClick={addItem} className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold">
                                <Plus size={12} /> Add Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-start group border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                                    <div className="col-span-12 md:col-span-4">
                                        <select
                                            value={item.stock_item_id || ''}
                                            onChange={(e) => updateItem(idx, 'stock_item_id', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        >
                                            <option value="">Custom item (manual)</option>
                                            {inventory.map(stock => (
                                                <option key={stock.id} value={stock.id}>
                                                    {stock.name} {stock.sku ? `(${stock.sku})` : ''} - {stock.quantity} {stock.unit}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                                            {inventoryLoading ? 'Loading stock...' : 'Select stock to auto-fill name and price'}
                                        </p>
                                    </div>

                                    <div className="col-span-12 md:col-span-3">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            placeholder="Item detail..."
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                                        />
                                        {item.stock_item_id && stockById[item.stock_item_id] && (
                                            <p className="text-[10px] mt-1.5 font-semibold text-slate-500 dark:text-slate-400">
                                                Available: {stockById[item.stock_item_id].quantity} {stockById[item.stock_item_id].unit}
                                            </p>
                                        )}
                                    </div>

                                    <div className="col-span-4 md:col-span-1">
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                            placeholder="Qty"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-center"
                                            min={1}
                                        />
                                    </div>

                                    <div className="col-span-6 md:col-span-2">
                                        <input
                                            type="number"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                            placeholder="Price"
                                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-right"
                                            min={0}
                                            step={0.01}
                                        />
                                    </div>

                                    <div className="col-span-4 md:col-span-1">
                                        <input
                                            type="text"
                                            value={item.hsn || ''}
                                            onChange={(e) => updateItem(idx, 'hsn', e.target.value)}
                                            placeholder="HSN"
                                            aria-label="HSN or SAC code"
                                            className="w-full px-2 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>

                                    <div className="col-span-2 md:col-span-1 flex justify-end">
                                        {items.length > 1 && (
                                            <button onClick={() => removeItem(idx)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tax Offset (₹)</label>
                            <input
                                type="number"
                                value={tax || ''}
                                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                min={0}
                                step={0.01}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Discount (₹)</label>
                            <input
                                type="number"
                                value={discount || ''}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                min={0}
                                step={0.01}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Order Memo</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                            placeholder="Specify order details or special requests..."
                        />
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2.5">
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Subtotal</span>
                            <span className="text-slate-300 font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Admin/Tax (+)</span>
                            <span className="text-emerald-500 font-mono">+₹{tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                            <span>Incentive/Disc (-)</span>
                            <span className="text-red-400 font-mono">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-bold text-white pt-2.5 border-t border-slate-800">
                            <span className="text-sm uppercase tracking-wider">Final Order Value</span>
                            <span className="text-lg font-mono">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm"
                    >
                        Keep Browsing
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {submitting ? 'Submitting...' : 'Save Draft'}
                    </button>
                </div>
            </div>
        </div>
    );
}
