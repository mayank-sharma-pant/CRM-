'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    BrainCircuit,
    Send,
    Sparkles,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Receipt,
    ShoppingCart,
    Activity,
    ChevronRight
} from 'lucide-react';

export default function PurchaseAIAssistantPage() {
    const router = useRouter();
    const [messages, setMessages] = useState([
        { id: 1, role: 'system', content: 'Hello! I am your Purchase Advisory Assistant. I can help you analyze invoices, review sales patterns, and identify financial risks. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');

    // Mock insights data
    const insights = [
        {
            id: 1,
            tag: 'INVOICE',
            title: 'Overdue invoices trending up',
            summary: 'Overdue amount increased 22% this period. Three accounts represent 65% of overdue balance.',
            evidence: ['Overdue: +22%', 'Accounts: 3'],
            trend: 'up',
            severity: 'high',
            link: '/purchase/invoices'
        },
        {
            id: 2,
            tag: 'SALES',
            title: 'High discount approvals detected',
            summary: 'Average discount rate across pending approvals is 8.5%, above the 5% threshold.',
            evidence: ['Avg Disc: 8.5%', 'Threshold: 5%'],
            trend: 'up',
            severity: 'medium',
            link: '/purchase/sales'
        },
        {
            id: 3,
            tag: 'FINANCE',
            title: 'Payment collection improving',
            summary: 'Collection rate improved from 78% to 85% this month. DSO reduced by 3 days.',
            evidence: ['Collection: 85%', 'DSO: -3 days'],
            trend: 'up',
            severity: 'low',
            link: '/purchase/invoices'
        },
        {
            id: 4,
            tag: 'RISK',
            title: 'Pending approvals backlog',
            summary: '18 sales pending review for more than 48 hours. Review velocity needs attention.',
            evidence: ['Pending: 18', 'Avg Wait: 52h'],
            trend: 'neutral',
            severity: 'medium',
            link: '/purchase/sales'
        },
        {
            id: 5,
            tag: 'MONITOR',
            title: 'Two high-severity alerts active',
            summary: 'Invoice collection delay and high discount rate alerts require attention.',
            evidence: ['Alerts: 2 High'],
            trend: 'neutral',
            severity: 'high',
            link: '/purchase/monitoring'
        }
    ];

    const suggestedPrompts = [
        'Show overdue invoices summary',
        'Analyze sales pending approval',
        'Identify payment risks',
        'Review discount patterns'
    ];

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = { id: Date.now(), role: 'user', content: input };
        const aiResponse = {
            id: Date.now() + 1,
            role: 'system',
            content: 'This is a placeholder response. Backend AI integration required to provide real analysis of your purchase and invoice data.'
        };

        setMessages([...messages, userMessage, aiResponse]);
        setInput('');
    };

    const handlePromptClick = (prompt) => {
        setInput(prompt);
    };

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                    <BrainCircuit className="text-emerald-500" size={28} />
                    AI Assistant
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Advisory support for purchase and invoice operations.</p>
            </div>

            {/* Top Insights */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-500" />
                        Top Insights
                    </h3>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">Read-only Advisory</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insights.slice(0, 5).map((insight) => (
                        <div
                            key={insight.id}
                            onClick={() => router.push(insight.link)}
                            className="group p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer transition-all"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${insight.tag === 'INVOICE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    insight.tag === 'SALES' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        insight.tag === 'FINANCE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            insight.tag === 'RISK' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                    {insight.tag}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${insight.severity === 'high' ? 'bg-red-500' : insight.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            </div>
                            <h4 className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-emerald-600 transition-colors">{insight.title}</h4>
                            <p className="text-[12px] text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{insight.summary}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {insight.evidence.map((ev, i) => (
                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300">{ev}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => router.push('/purchase/sales')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors group"
                >
                    <ShoppingCart size={20} className="text-slate-400 group-hover:text-emerald-500" />
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600">Sales Review</span>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                </button>
                <button
                    onClick={() => router.push('/purchase/invoices')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors group"
                >
                    <Receipt size={20} className="text-slate-400 group-hover:text-emerald-500" />
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600">Invoices</span>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                </button>
                <button
                    onClick={() => router.push('/purchase/monitoring')}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors group"
                >
                    <Activity size={20} className="text-slate-400 group-hover:text-emerald-500" />
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600">Monitoring</span>
                    <ChevronRight size={16} className="ml-auto text-slate-300 group-hover:text-emerald-500" />
                </button>
            </div>

            {/* Chat Container */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden" style={{ height: '400px' }}>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-3 rounded-xl ${msg.role === 'user'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                }`}>
                                <p className="text-[14px]">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Suggested Prompts */}
                {messages.length <= 2 && (
                    <div className="px-5 pb-3">
                        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2 flex items-center gap-1">
                            <Sparkles size={12} />
                            Suggested
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {suggestedPrompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handlePromptClick(prompt)}
                                    className="px-3 py-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask about invoices, sales, or financial risks..."
                            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg text-[14px] text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                        />
                        <button
                            onClick={handleSend}
                            className="px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
