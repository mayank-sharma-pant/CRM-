'use client';

import {
    Search,
    Plus,
    Filter,
    Download,
    MoreHorizontal
} from 'lucide-react';

export default function LedgerActionBar({
    onSearch,
    onAddRow,
    canEdit = false,
    title,
    subtitle,
    actions = []
}) {
    return (
        <div className="space-y-4 mb-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={action.onClick}
                            className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}

                    <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <Download size={20} />
                    </button>

                    {canEdit && (
                        <button
                            onClick={onAddRow}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                            <Plus size={16} />
                            Add Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search entries..."
                        onChange={(e) => onSearch && onSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                </div>

                <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors sm:w-auto">
                    <Filter size={16} />
                    Filters
                </button>
            </div>
        </div>
    );
}
