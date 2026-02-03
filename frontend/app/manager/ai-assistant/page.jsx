'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    Info,
    Shield
} from 'lucide-react';

export default function ManagerAIAssistantPage() {
    const router = useRouter();
    const [data, setData] = useState({
        messages: [],
        suggestedPrompts: [
            'How is my team performing this week?',
            'Who are the at-risk leads?',
            'Are any team members overloaded?',
            'Summarize team activity'
        ]
    });
    const [loading, setLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        // Local initialization
        setLoading(false);
    }, []);

    // Handle chat submission
    const handleChatSubmit = (question) => {
        if (!question.trim()) return;

        const q = question.trim();
        setChatInput('');

        // Simulate AI response based on question (Manager Scoped)
        let response = { text: '', evidence: [] };

        if (q.toLowerCase().includes('team') || q.toLowerCase().includes('performing')) {
            response = {
                text: 'Team output is stable. Lead conversion is at 18% (target 20%). 2 members are below activity targets for calls/meetings.',
                evidence: ['Conv: 18%', 'Activity: -10%']
            };
        } else if (q.toLowerCase().includes('risk') || q.toLowerCase().includes('lead')) {
            response = {
                text: '3 high-value leads in "Negotiation" stage have stalled for >5 days. Recommended action: Follow up with owners.',
                evidence: ['Stalled: 3', 'Value: High']
            };
        } else if (q.toLowerCase().includes('overloaded') || q.toLowerCase().includes('load')) {
            response = {
                text: 'Workload distribution is uneven. Member A has 45 active tasks, while Team Average is 28. Consider reassigning.',
                evidence: ['Max: 45', 'Avg: 28']
            };
        } else if (q.toLowerCase().includes('summarize')) {
            response = {
                text: 'Team is active but conversion is slightly below target. 3 key deals are stalled. Workload balancing is required to prevent burnout for top performers.',
                evidence: ['Conv: 18%', 'Stalled: 3']
            };
        } else {
            response = {
                text: 'I can analyze team performance, lead risks, and workload distribution. Please ask about: team status, at-risk leads, or workload.',
                evidence: ['Scope: Team']
            };
        }

        setChatHistory([...chatHistory, { type: 'question', text: q }, { type: 'answer', ...response }]);
    };

    const quickPrompts = [
        'How is my team performing?',
        'Who are the at-risk leads?',
        'Are any team members overloaded?',
        'Summarize team activity'
    ];

    if (loading) return <AISkeleton />;

    // Manager Brief Items
    const briefItems = [
        {
            priority: 1,
            headline: 'Uneven Workload Distribution',
            meaning: 'One team member has 60% more active tasks than the average. Risk of burnout or dropped leads.',
            evidenceChips: ['Variance: +60%', 'Member: Alex'],
            nextCheck: { label: 'View Tasks', href: '/manager/tasks' }
        },
        {
            priority: 2,
            headline: '3 Key Deals Stalled',
            meaning: 'High-value leads in "Negotiation" have had no activity for 5+ days.',
            evidenceChips: ['Stalled: 3', 'Days: >5'],
            nextCheck: { label: 'View Leads', href: '/manager/leads' }
        },
        {
            priority: 3,
            headline: 'Conversion Rate Gap',
            meaning: 'Team conversion is tracking at 18%, just below the 20% weekly target.',
            evidenceChips: ['Current: 18%', 'Target: 20%'],
            nextCheck: { label: 'View Reports', href: '/manager/reports' }
        }
    ];

    // Key changes data (Team Scope)
    const kpiSnapshot = [
        { metric: 'Team Revenue', previous: '$120k', current: '$125k', deltaPct: '+4%', trend: 'up', link: '/manager/reports' },
        { metric: 'Active Leads', previous: '45', current: '52', deltaPct: '+15%', trend: 'up', link: '/manager/leads' },
        { metric: 'Avg Conversion', previous: '19%', current: '18%', deltaPct: '-1pp', trend: 'down', link: '/manager/reports' },
        { metric: 'Tasks Completed', previous: '120', current: '135', deltaPct: '+12%', trend: 'up', link: '/manager/tasks' }
    ];

    return (
        <div className="min-h-screen bg-page pb-10">
            {/* Header - Precise & Integrated */}
            <div className="bg-surface border-b border-border px-6 py-4 mb-6 transition-all">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-primary tracking-tight">AI Insights Engine</h1>
                        <p className="text-[13px] text-muted font-medium mt-0.5 opacity-80">Autonomous operational analysis for team efficiency.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-surface-elevated border border-border text-muted text-[11px] font-bold uppercase tracking-wider rounded">
                            LogicAI Alpha
                        </span>
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 space-y-6">
                {/* SECTION 1: TEAM BRIEF - High Density List */}
                <div className="bg-surface dark:bg-slate-900 rounded border border-border shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-border bg-surface-elevated/30 flex items-center justify-between">
                        <div>
                            <h2 className="text-[15px] font-bold text-primary">Priority Team Signals</h2>
                            <p className="text-[11px] text-muted font-bold uppercase tracking-wide opacity-70 mt-0.5">Automated Analysis</p>
                        </div>
                        <RefreshCw size={14} className="text-muted hover:text-accent cursor-pointer transition-colors" />
                    </div>

                    <div className="divide-y divide-border/50">
                        {briefItems.map((item, i) => (
                            <div key={i} className="px-5 py-4 hover:bg-surface-elevated/20 transition-colors group">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2.5 mb-1.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.priority === 1 ? 'bg-error/10 text-error border border-error/20' : 'bg-surface-elevated text-muted border border-border'
                                                }`}>
                                                Signal {item.priority}
                                            </span>
                                            <h3 className="text-[14px] font-bold text-primary group-hover:text-accent transition-colors">{item.headline}</h3>
                                        </div>
                                        <p className="text-[13px] text-secondary leading-relaxed mb-3 font-medium">{item.meaning}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.evidenceChips.map((ev, j) => (
                                                <span key={j} className="px-2 py-0.5 bg-surface-elevated text-muted text-[11px] font-bold rounded border border-border tabular-nums">
                                                    {ev}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => router.push(item.nextCheck.href)}
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-secondary text-[11px] font-bold rounded hover:bg-surface-elevated transition-colors shadow-sm uppercase tracking-tight"
                                    >
                                        Inspect {item.nextCheck.label.split(' ')[1]}
                                        <ArrowRight size={12} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 2: METRICS SNAPSHOT - High Density Grid Table */}
                <div className="bg-surface dark:bg-slate-900 rounded border border-border shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-border bg-surface-elevated/30">
                        <h2 className="text-[15px] font-bold text-primary">Differential Performance</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="bg-surface-elevated/10">
                                <tr>
                                    <th className="px-5 py-2 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-border">Metric</th>
                                    <th className="px-5 py-2 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-border text-center">Previous</th>
                                    <th className="px-5 py-2 text-center border-b border-border"></th>
                                    <th className="px-5 py-2 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-border text-center">Current</th>
                                    <th className="px-5 py-2 text-[11px] font-bold text-muted uppercase tracking-widest border-b border-border text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {kpiSnapshot.map((row, i) => (
                                    <tr key={i} className="hover:bg-surface-elevated/20 cursor-pointer transition-colors group" onClick={() => router.push(row.link)}>
                                        <td className="px-5 py-2.5 text-[13px] font-bold text-secondary">{row.metric}</td>
                                        <td className="px-5 py-2.5 text-[13px] text-muted font-medium tabular-nums text-center">{row.previous}</td>
                                        <td className="px-2 py-2.5 text-center">
                                            <ArrowRight size={12} className="text-border-strong opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </td>
                                        <td className="px-5 py-2.5 text-[13px] text-primary font-bold tabular-nums text-center">{row.current}</td>
                                        <td className="px-5 py-2.5 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${row.deltaPct.startsWith('+') ? 'bg-success/10 text-success' :
                                                    row.deltaPct.startsWith('-') ? 'bg-error/10 text-error' :
                                                        'bg-surface-elevated text-muted'
                                                    }`}>
                                                    {row.deltaPct}
                                                </span>
                                                {row.trend === 'up' && <TrendingUp size={14} className="text-success" />}
                                                {row.trend === 'down' && <TrendingDown size={14} className="text-error" />}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SECTION 3: CHAT INTERFACE - Precise Tool Style */}
                <div className="bg-surface dark:bg-slate-900 rounded border border-border shadow-md overflow-hidden flex flex-col h-[500px]">
                    <div className="px-5 py-2 border-b border-border bg-surface-elevated/30 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-accent">
                            <MessageSquare size={14} strokeWidth={2.5} />
                            <span className="text-[12px] font-bold uppercase tracking-tight">Interactive Analyzer</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield size={12} className="text-muted" />
                            <span className="text-[10px] text-muted font-bold uppercase">Team Scoped Environment</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-page/30">
                        {chatHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-10">
                                <div className="p-3 bg-surface-elevated rounded-full mb-3 border border-border">
                                    <BrainCircuit size={20} className="text-muted" />
                                </div>
                                <h3 className="text-primary font-bold text-sm">Analyze Team Output</h3>
                                <p className="text-muted text-[13px] mt-1 font-medium max-w-xs">
                                    Ask LogicAI about team performance, lead distribution, or weekly trajectory.
                                </p>
                            </div>
                        ) : (
                            chatHistory.map((item, i) => (
                                <div key={i} className={`flex ${item.type === 'question' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3.5 rounded-lg shadow-sm border ${item.type === 'question'
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-surface text-secondary border-border'
                                        }`}>
                                        <p className="text-[13px] font-medium leading-relaxed">{item.text}</p>
                                        {item.evidence && (
                                            <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/10 dark:border-border/50">
                                                {item.evidence.map((ev, j) => (
                                                    <span key={j} className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded tabular-nums ${item.type === 'question' ? 'bg-white/20 text-white' : 'bg-surface-elevated text-muted'
                                                        }`}>
                                                        {ev}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-border bg-surface shrink-0">
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {quickPrompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleChatSubmit(prompt)}
                                    className="px-2.5 py-1 bg-surface-elevated border border-border text-muted text-[11px] font-bold rounded hover:border-accent hover:text-accent transition-all uppercase tracking-tight"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(chatInput)}
                                placeholder="Query team performance models..."
                                className="w-full pl-4 pr-12 py-2.5 bg-surface-elevated border border-border rounded text-[13px] text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
                            />
                            <button
                                onClick={() => handleChatSubmit(chatInput)}
                                className="absolute right-1.5 top-1.5 p-1.5 text-muted hover:text-accent transition-colors"
                            >
                                <Send size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AISkeleton() {
    return (
        <div className="min-h-screen bg-page p-6 space-y-6 animate-pulse">
            <div className="h-12 w-1/4 bg-surface-elevated rounded border border-border"></div>
            <div className="bg-surface rounded border border-border h-[250px]"></div>
            <div className="bg-surface rounded border border-border h-[400px]"></div>
        </div>
    );
}
