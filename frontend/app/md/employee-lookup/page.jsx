'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    User,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    X,
    ArrowRight,
    AlertTriangle,
    Info,
    Calendar,
    Target,
    Zap,
    Shuffle,
    Check
} from 'lucide-react';
import api from '@/services/api';
import {
    LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, Tooltip
} from 'recharts';

function buildEmployeeView(employeePayload) {
    // Basic mapping from API payload to this page's richer UI shape.
    const base = employeePayload?.employee;
    if (!base) return null;

    // Fallbacks so the UI doesn't break if some metrics are missing.
    const leads = employeePayload?.performance?.leads ?? 0;
    const converted = employeePayload?.performance?.converted ?? 0;

    return {
        id: base.formatted_id || `EMP${base.id.toString().padStart(3, '0')}`,
        name: base.name,
        role: (base.role || '').toString().toUpperCase(),
        team: base.team || 'Unassigned',
        reportingTo: 'N/A',
        kpis: [
            { label: 'Leads Handled', value: String(leads), sub: 'Company-scope' },
            { label: 'Converted Deals', value: String(converted), sub: 'Rolling window' },
            { label: 'Team Avg Leads', value: String(employeePayload?.team_performance?.avg_leads_per_member || 0), sub: 'Team Benchmark' },
            { label: 'Conversion Yield', value: leads ? `${Math.round((converted / leads) * 100)}%` : '0%', sub: 'Approximate' },
        ],
        trends: employeePayload?.trends || {
            sales: [0, 0, 0, 0, 0, 0, 0],
            conversion: [0, 0, 0, 0, 0, 0, 0],
            activity: [0, 0, 0, 0, 0, 0, 0],
        },
        signals: [],
        raw_id: base.id // Store numeric ID for API calls
    };
}

export default function MDEmployeeLookupPage() {
    const router = useRouter();
    const [employeeId, setEmployeeId] = useState('');
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('escalation'); // escalation | incentive
    const [selectedSignal, setSelectedSignal] = useState(null);
    const [trendTab, setTrendTab] = useState('sales');
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [allTeams, setAllTeams] = useState([]);
    const [targetTeam, setTargetTeam] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLookup = async () => {
        if (!employeeId.trim()) {
            setError('VALID EMPLOYEE ID REQUIRED');
            return;
        }

        setLoading(true);
        setError('');
        setEmployee(null);

        try {
            const numericId = parseInt(employeeId.replace(/\D/g, ''), 10);
            if (!numericId || Number.isNaN(numericId)) {
                setError('VALID EMPLOYEE ID REQUIRED');
                setLoading(false);
                return;
            }

            const res = await api.get(`/md/employee-lookup/${numericId}`);
            const built = buildEmployeeView(res.data);
            if (!built) {
                setError('IDENTIFIER NOT FOUND IN CENTRAL REGISTRY');
                setLoading(false);
                return;
            }
            setEmployee(built);
            
            // Fetch teams for transfer option
            const teamsRes = await api.get('/admin/teams');
            setAllTeams(teamsRes.data.teams || []);
            
        } catch (err) {
            if (err?.response?.status === 404) {
                setError('IDENTIFIER NOT FOUND IN CENTRAL REGISTRY');
            } else {
                setError('UNABLE TO REACH EMPLOYEE DIRECTORY. RETRY FROM MD CONSOLE.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTransferSubmit = async () => {
        if (!targetTeam) return;
        setIsSubmitting(true);
        try {
            await api.post('/md/transfer-request', {
                user_id: employee.raw_id,
                target_team_id: parseInt(targetTeam),
                reason: transferReason
            });
            alert("Transfer request successfully logged in centralized approval queue.");
            setIsTransferModalOpen(false);
            setTargetTeam('');
            setTransferReason('');
        } catch (err) {
            console.error("Transfer request failed", err);
            alert(err.response?.data?.detail || "System Error: Transfer request rejected by validator.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1440px] px-6 space-y-6 pb-12 bg-page min-h-screen">

            {/* Header: Forensic Identity Verification */}
            <div className="flex items-center justify-between py-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-primary">Identity Performance Audit</h1>
                    <p className="text-[13px] text-muted font-bold uppercase tracking-widest mt-0.5 opacity-80">Forensic Snapshot & Risk Isolation</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                        <button
                            onClick={() => setMode('escalation')}
                            className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${mode === 'escalation' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                }`}
                        >
                            Escalation
                        </button>
                        <button
                            onClick={() => setMode('incentive')}
                            className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${mode === 'incentive' ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                }`}
                        >
                            Incentive Review
                        </button>
                    </div>
                </div>
            </div>

            {/* Search Control Strip */}
            <div className="bg-surface rounded-md border border-border p-4 shadow-sm">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" strokeWidth={2.5} />
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) => { setEmployeeId(e.target.value); setError(''); }}
                            onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
                            placeholder="INPUT EMPLOYEE IDENTIFIER (E.G. EMP001)..."
                            className="w-full pl-9 pr-4 py-2 bg-surface-elevated border border-border rounded-md text-[11px] font-bold uppercase tracking-widest placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent transition-all"
                        />
                    </div>
                    <button
                        onClick={handleLookup}
                        disabled={loading}
                        className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-[11px] font-black uppercase tracking-tight shadow-sm shadow-accent/10 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'VALIDATING...' : 'AUDIT IDENTITY'}
                    </button>
                </div>
                {error && (
                    <div className="mt-3 flex items-center gap-2 text-error">
                        <AlertTriangle size={14} strokeWidth={2.5} />
                        <span className="text-[11px] font-black uppercase tracking-tight">{error}</span>
                    </div>
                )}
            </div>

            {loading && <LookupSkeleton />}

            {employee && !loading && (
                <div className="space-y-6" style={{ animation: 'fadeIn 200ms ease-out' }}>

                    {/* Identity Data Block */}
                    <div className="bg-surface rounded-md border border-border p-5 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
                                <User size={24} className="text-accent" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-[20px] font-black text-primary tracking-tight">{employee.name}</h2>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="text-[12px] font-mono font-bold text-muted uppercase">{employee.id}</span>
                                    <span className="text-[11px] font-black text-accent uppercase tracking-widest px-2 py-0.5 bg-accent/5 rounded-[4px] border border-accent/20">{employee.role}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right border-l border-border pl-8 flex flex-col items-end">
                            <div className="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Structural Unit</div>
                            <div className="text-[14px] font-bold text-primary">{employee.team}</div>
                            <div className="text-[11px] font-bold text-muted mt-0.5 italic mb-3">Supervisor: {employee.reportingTo}</div>
                            
                            {(employee.role === 'MANAGER' || employee.role === 'SALES') && (
                                <button 
                                    onClick={() => setIsTransferModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-accent/10 border border-border hover:border-accent/40 rounded text-[10px] font-black text-muted hover:text-accent uppercase tracking-widest transition-all"
                                >
                                    <Shuffle size={12} />
                                    Initiate Transfer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* KPI High-Density Matrix */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {employee.kpis.map((kpi, i) => (
                            <div key={i} className={`bg-surface p-4 rounded-md border border-border shadow-sm group hover:bg-surface-elevated transition-colors ${mode === 'incentive' && (kpi.label.includes('Yield') || kpi.label.includes('Revenue') || kpi.label.includes('Rank'))
                                    ? 'border-accent/30 bg-accent/5'
                                    : ''
                                }`}>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted group-hover:text-secondary">{kpi.label}</span>
                                <div className="mt-1 flex flex-col">
                                    <span className="text-[24px] font-black tracking-tighter tabular-nums leading-none text-primary">{kpi.value}</span>
                                    <span className="text-[11px] font-bold text-muted uppercase tracking-tight mt-1 opacity-70 italic">{kpi.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Trends & Signals Split (8 + 4) */}
                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 lg:col-span-8 bg-surface rounded-md border border-border shadow-sm p-5 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight">Behavioral Latency Trends</h3>
                                <div className="flex bg-surface-elevated p-1 rounded-md border border-border">
                                    {['sales', 'conversion', 'activity'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setTrendTab(tab)}
                                            className={`px-3 py-1.5 rounded-[4px] text-[11px] font-black uppercase tracking-tight transition-all ${trendTab === tab ? 'bg-surface text-primary shadow-sm' : 'text-muted hover:text-secondary'
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={employee.trends[trendTab].map((v, i) => ({ i, value: v }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                                        <XAxis dataKey="i" hide />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', fontSize: '11px', fontWeight: 'bold' }} />
                                        <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-4 bg-surface rounded-md border border-border shadow-sm p-5">
                            <h3 className="text-[14px] font-bold text-primary uppercase tracking-tight mb-4">Risk Isolation</h3>
                            <div className="space-y-3">
                                {employee.signals.map((signal) => (
                                    <div
                                        key={signal.id}
                                        onClick={() => setSelectedSignal(signal)}
                                        className="group p-3 rounded-md border border-border bg-surface-elevated/20 hover:border-accent hover:bg-surface-elevated/40 cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-[4px] border ${signal.severity === 'High' ? 'bg-error/10 text-error border-error/20' :
                                                    signal.severity === 'Medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                                        'bg-info/10 text-info border-info/20'
                                                }`}>
                                                {signal.severity} PRIORITY
                                            </span>
                                            <span className="text-[10px] font-bold text-muted uppercase">{signal.detected}</span>
                                        </div>
                                        <p className="text-[13px] font-bold text-primary mb-2 group-hover:text-accent transition-colors">{signal.title}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {signal.evidence.map((ev, j) => (
                                                    <span key={j} className="text-[10px] font-bold text-muted uppercase tracking-tight px-1.5 py-0.5 bg-surface border border-border rounded-[4px]">{ev}</span>
                                                ))}
                                            </div>
                                            <ChevronRight size={14} className="text-muted group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                ))}
                                {employee.signals.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted/30">
                                        <Zap size={32} />
                                        <p className="mt-3 text-[11px] font-black uppercase tracking-widest">No signals isolated</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIGNAL DRAWER (FORENSIC DETAIL) */}
            {selectedSignal && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm" onClick={() => setSelectedSignal(null)}></div>
                    <div className="relative w-full max-w-md bg-surface h-full shadow-2xl border-l border-border p-8 overflow-y-auto" style={{ animation: 'slideInRight 160ms ease-out forwards' }}>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-[18px] font-black text-primary uppercase tracking-tight">Signal Analysis</h2>
                            <button onClick={() => setSelectedSignal(null)} className="p-2 rounded-md hover:bg-surface-elevated text-muted transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <section>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-[4px] border ${selectedSignal.severity === 'High' ? 'bg-error text-white border-error' :
                                        'bg-surface-elevated text-primary border-border'
                                    }`}>
                                    {selectedSignal.severity} SEVERITY
                                </span>
                                <h3 className="text-[22px] font-black text-primary tracking-tight mt-4 leading-tight">{selectedSignal.title}</h3>
                                <p className="text-[12px] font-bold text-muted uppercase tracking-wide mt-2 opacity-70 italic">Detected: {selectedSignal.detected}</p>
                            </section>

                            <section className="p-4 bg-surface-elevated/30 rounded-md border border-border">
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Isolated Evidence</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedSignal.evidence.map((ev, i) => (
                                        <div key={i} className="px-3 py-1.5 bg-surface border border-border rounded-md text-[13px] font-mono font-bold text-primary">
                                            {ev}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-muted uppercase tracking-widest mb-3">Contextual Analysis</h4>
                                <p className="text-[14px] font-bold text-secondary leading-relaxed opacity-80">{selectedSignal.description}</p>
                            </section>

                            <section className="pt-8 border-t border-border mt-auto">
                                <button
                                    onClick={() => router.push('/md/sales')}
                                    className="w-full flex items-center justify-between px-5 py-4 bg-accent text-white rounded-md text-[14px] font-black uppercase tracking-tight shadow-md shadow-accent/20 hover:bg-accent-hover transition-all"
                                >
                                    Proceed to System Monitoring
                                    <ArrowRight size={18} strokeWidth={2.5} />
                                </button>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal - Cyberpunk Audit Style */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
                    <div className="bg-surface border border-border w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/50">
                            <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <Shuffle size={14} className="text-accent" />
                                Transfer Protocol Initialization
                            </h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-5">
                            <div className="p-3 bg-surface-elevated/30 border border-border rounded flex items-center gap-4">
                                <div className="w-10 h-10 rounded bg-accent/10 flex items-center justify-center text-accent font-black text-sm">
                                    {employee.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="text-[13px] font-black text-primary uppercase tracking-tight">{employee.name}</div>
                                    <div className="text-[10px] font-bold text-muted uppercase tracking-widest">{employee.id} // {employee.role}</div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-muted uppercase tracking-[0.15em]">Deployment Target (Team)</label>
                                <select 
                                    value={targetTeam}
                                    onChange={(e) => setTargetTeam(e.target.value)}
                                    className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 text-[12px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-all appearance-none cursor-pointer"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='Length 19 9l-7 7-7-7' /%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                                >
                                    <option value="" className="bg-surface">SELECT OPERATION UNIT...</option>
                                    {allTeams
                                        .filter(t => t.name !== employee.team)
                                        .map(t => (
                                            <option key={t.id} value={t.id} className="bg-surface">{t.name.toUpperCase()}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-muted uppercase tracking-[0.15em]">Justification Metadata</label>
                                <textarea 
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="ENTER STRATEGIC JUSTIFICATION..."
                                    rows={3}
                                    className="w-full bg-surface-elevated border border-border rounded px-4 py-2.5 text-[12px] font-bold text-primary focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none placeholder:text-muted/30"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-surface-elevated/50 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setIsTransferModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-[11px] font-black text-muted hover:text-primary transition-colors uppercase tracking-widest"
                            >
                                Abort
                            </button>
                            <button 
                                onClick={handleTransferSubmit}
                                disabled={!targetTeam || isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-accent text-white rounded text-[11px] font-black hover:bg-accent-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
                            >
                                {isSubmitting ? 'PROCESSING...' : 'EXECUTE PLEA'}
                                {!isSubmitting && <Check size={14} strokeWidth={3} />}
                            </button>
                        </div>
                        <div className="h-1 w-full bg-accent/20">
                            <div className={`h-full bg-accent transition-all duration-1000 ${isSubmitting ? 'w-full animate-pulse' : 'w-0'}`}></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUBCOMPONENTS ---

function LookupSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-surface rounded-md border border-border"></div>
            <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-surface rounded-md border border-border"></div>)}
            </div>
            <div className="grid grid-cols-12 gap-5">
                <div className="col-span-8 h-[220px] bg-surface rounded-md border border-border"></div>
                <div className="col-span-4 h-[220px] bg-surface rounded-md border border-border"></div>
            </div>
        </div>
    );
}
