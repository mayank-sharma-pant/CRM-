'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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

    useEffect(() => {
        setTimeout(() => {
            // Mock invoice detail data
            const invoiceData = {
                id: decodeURIComponent(params.invoiceId),
                status: 'Pending',
                client: {
                    name: 'BigBank International',
                    contact: 'John Smith',
                    email: 'john.smith@bigbank.com',
                    phone: '+1 (555) 123-4567',
                    address: '123 Finance Street, New York, NY 10001'
                },
                linkedSale: {
                    saleId: 'SAL-2024-003',
                    amount: '$45,000.00',
                    rep: 'Alex Johnson'
                },
                amount: '$12,500.00',
                subtotal: '$11,904.76',
                tax: '$595.24',
                dueDate: '2024-01-25',
                issueDate: '2024-01-05',
                paymentTerms: 'Net 20',
                paymentTimeline: [
                    { date: '2024-01-05', event: 'Invoice Created', status: 'complete' },
                    { date: '2024-01-06', event: 'Invoice Sent', status: 'complete' },
                    { date: '2024-01-25', event: 'Payment Due', status: 'pending' },
                    { date: null, event: 'Payment Received', status: 'upcoming' }
                ],
                items: [
                    { description: 'Consulting Services - Phase 1', qty: 1, unitPrice: '$8,000.00', total: '$8,000.00' },
                    { description: 'Implementation Support', qty: 10, unitPrice: '$390.48', total: '$3,904.76' }
                ],
                auditLog: [
                    { timestamp: '2024-01-05 09:30', action: 'Invoice Created', user: 'System' },
                    { timestamp: '2024-01-05 09:35', action: 'Approved by Finance', user: 'Sarah Wilson' },
                    { timestamp: '2024-01-06 10:00', action: 'Sent to Client', user: 'Alex Johnson' }
                ]
            };
            setInvoice(invoiceData);
            setLoading(false);
        }, 400);
    }, [params.invoiceId]);

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
                        <table className="w-full text-[13px]">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/50">
                                    <th className="text-left py-2 font-medium text-slate-500">Description</th>
                                    <th className="text-center py-2 font-medium text-slate-500 w-20">Qty</th>
                                    <th className="text-right py-2 font-medium text-slate-500 w-28">Unit Price</th>
                                    <th className="text-right py-2 font-medium text-slate-500 w-28">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {invoice.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="py-2.5 text-slate-800 dark:text-slate-200">{item.description}</td>
                                        <td className="py-2.5 text-center text-slate-600 dark:text-slate-400">{item.qty}</td>
                                        <td className="py-2.5 text-right text-slate-600 dark:text-slate-400">{item.unitPrice}</td>
                                        <td className="py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">{item.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                                        title="Backend integration required"
                                    >
                                        <CheckCircle size={18} />
                                        Approve Invoice
                                    </button>
                                )}
                                {isDraft && (
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                                        title="Backend integration required"
                                    >
                                        <Send size={18} />
                                        Mark as Sent
                                    </button>
                                )}
                                {isPending && (
                                    <button
                                        disabled
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                                        title="Backend integration required"
                                    >
                                        <CreditCard size={18} />
                                        Mark as Paid
                                    </button>
                                )}
                                <p className="text-[11px] text-slate-400 text-center mt-2">Backend integration required</p>
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
