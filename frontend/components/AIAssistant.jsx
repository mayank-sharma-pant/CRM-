'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
    Sparkles,
    X,
    Send,
    Bot,
    User,
    AlertCircle,
    MessageSquare
} from 'lucide-react';

// --- MOCK RESPONSES ---
const MOCK_RESPONSES = {
    default: "I can help summarize this page or suggest next steps. Try asking 'What should I focus on?'",
    dashboard: "Based on your dashboard, you have 3 critical tasks overdue and lead conversion is up 5% this week. I recommend clearing the overdue tasks first.",
    leads: "This list contains 5 active leads. 'Sarah Miller' has the highest engagement score. You might want to follow up with her.",
    lead_detail: "This lead, Sarah, is interested in SSO features. Key action: Send the technical requirements doc. Last interaction was 2 days ago.",
    clients: "You have 5 active clients. Robert Taylor's account is stable, but hasn't had a check-in for 2 months.",
    performance: "Your conversion rate is solid at 14.5%, but task completion is lagging slightly behind schedule."
};

const SUGGESTIONS = {
    default: ["What needs attention?", "Explain this page"],
    dashboard: [" summarize my day", "Priority tasks?"],
    leads: ["Who is most promising?", "Draft intro email"],
    clients: ["Draft follow-up", "Review account health"],
};

export default function AIAssistant() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hello. I'm your advisory assistant. How can I help you with your sales workflow today?" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // --- CONTEXT DETECTION ---
    const getContext = () => {
        if (pathname === '/dashboard') return { label: 'Dashboard Context', key: 'dashboard' };
        if (pathname.startsWith('/leads/') && pathname.length > 7) return { label: 'Lead Context', key: 'lead_detail' };
        if (pathname === '/leads') return { label: 'Leads List', key: 'leads' };
        if (pathname.startsWith('/clients/') && pathname.length > 9) return { label: 'Client Context', key: 'clients' }; // Using generic client response for now
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

        // Simulate AI Delay
        setTimeout(() => {
            const responseText = MOCK_RESPONSES[context.key] || MOCK_RESPONSES.default;
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
                className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex flex-col h-full">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">AI Assistant</h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {context.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-[#0B1120]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1
                      ${msg.role === 'assistant' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}
                   `}>
                                    {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                                </div>
                                <div className={`
                      max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                      ${msg.role === 'assistant'
                                        ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700'
                                        : 'bg-indigo-600 text-white'}
                   `}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
                                    <Bot size={16} />
                                </div>
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl px-4 py-3 flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions & Input */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">

                        {/* Disclaimer */}
                        <div className="flex items-center justify-center gap-1.5 mb-4 text-[10px] text-slate-400 uppercase tracking-wide">
                            <AlertCircle size={10} />
                            <span>AI suggestions do not modify system data</span>
                        </div>

                        {/* Chip Suggestions */}
                        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                            {(SUGGESTIONS[context.key] || SUGGESTIONS.default).map((sugg, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(sugg)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700 transition-colors"
                                >
                                    {sugg}
                                </button>
                            ))}
                        </div>

                        {/* Input Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Ask for advice..."
                                className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim()}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
