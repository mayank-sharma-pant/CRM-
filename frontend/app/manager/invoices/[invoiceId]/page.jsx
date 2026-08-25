'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../services/api';
import InvoiceGstSummary from '../../../../components/invoices/InvoiceGstSummary';
import ShareLinkControls from '../../../../components/portal/ShareLinkControls';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    AlertTriangle,
    Building,
    User,
    Receipt,
    FileText
} from 'lucide-react';

export default function ManagerInvoiceDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetchInvoice = async () => {
            try {
                const res = await api.get(`/invoices/${params.invoiceId}`);
                const d = res.data;
                const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                const statusMap = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue', draft: 'Draft', sent: 'Sent' };
                const st = statusMap[(d.status || '').toLowerCase()] || d.status || 'Draft';

                const timeline = [];
                if (d.issued) timeline.push({ date: d.issued, event: 'Invoice Created', status: 'complete' });
                if (st === 'Pending' || st === 'Overdue' || st === 'Paid')
                    timeline.push({ date: d.issued, event: 'Invoice Sent', status: 'complete' });
                if (d.due) timeline.push({ date: d.due, event: 'Payment Due', status: st === 'Paid' ? 'complete' : 'pending' });
                if (st === 'Paid') timeline.push({ date: d.due, event: 'Payment Received', status: 'complete' });
                else timeline.push({ date: null, event: 'Payment Received', status: 'upcoming' });

                if (!cancelled) {
                    setInvoice({
                        id: d.number,
                        db_id: d.id,
                        share_active: d.share_active,
                        status: st,
                    client: {
                        name: d.client?.name || 'Unknown',
                        contact: d.client?.name || '',
                        email: d.client?.email || '',
                        phone: '',
                        address: d.client?.address || ''
                    },
                    amount: fmt(d.total),
                    subtotal: fmt(d.subtotal),
                    tax: fmt(d.tax),
                    cgst: fmt(d.cgst),
                    sgst: fmt(d.sgst),
                    igst: fmt(d.igst),
                    taxMode: d.tax_mode,
                    sellerGstin: d.seller_gstin || '',
                    buyerGstin: d.buyer_gstin || '',
                    placeOfSupply: d.place_of_supply || '',
                    dueDate: d.due || '',
                    issueDate: d.issued || '',
                    paymentTerms: 'Net 30',
                    paymentTimeline: timeline,
                    items: (d.items || []).map(i => ({
                        description: i.description,
                        qty: i.quantity || 1,
                        unitPrice: fmt(i.unit_price),
                        total: fmt(i.total),
                        hsn: i.hsn || '',
                    }))
                });
                }
            } catch (err) {
                console.error('Failed to fetch invoice:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        setLoading(true);
        fetchInvoice();
        return () => { cancelled = true; };
    }, [params.invoiceId]);

    const refetchInvoice = async () => {
        try {
            const res = await api.get(`/invoices/${params.invoiceId}`);
            const d = res.data;
            setInvoice((prev) => prev ? { ...prev, share_active: d.share_active } : prev);
        } catch (err) {
            console.error('Failed to refetch invoice:', err);
        }
    };

    const goBack = () => {
        router.back();
    };

    if (loading) return <DetailSkeleton />;

    if (!invoice) return (
        <div className="mx-auto max-w-[1100px] py-12 text-center text-slate-500">
            Invoice not found.
        </div>
    );

    return (
        <div className="mx-auto max-w-[1100px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">
            {/* Back Link */}
            <button
                onClick={goBack}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
                <ArrowLeft size={16} />
                Back
            </button>

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
                                        <th className="text-left py-2 font-medium text-slate-500 w-24 whitespace-nowrap">HSN</th>
                                        <th className="text-center py-2 font-medium text-slate-500 w-20 whitespace-nowrap">Qty</th>
                                        <th className="text-right py-2 font-medium text-slate-500 w-28 whitespace-nowrap">Unit Price</th>
                                        <th className="text-right py-2 font-medium text-slate-500 w-28 whitespace-nowrap">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                    {invoice.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap">{item.description}</td>
                                            <td className="py-2.5 text-slate-500 font-mono whitespace-nowrap">{item.hsn || '—'}</td>
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
                            <InvoiceGstSummary invoice={invoice} />
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
                </div>

                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-4 space-y-6">

                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-3">Client portal</h3>
                        <ShareLinkControls
                            kind="invoice"
                            id={invoice.db_id}
                            shareActive={invoice.share_active}
                            onChange={refetchInvoice}
                        />
                    </div>

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
                            {invoice.sellerGstin && (
                                <div className="flex justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">Seller GSTIN</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-mono text-right break-all">{invoice.sellerGstin}</span>
                                </div>
                            )}
                            {invoice.buyerGstin && (
                                <div className="flex justify-between gap-3">
                                    <span className="text-slate-500 shrink-0">Buyer GSTIN</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-mono text-right break-all">{invoice.buyerGstin}</span>
                                </div>
                            )}
                            {invoice.placeOfSupply && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Place of supply</span>
                                    <span className="text-slate-800 dark:text-slate-200">{invoice.placeOfSupply}</span>
                                </div>
                            )}
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
