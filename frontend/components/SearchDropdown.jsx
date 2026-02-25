'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Briefcase, FileText, ArrowRight } from 'lucide-react';
import api from '../services/api';

const TYPE_ICONS = {
    lead: User,
    client: Briefcase,
    invoice: FileText,
};

const TYPE_COLORS = {
    lead: 'bg-blue-500/10 text-blue-600',
    client: 'bg-emerald-500/10 text-emerald-600',
    invoice: 'bg-amber-500/10 text-amber-600',
};

export default function SearchDropdown() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const router = useRouter();
    const debounceRef = useRef(null);

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setOpen(false);
            return;
        }

        // Debounce 300ms
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get('/search', { params: { q: query } });
                setResults(res.data.results || []);
                setOpen(true);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSelect = (result) => {
        setOpen(false);
        setQuery('');
        router.push(result.url);
    };

    return (
        <div className="flex-1 max-w-md relative" ref={dropdownRef}>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search leads, clients, invoices..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-surface-elevated border border-transparent rounded-md focus:border-border focus:outline-none transition-colors"
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Results dropdown */}
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {results.map((r, i) => {
                        const Icon = TYPE_ICONS[r.type] || FileText;
                        const color = TYPE_COLORS[r.type] || 'bg-gray-100 text-gray-600';
                        return (
                            <button
                                key={`${r.type}-${r.id}-${i}`}
                                onClick={() => handleSelect(r)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors text-left border-b border-border/50 last:border-0"
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                                    <Icon size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-primary truncate">{r.title}</p>
                                    <p className="text-xs text-muted truncate">{r.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted bg-surface-elevated px-2 py-0.5 rounded">
                                        {r.type}
                                    </span>
                                    <ArrowRight size={14} className="text-muted" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* No results */}
            {open && query.length >= 2 && results.length === 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 p-6 text-center">
                    <p className="text-sm text-muted">No results found for "{query}"</p>
                </div>
            )}
        </div>
    );
}
