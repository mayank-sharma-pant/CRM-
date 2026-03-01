'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../services/api';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    AlertTriangle,
    Building,
    User,
    Receipt,
    DollarSign,
    Calendar,
    FileText,
    Send,
    CreditCard
} from 'lucide-react';

export default function InvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const res = await api.get(`/purchase/invoices/${params.invoiceId}`);
                const d = res.data;
                const fmt = (v) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                const statusMap = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', draft: 'Draft', sent: 'Sent' };
                const st = statusMap[(d.status || '').toLowerCase()] || d.status || 'Draft';

                const timeline = [];
                if (d.issued) timeline.push({ date: d.issued, event: 'Invoice Created', status: 'complete' });
                if (st === 'Pending' || st === 'Overdue' || st === 'Paid')
                    timeline.push({ date: d.issued, event: 'Invoice Sent', status: 'complete' });
                if (d.due) timeline.push({ date: d.due, event: 'Payment Due', status: st === 'Paid' ? 'complete' : 'pending' });
                if (st === 'Paid') timeline.push({ date: d.due, event: 'Payment Received', status: 'complete' });
                else timeline.push({ date: null, event: 'Payment Received', status: 'upcoming' });

                setInvoice({
                    id: d.number || `INV-${d.id}`,
                    db_id: d.id,
                    status: st,
                    client: {
                        name: d.client?.name || 'Unknown',
                        contact: d.client?.name || '',
                        email: d.client?.email || '',
                        phone: '',
                        address: d.client?.address || ''
                    },
                    linkedSale: null,
                    amount: fmt(d.total),
                    subtotal: fmt(d.subtotal),
                    tax: fmt(d.tax),
                    dueDate: d.due || '',
                    issueDate: d.issued || '',
                    paymentTerms: 'Net 30',
                    paymentTimeline: timeline,
                    items: (d.items || []).map(i => ({
                        description: i.description,
                        qty: i.quantity || 1,
                        unitPrice: fmt(i.unit_price),
                        total: fmt(i.total)
                    })),
                    auditLog: []
                });
            } catch (err) {
                console.error('Failed to fetch invoice:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [params.invoiceId]);

    const handleSend = async () => {
        setActionLoading(true);
        try {
            await api.post(`/purchase/invoices/${invoice.db_id}/send`);
            alert('Invoice sent');
            router.refresh();
        } catch { alert('Failed'); }
        finally { setActionLoading(false); }
    };

    const handleMarkPaid = async () => {
        setActionLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            await api.post(`/purchase/invoices/${invoice.db_id}/mark-paid?payment_date=${today}`);
            alert('Marked as paid');
            router.refresh();
        } catch { alert('Failed'); }
        finally { setActionLoading(false); }
    };

    if (loading) return <DetailSkeleton />;

    const isPending = invoice.status === 'Pending' || invoice.status === 'Sent';
    const isDraft = invoice.status === 'Draft';

    return (
        <div className="mx-auto max-w-[1100px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Back Link */}
            <Link
                href="/purchase/invoices"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-emerald-600 transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Invoices
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">{invoice.id}</h1>
                        <StatusBadge status={invoice.status} />
                    </div>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium">{invoice.client.name}</p>
                </div>
                <div className="text-right">
                    <div className="text-[32px] font-bold text-slate-900 dark:text-white">{invoice.amount}</div>
                    <div className="text-[13px] text-slate-500">Due: {invoice.dueDate}</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* Main Content */}
                <div className="col-span-12 lg:col-span-8 space-y-6">

                    {/* Invoice Items */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Invoice Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                        <th className="text-left py-2 font-medium text-slate-500 whitespace-nowrap">Description</th>
                                        <th className="text-center py-2 font-medium text-slate-500 w-20 whitespace-nowrap">Qty</th>
                                        <th className="text-right py-2 font-medium text-slate-500 w-28 whitespace-nowrap">Unit Price</th>
                                        <th className="text-right py-2 font-medium text-slate-500 w-28 whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {invoice.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{item.description}</td>
                                            <td className="py-2.5 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">{item.qty}</td>
                                            <td className="py-2.5 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">{item.unitPrice}</td>
                                            <td className="py-2.5 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
                            <div className="flex justify-between text-[14px]">
                                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                                <span className="text-slate-800 dark:text-slate-200">{invoice.subtotal}</span>
                            </div>
                            <div className="flex justify-between text-[14px]">
                                <span className="text-slate-600 dark:text-slate-400">Tax</span>
                                <span className="text-slate-800 dark:text-slate-200">{invoice.tax}</span>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 flex justify-between text-[16px] font-semibold">
                                <span className="text-slate-900 dark:text-white">Total</span>
                                <span className="text-slate-900 dark:text-white">{invoice.amount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Status Timeline */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Payment Timeline</h3>
                        <div className="relative">
                            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                            <div className="space-y-4">
                                {invoice.paymentTimeline.map((step, i) => (
                                    <div key={i} className="flex items-start gap-4 relative">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.status === 'complete' ? 'bg-emerald-500' :
                                            step.status === 'pending' ? 'bg-amber-500' :
                                                'bg-slate-300 dark:bg-slate-600'
                                            }`}>
                                            {step.status === 'complete' && <CheckCircle size={14} className="text-white" />}
                                            {step.status === 'pending' && <Clock size={14} className="text-white" />}
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{step.event}</div>
                                            <div className="text-[12px] text-slate-500">{step.date || 'Pending'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Audit Log */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Audit Log</h3>
                        <div className="space-y-3">
                            {invoice.auditLog.map((log, i) => (
                                <div key={i} className="flex items-start gap-3 text-[12px]">
                                    <span className="text-slate-400 font-mono w-32 shrink-0">{log.timestamp}</span>
                                    <span className="text-slate-700 dark:text-slate-300">{log.action}</span>
                                    <span className="text-slate-500 ml-auto">{log.user}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-4 space-y-6">

                    {/* Approval Controls */}
                    {(isPending || isDraft) && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Actions</h3>
                            <div className="space-y-3">
                                {isDraft && (
                                    <button
                                        onClick={handleSend}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Send size={18} />
                                        Send Invoice
                                    </button>
                                )}
                                {isPending && (
                                    <button
                                        onClick={handleMarkPaid}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        <CreditCard size={18} />
                                        Mark as Paid
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Linked Sale */}
                    {invoice.linkedSale && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Linked Sale</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Receipt size={16} className="text-emerald-500" />
                                    <Link
                                        href={`/purchase/sales/3`}
                                        className="text-[13px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        {invoice.linkedSale.saleId}
                                    </Link>
                                </div>
                                <div className="text-[13px] text-slate-600 dark:text-slate-400">
                                    Amount: {invoice.linkedSale.amount}
                                </div>
                                <div className="text-[12px] text-slate-500">
                                    Rep: {invoice.linkedSale.rep}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Client Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Client Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Building size={16} className="text-slate-400" />
                                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{invoice.client.name}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <User size={16} className="text-slate-400" />
                                <div className="text-[13px] text-slate-600 dark:text-slate-400">{invoice.client.contact}</div>
                            </div>
                            <div className="text-[12px] text-slate-500 dark:text-slate-400 pl-7">
                                {invoice.client.email}<br />
                                {invoice.client.phone}
                            </div>
                            <div className="text-[12px] text-slate-500 dark:text-slate-400 pl-7 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                                {invoice.client.address}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Invoice Details</h3>
                        <div className="space-y-3 text-[13px]">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Issue Date</span>
                                <span className="text-slate-800 dark:text-slate-200">{invoice.issueDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Due Date</span>
                                <span className="text-slate-800 dark:text-slate-200">{invoice.dueDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Payment Terms</span>
                                <span className="text-slate-800 dark:text-slate-200">{invoice.paymentTerms}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    let colors = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    let Icon = FileText;

    if (status === 'Paid') {
        colors = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        Icon = CheckCircle;
    } else if (status === 'Pending' || status === 'Sent') {
        colors = 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        Icon = Clock;
    } else if (status === 'Overdue') {
        colors = 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        Icon = AlertTriangle;
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold uppercase ${colors}`}>
            <Icon size={12} />
            {status}
        </span>
    );
}

function DetailSkeleton() {
    return (
        <div className="mx-auto max-w-[1100px] space-y-6 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="flex justify-between">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8 space-y-6">
                    <div className="h-[250px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-[180px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
                <div className="col-span-4 space-y-6">
                    <div className="h-[150px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-[120px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
}
