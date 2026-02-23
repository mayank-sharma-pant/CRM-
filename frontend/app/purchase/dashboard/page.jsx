'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../services/api';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Receipt,
    ShoppingCart,
    Activity,
    ChevronRight,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Calendar,
    Bell
} from 'lucide-react';

export default function PurchaseDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await api.get('/purchase/dashboard');
                const apiData = res.data;

                // Bridge backend to rich UI format
                const enrichedData = {
                    kpis: apiData.kpis || [],
                    approvalQueue: apiData.approval_queue || [],
                    invoiceHealth: apiData.invoice_health || { paid: 0, pending: 0, overdue: 0, draft: 0 },
                    monitoringHighlights: [] // Backend /monitoring endpoint can fill this later
                };

                setData(enrichedData);
            } catch (err) {
                console.error("Failed to fetch purchase dashboard", err);
                setError('Unable to load purchase dashboard. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) return <DashboardSkeleton />;

    if (error) {
        return (
            <div className="mx-auto max-w-[1440px] px-6 pb-12 bg-page min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="text-[13px] font-bold text-error uppercase tracking-widest">{error}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const totalInvoices = data.invoiceHealth.paid + data.invoiceHealth.pending + data.invoiceHealth.overdue + data.invoiceHealth.draft;

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Precise & Integrated */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Purchase Cockpit</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Inventory & Procurement Matrix</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-secondary text-[12px] font-bold uppercase tracking-tight hover:bg-surface-elevated shadow-sm transition-all">
                        <Calendar size={14} className="text-muted" strokeWidth={2.5} />
                        <span>L30D</span>
                    </button>
                    <div className="h-6 w-px bg-border mx-1"></div>
                    <button className="p-2 text-muted hover:text-primary transition-colors">
                        <Bell size={18} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* KPI Strip: Dense Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {data.kpis.map((kpi) => (
                    <div
                        key={kpi.id}
                        onClick={() => router.push(kpi.route)}
                        className="bg-surface rounded-md border border-border p-4 h-[100px] flex flex-col justify-between hover:bg-surface-elevated transition-colors cursor-pointer shadow-sm group"
                    >
                        <div className="flex justify-between items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{kpi.label}</span>
                            <BadgeChange change={kpi.change} trend={kpi.trend} />
                        </div>
                        <span className="text-[28px] font-black tracking-tighter text-primary tabular-nums leading-none">{kpi.value}</span>
                    </div>
                ))}
            </div>

            {/* Approval Queue + Invoice Health */}
            <div className="grid grid-cols-12 gap-5">

                {/* Approval Queue: Integrated Tool List */}
                <div className="col-span-12 lg:col-span-7 bg-surface rounded-md border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/30">
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={16} className="text-accent" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Approval Pipeline</h3>
                        </div>
                        <LinkText href="/purchase/sales">Review Full Ledger</LinkText>
                    </div>
                    <div className="divide-y divide-border/50">
                        {data.approvalQueue.map((item, idx) => (
                            <div
                                key={item.id}
                                onClick={() => router.push(`/purchase/sales/${item.id}`)}
                                className={`group flex items-center justify-between px-5 py-2.5 hover:bg-surface-elevated/50 cursor-pointer transition-all border-l-2 border-transparent hover:border-accent ${idx % 2 !== 0 ? 'bg-surface-elevated/5' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${item.priority === 'high' ? 'bg-error animate-pulse' : item.priority === 'medium' ? 'bg-warning' : 'bg-info'}`}></div>
                                    <div>
                                        <div className="text-[13px] font-bold text-primary group-hover:text-accent transition-colors">{item.client}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase tracking-tight opacity-70 mt-0.5">{item.type} | {item.date}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5">
                                    <span className="text-[14px] font-black text-secondary tabular-nums font-mono">{item.amount}</span>
                                    <ChevronRight size={14} className="text-muted group-hover:text-accent transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invoice Health: Refined Status Metrics */}
                <div className="col-span-12 lg:col-span-5 bg-surface rounded-md border border-border shadow-sm p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                            <Receipt size={16} className="text-muted" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Accounts Payable</h3>
                        </div>
                        <LinkText href="/purchase/invoices">Ledger Details</LinkText>
                    </div>
                    <div className="space-y-4 flex-1">
                        <InvoiceHealthBar label="Liquidated" value={data.invoiceHealth.paid} total={totalInvoices} color="success" icon={CheckCircle} />
                        <InvoiceHealthBar label="In Process" value={data.invoiceHealth.pending} total={totalInvoices} color="warning" icon={Clock} />
                        <InvoiceHealthBar label="At Risk" value={data.invoiceHealth.overdue} total={totalInvoices} color="error" icon={AlertTriangle} />
                        <InvoiceHealthBar label="Buffered" value={data.invoiceHealth.draft} total={totalInvoices} color="info" icon={Receipt} />
                    </div>
                    <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                            <span className="text-[10px] font-black text-muted uppercase tracking-widest">Health Synchronized</span>
                        </div>
                        <span className="text-[11px] font-black text-secondary uppercase tabular-nums">{totalInvoices} Entities Total</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions + Monitoring Highlights */}
            <div className="grid grid-cols-12 gap-5">

                {/* Quick Actions: High-Density Commands */}
                <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-secondary opacity-70" strokeWidth={2.5} />
                        <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Command Center</h3>
                    </div>
                    <div className="space-y-1.5">
                        <CommandButton icon={ShoppingCart} label="Review Sales" onClick={() => router.push('/purchase/sales')} />
                        <CommandButton icon={Receipt} label="Manage Invoices" onClick={() => router.push('/purchase/invoices')} />
                        <CommandButton icon={Activity} label="Monitoring Matrix" onClick={() => router.push('/purchase/monitoring')} />
                    </div>
                </div>

                {/* Monitoring Highlights: Alert Matrix */}
                <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/20">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-warning" strokeWidth={2.5} />
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Active Indicators</h3>
                        </div>
                        <LinkText href="/purchase/monitoring">Live Stream</LinkText>
                    </div>
                    <div className="divide-y divide-border/50">
                        {data.monitoringHighlights.map((item) => (
                            <div key={item.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-surface-elevated/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${item.severity === 'High' ? 'bg-error shadow-sm shadow-error/40' : 'bg-warning shadow-sm shadow-warning/40'}`}></div>
                                    <div>
                                        <p className="text-[13px] font-bold text-primary leading-none">{item.title}</p>
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1 py-0.5 rounded-[4px] border ${item.severity === 'High' ? 'bg-error/10 text-error border-error/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                                {item.severity} SEVERITY
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-muted tabular-nums uppercase">{item.time}</span>
                            </div>
                        ))}
                        {data.monitoringHighlights.length === 0 && (
                            <div className="py-12 text-center">
                                <Activity className="text-muted/20 mx-auto mb-2" size={24} />
                                <span className="text-[11px] font-black text-muted uppercase tracking-widest opacity-30">All systems within normal parameters</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SUBCOMPONENTS ---

function InvoiceHealthBar({ label, value, total, color, icon: Icon }) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const colorMap = {
        success: 'bg-success',
        warning: 'bg-warning',
        error: 'bg-error',
        info: 'bg-info'
    };
    const textMap = {
        success: 'text-success',
        warning: 'text-warning',
        error: 'text-error',
        info: 'text-info'
    };

    return (
        <div className="flex items-center gap-3">
            <Icon size={14} className={textMap[color]} strokeWidth={2.5} />
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-tight">{label}</span>
                    <span className="text-[12px] font-black text-primary tabular-nums">{value}</span>
                </div>
                <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
                    <div className={`h-full ${colorMap[color]} rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,0,0,0.1)]`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        </div>
    );
}

function BadgeChange({ change, trend }) {
    if (!change) return null;
    const isUp = trend === 'up';
    const isDown = trend === 'down';

    return (
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-black tabular-nums border ${isUp ? 'bg-success/10 text-success border-success/20' :
                isDown ? 'bg-error/10 text-error border-error/20' :
                    'bg-surface-elevated text-muted border-border'
            }`}>
            {isUp && <TrendingUp size={10} strokeWidth={3} />}
            {isDown && <TrendingDown size={10} strokeWidth={3} />}
            {!isUp && !isDown && <Minus size={10} strokeWidth={3} />}
            {change}
        </div>
    );
}

function LinkText({ href, children }) {
    const router = useRouter();
    return (
        <button onClick={() => router.push(href)} className="text-[11px] font-black text-accent hover:text-accent-hover uppercase tracking-tight transition-all">
            {children}
        </button>
    );
}

function CommandButton({ icon: Icon, label, onClick, highlight }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-all group ${highlight
                    ? 'bg-accent/5 border-accent/20 hover:bg-accent/10 hover:border-accent/40'
                    : 'bg-surface border-border hover:bg-surface-elevated hover:border-secondary/30'
                }`}
        >
            <Icon size={16} className={`${highlight ? 'text-accent' : 'text-muted'} group-hover:scale-110 transition-transform`} strokeWidth={2.5} />
            <span className={`text-[12px] font-bold ${highlight ? 'text-accent' : 'text-secondary'} uppercase tracking-tight`}>{label}</span>
            <ChevronRight size={14} className="ml-auto text-muted group-hover:translate-x-0.5 transition-transform" />
        </button>
    );
}

function DashboardSkeleton() {
    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page animate-pulse pt-4">
            <div className="flex justify-between py-4 border-b border-border mb-4">
                <div className="h-8 w-48 bg-surface rounded"></div>
                <div className="h-8 w-32 bg-surface rounded"></div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => <div key={i} className="h-[100px] bg-surface rounded-md border border-border"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5 mb-6">
                <div className="col-span-7 h-[300px] bg-surface rounded-md border border-border"></div>
                <div className="col-span-5 h-[300px] bg-surface rounded-md border border-border"></div>
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-4 h-[240px] bg-surface rounded-md border border-border"></div>
                <div className="col-span-8 h-[240px] bg-surface rounded-md border border-border"></div>
            </div>
        </div>
    );
}
