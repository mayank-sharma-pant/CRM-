'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_DATA } from '../../../services/mockData';
import {
    BrainCircuit,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    ExternalLink,
    RefreshCw,
    Calendar,
    Minus,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Send,
    Info
} from 'lucide-react';

export default function MDAIAssistantPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA['/md/ai-assistant']);
            setLoading(false);
        }, 400);
    }, []);

    // Handle chat submission
    const handleChatSubmit = (question) => {
        if (!question.trim()) return;

        const q = question.trim();
        setChatInput('');

        // Simulate AI response based on question
        let response = { text: '', evidence: [] };

        if (q.toLowerCase().includes('revenue')) {
            response = {
                text: 'Revenue growth decelerated from +12% to +4% week-over-week. This appears collection-driven rather than demand-related, as sales volume remained stable.',
                evidence: ['Revenue: +4% WoW', 'Prior: +12%', 'Sales: Stable']
            };
        } else if (q.toLowerCase().includes('risk') || q.toLowerCase().includes('alert')) {
            response = {
                text: 'Two primary risks: (1) Cash flow gap from 22% increase in overdue invoices, concentrated in 3 accounts. (2) Pipeline concentration in Sales Alpha team at 42%.',
                evidence: ['Overdue: +22%', 'Accounts: 3', 'Conc: 42%']
            };
        } else if (q.toLowerCase().includes('conversion')) {
            response = {
                text: 'Conversion rate is stable at 22%, despite 18% increase in lead volume. This indicates the sales team is absorbing the growth without quality degradation.',
                evidence: ['Conv: 22%', 'Leads: +18%']
            };
        } else if (q.toLowerCase().includes('summarize') || q.toLowerCase().includes('summary')) {
            response = {
                text: 'Key situation: Revenue growth slowing due to collection delays, not demand issues. Sales performance healthy. Watch overdue invoices and pipeline concentration.',
                evidence: ['Revenue: +4%', 'Overdue: +22%', 'Conv: 22%']
            };
        } else if (q.toLowerCase().includes('assign') || q.toLowerCase().includes('approve') || q.toLowerCase().includes('contact') || q.toLowerCase().includes('task')) {
            response = {
                text: 'This is a read-only advisory interface. Action requests (assign, approve, contact, task) cannot be processed here. Please use the appropriate operational module.',
                evidence: ['Read-only']
            };
        } else {
            response = {
                text: 'Based on current data: Revenue at +4% WoW, conversion stable at 22%, overdue invoices up 22%. For detailed analysis, please specify: revenue, risks, conversion, or request a summary.',
                evidence: ['Revenue: +4%', 'Conv: 22%', 'Overdue: +22%']
            };
        }

        setChatHistory([...chatHistory, { type: 'question', text: q }, { type: 'answer', ...response }]);
    };

    const quickPrompts = [
        'Why did revenue change this period?',
        'What are top risks today?',
        'Summarize alerts in one paragraph',
        'Is conversion improving or declining?'
    ];

    if (loading) return <AISkeleton />;

    if (!data) return (
        <div className="flex items-center justify-center h-[60vh]">
            <p className="text-[15px] text-slate-500 dark:text-slate-400">No significant signals detected in this period.</p>
        </div>
    );

    // Executive brief items - prioritized order
    const briefItems = [
        {
            priority: 1,
            headline: 'Cash flow gap emerging',
            meaning: 'Overdue invoices up 22% this period. Three accounts drive 65% of outstanding balance.',
            evidenceChips: ['Overdue: +$8k', 'Accounts: 3'],
            nextCheck: { label: 'Open Invoices', href: '/md/invoices' }
        },
        {
            priority: 2,
            headline: 'Sales momentum holding',
            meaning: 'Conversion rate stable at 22% despite 18% increase in lead volume. Team is absorbing growth.',
            evidenceChips: ['Conv: 22%', 'Leads: +18%'],
            nextCheck: { label: 'Open Revenue', href: '/md/revenue' }
        },
        {
            priority: 3,
            headline: 'Revenue growth decelerating',
            meaning: 'Weekly revenue growth dropped from +12% to +4%. Appears collection-driven, not demand.',
            evidenceChips: ['Growth: +4%', 'Prior: +12%'],
            nextCheck: { label: 'Open Revenue', href: '/md/revenue' }
        },
        {
            priority: 4,
            headline: 'Pipeline concentration risk',
            meaning: 'Sales Alpha now 42% of total pipeline, up from 35%. Team dependency increasing.',
            evidenceChips: ['Conc: 42%', 'Δ: +7pp'],
            nextCheck: { label: 'Open Dashboard', href: '/md/dashboard' }
        },
        {
            priority: 5,
            headline: 'Early signal: Client engagement dip',
            meaning: 'Two key accounts showing reduced activity. Watch for escalation in next period.',
            evidenceChips: ['Accounts: 2', 'Early'],
            nextCheck: { label: 'Open Monitoring', href: '/md/monitoring' }
        }
    ];

    // Narrative bullets
    const narrativeBullets = [
        { headline: 'Revenue dip is collections-driven', text: 'Sales volume stable; the issue is invoice settlement timing, not pipeline health.', evidenceChips: ['Revenue: -6%', 'Sales: Stable'] },
        { headline: 'Conversion stable despite lead spike', text: 'Team is handling increased volume without quality degradation.', evidenceChips: ['Conv: 22%', 'Leads: +18%'] },
        { headline: 'Pipeline concentration risk increasing', text: 'Over-reliance on Sales Alpha may create vulnerability if team performance dips.', evidenceChips: ['Conc: 42%'] }
    ];

    // Key changes data
    const kpiSnapshot = [
        { metric: 'Total Revenue', previous: '$842k', current: '$876k', deltaPct: '+4%', trend: 'up', link: '/md/revenue' },
        { metric: 'Sales Count', previous: '42', current: '45', deltaPct: '+7%', trend: 'up', link: '/md/sales' },
        { metric: 'Conversion Rate', previous: '21%', current: '22%', deltaPct: '+1pp', trend: 'up', link: '/md/leads' },
        { metric: 'Overdue Invoices', previous: '$37k', current: '$45k', deltaPct: '+22%', trend: 'up', link: '/md/invoices' },
        { metric: 'Active Alerts', previous: '10', current: '12', deltaPct: '+2', trend: 'up', link: '/md/monitoring' },
        { metric: 'Lead Inflow', previous: '185', current: '218', deltaPct: '+18%', trend: 'up', link: '/md/leads' }
    ];

    return (
        <div className="mx-auto max-w-[1360px] space-y-5 pb-12 font-sans text-slate-900 dark:text-slate-100 p-8">

            {/* ============================================================ */}
            {/* HEADER */}
            {/* ============================================================ */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                        <BrainCircuit size={28} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">AI Assistant</h1>
                        <p className="text-[14px] text-slate-500 dark:text-slate-400 font-medium">Executive briefing and business interpretation (read-only).</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <Calendar size={15} className="text-slate-400" />
                        <span>Last 7 Days</span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 1: EXECUTIVE BRIEF */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white">Executive Brief</h2>
                        <p className="text-[13px] text-slate-400 mt-0.5">AI interpretation of current business situation.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wide rounded">Read-only advisory</span>
                </div>

                <div className="space-y-5">
                    {briefItems.map((item, i) => (
                        <div key={i} className="pb-5 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0">
                            <div className="flex items-start justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400">{item.priority}</span>
                                        <h3 className="text-[17px] font-semibold text-slate-800 dark:text-white">{item.headline}</h3>
                                    </div>
                                    <p className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3 ml-7">{item.meaning}</p>
                                    <div className="flex items-center gap-4 ml-7">
                                        <div className="flex gap-2">
                                            {item.evidenceChips.map((ev, j) => (
                                                <span key={j} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[12px] font-semibold rounded">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push(item.nextCheck.href)}
                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                    {item.nextCheck.label}
                                    <ArrowRight size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => router.push('/md/monitoring')}
                        className="flex items-center gap-2 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        <ExternalLink size={14} />
                        Open Monitoring Center
                    </button>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 2: WHAT THIS MEANS */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white mb-5">What this means</h2>
                <div className="space-y-4">
                    {narrativeBullets.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 shrink-0"></div>
                            <div>
                                <h4 className="text-[16px] font-semibold text-slate-800 dark:text-white mb-0.5">{item.headline}</h4>
                                <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-2">{item.text}</p>
                                <div className="flex gap-2">
                                    {item.evidenceChips.map((ev, j) => (
                                        <span key={j} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[11px] font-semibold rounded">
                                            {ev}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTION 3: KEY CHANGES */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white mb-4">Key Changes <span className="text-[13px] font-normal text-slate-400">(vs previous period)</span></h2>
                <div className="overflow-hidden">
                    <table className="w-full text-left">
                        <tbody>
                            {kpiSnapshot.map((row, i) => (
                                <tr key={i} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => router.push(row.link)}>
                                    <td className="py-3 text-[14px] font-medium text-slate-700 dark:text-slate-200 w-[200px]">{row.metric}</td>
                                    <td className="py-3 text-[14px] text-slate-400 font-mono text-center w-[80px]">{row.previous}</td>
                                    <td className="py-3 text-center w-[40px]">
                                        <ArrowRight size={14} className="text-slate-300 inline" />
                                    </td>
                                    <td className="py-3 text-[14px] text-slate-700 dark:text-slate-200 font-mono font-semibold text-center w-[80px]">{row.current}</td>
                                    <td className="py-3 text-right w-[120px]">
                                        <div className="inline-flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${row.deltaPct.startsWith('+') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    row.deltaPct.startsWith('-') ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {row.deltaPct}
                                            </span>
                                            {row.trend === 'up' && <TrendingUp size={14} className="text-emerald-500" />}
                                            {row.trend === 'down' && <TrendingDown size={14} className="text-red-500" />}
                                            {row.trend === 'flat' && <Minus size={14} className="text-slate-400" />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ============================================================ */}
            {/* OPTIONAL: ASK AI (Collapsible) */}
            {/* ============================================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <MessageSquare size={18} className="text-slate-400" />
                        <span className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">Ask AI</span>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase rounded">Read-only</span>
                    </div>
                    {chatOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {chatOpen && (
                    <div className="border-t border-slate-100 dark:border-slate-700 p-5" style={{ animation: 'fadeIn 150ms ease-out' }}>
                        {/* Info Banner */}
                        <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg mb-4">
                            <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <p className="text-[12px] text-slate-500 dark:text-slate-400">This is a read-only advisory interface. Responses are based on current metrics and monitoring data. No actions can be performed.</p>
                        </div>

                        {/* Quick Prompts */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {quickPrompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleChatSubmit(prompt)}
                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[12px] font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>

                        {/* Chat History (Q/A Transcript Style) */}
                        {chatHistory.length > 0 && (
                            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                                {chatHistory.map((item, i) => (
                                    <div key={i} className={`${item.type === 'question' ? 'pl-4 border-l-2 border-indigo-300' : 'pl-4 border-l-2 border-slate-200 dark:border-slate-600'}`}>
                                        <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">{item.type === 'question' ? 'Question' : 'AI Response'}</div>
                                        <p className={`text-[14px] ${item.type === 'question' ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-600 dark:text-slate-300'}`}>{item.text}</p>
                                        {item.evidence && (
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {item.evidence.map((ev, j) => (
                                                    <span key={j} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold rounded">
                                                        {ev}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(chatInput)}
                                placeholder="Ask about revenue, risks, conversion..."
                                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            <button
                                onClick={() => handleChatSubmit(chatInput)}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

// --- SKELETON ---

function AISkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] p-8 space-y-5 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="space-y-2">
                    <div className="h-7 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
            </div>
            <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-[420px]"></div>
            <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-[180px]"></div>
            <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-[220px]"></div>
            <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-[60px]"></div>
        </div>
    );
}
