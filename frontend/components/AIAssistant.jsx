'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
    Sparkles,
    X,
    Send,
    MessageSquare,
    Shield
} from 'lucide-react';

const SUGGESTIONS = {
    dashboard: [
        "Analyze daily performance",
        "Summarize urgent tasks",
        "Review team activity"
    ],
    lead_detail: [
        "Draft outreach email",
        "Suggest next step",
        "Analyze engagement risk"
    ],
    leads: [
        "Identify stalled leads",
        "Prioritize follow-ups",
        "Show conversion tips"
    ],
    clients: [
        "Retention check",
        "Upsell opportunities",
        "Draft review agenda"
    ],
    performance: [
        "Analyze trend gaps",
        "Compare with peers",
        "Suggest improvements"
    ],
    default: [
        "What can you do?",
        "Explain CRM policies",
        "Search for help"
    ]
};

// --- AI ASSISTANT CONFIGURATION ---
// Internal mock logic has been removed to prepare for real-time API integration.
const DEFAULT_AI_MESSAGE = "I'm your advisory assistant. Adaptive insights are being connected to the new backend telemetry. How can I help you today?";

export default function AIAssistant() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: DEFAULT_AI_MESSAGE }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // --- CONTEXT DETECTION ---
    const getContext = () => {
        if (pathname === '/dashboard') return { label: 'Dashboard Context', key: 'dashboard' };
        if (pathname.startsWith('/leads/') && pathname.length > 7) return { label: 'Lead Context', key: 'lead_detail' };
        if (pathname === '/leads') return { label: 'Leads List', key: 'leads' };
        if (pathname.startsWith('/clients/') && pathname.length > 9) return { label: 'Client Context', key: 'clients' };
        if (pathname === '/clients') return { label: 'Clients List', key: 'clients' };
        if (pathname === '/performance') return { label: 'Performance Summary', key: 'performance' };
        return { label: 'System Context', key: 'default' };
    };

    const context = getContext();

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    // Handle Send
    const handleSend = async (text = input) => {
        if (!text.trim()) return;

        // Add User Message
        const userMsg = { role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Placeholder for future AI integration
        setTimeout(() => {
            const responseText = "I'm currently in read-only analysis mode. Live chat functionality is scheduled for the next deployment phase. Please refer to your dashboard for real-time metrics.";
            setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
            setIsTyping(false);
        }, 1000);
    };

    return (
        <>
            {/* --- FLOATING TRIGGER --- */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 flex items-center gap-2 group"
                    aria-label="Open AI Assistant"
                >
                    <Sparkles size={24} className="animate-pulse" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-medium text-sm">
                        AI Assistant
                    </span>
                </button>
            )}

            {/* --- SIDE PANEL OVERLAY --- */}
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-surface border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">

                    {/* Header: Precise & Tool-like */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated/30">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-surface text-accent rounded-md border border-border shadow-sm">
                                <MessageSquare size={16} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-[14px] font-bold text-primary tracking-tight">AI Advisory Engine</h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider">
                                        {context.label || 'System Wide'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 text-muted hover:text-primary hover:bg-surface-elevated rounded-md transition-colors"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Chat Area: Information Dense */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-page/20">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`
                                    w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-muted text-[10px] font-bold uppercase
                                `}>
                                    {msg.role === 'assistant' ? 'AI' : 'Me'}
                                </div>
                                <div className={`
                                    max-w-[85%] rounded px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm border
                                    ${msg.role === 'assistant'
                                        ? 'bg-surface text-secondary border-border'
                                        : 'bg-accent text-white border-accent'}
                                `}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center flex-shrink-0 mt-0.5 text-muted text-[10px] font-bold uppercase">
                                    AI
                                </div>
                                <div className="bg-surface border border-border rounded px-4 py-2 flex gap-1 items-center">
                                    <span className="w-1 h-1 bg-muted rounded-full animate-bounce"></span>
                                    <span className="w-1 h-1 bg-muted rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1 h-1 bg-muted rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions & Input */}
                    <div className="p-4 bg-surface border-t border-border">
                        {/* Chip Suggestions: Dense */}
                        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
                            {(SUGGESTIONS[context.key] || SUGGESTIONS.default).map((sugg, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(sugg)}
                                    className="whitespace-nowrap px-2.5 py-1 bg-surface-elevated border border-border text-muted hover:text-accent hover:border-accent text-[11px] font-bold uppercase tracking-tight rounded transition-all"
                                >
                                    {sugg}
                                </button>
                            ))}
                        </div>

                        {/* Precise Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Query advisory engine..."
                                className="w-full pl-4 pr-12 py-2.5 bg-surface-elevated border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all text-primary placeholder:text-muted"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className="absolute right-1.5 top-1.5 p-1.5 text-muted hover:text-accent disabled:opacity-30 transition-colors"
                            >
                                <Send size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-widest opacity-60">
                            <Shield size={10} />
                            <span>Read-Only Advisory Mode</span>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
