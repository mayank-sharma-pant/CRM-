'use client';

import { useState, useEffect } from 'react';
import { MOCK_DATA } from '../../../services/mockData';
import { BrainCircuit, Send, Sparkles } from 'lucide-react';

export default function MDAIAssistantPage() {
    const [data, setData] = useState(null);
    const [input, setInput] = useState('');

    useEffect(() => {
        setTimeout(() => {
            setData(MOCK_DATA['/md/ai-assistant']);
        }, 500);
    }, []);

    if (!data) return <div className="p-12 text-center">Initializing Strategy Assistant...</div>;

    return (
        <div className="mx-auto max-w-[1000px] p-8 h-[calc(100vh-64px)] flex flex-col">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <BrainCircuit size={32} />
                </div>
                <div>
                    <h1 className="text-[24px] font-bold text-slate-900 dark:text-white">Strategy Assistant</h1>
                    <p className="text-slate-500">Executive advisory and data interpretation.</p>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {data.messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                                    : 'bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                                }`}>
                                <p className="text-[15px] leading-relaxed">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        {data.suggestedPrompts.map((prompt, i) => (
                            <button key={i} className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                                <Sparkles size={14} className="text-indigo-500" />
                                {prompt}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about revenue trends, risks, or team performance..."
                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <button className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
