'use client';

import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
    Bug,
    Upload,
    X,
    Send,
    CheckCircle2,
    AlertTriangle,
    Image,
    Video,
    FileText,
    Loader2
} from 'lucide-react';

const CATEGORIES = ['Bug', 'UI Issue', 'Feature Request', 'Performance', 'Other'];
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

export default function ReportBugPage() {
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('Bug');
    const [files, setFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // { type: 'success' | 'error', message: '' }

    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        const combined = [...files];

        for (const f of selected) {
            if (combined.length >= MAX_FILES) break;
            if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                setResult({ type: 'error', message: `"${f.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
                return;
            }
            combined.push(f);
        }

        setFiles(combined);
        e.target.value = '';
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (type) => {
        if (type.startsWith('image/')) return <Image size={14} className="text-blue-500" />;
        if (type.startsWith('video/')) return <Video size={14} className="text-violet-500" />;
        return <FileText size={14} className="text-slate-400" />;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim() || message.trim().length < 10) {
            setResult({ type: 'error', message: 'Please provide at least 10 characters describing the issue.' });
            return;
        }

        setSubmitting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('message', message.trim());
            formData.append('category', category);
            files.forEach(f => formData.append('files', f));

            await api.post('/bug-report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setResult({ type: 'success', message: 'Bug report submitted successfully! Our team will investigate.' });
            setMessage('');
            setCategory('Bug');
            setFiles([]);
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to submit report. Please try again.';
            setResult({ type: 'error', message: detail });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-page">
            {/* Header */}
            <div className="bg-surface border-b border-border px-6 py-6">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-3">
                        <Bug className="text-red-500" size={24} />
                        Report a Bug
                    </h1>
                    <p className="text-muted text-sm mt-1">
                        Found something broken? Let us know and we'll fix it.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
                {/* Result Banner */}
                {result && (
                    <div className={`mb-6 flex items-start gap-3 p-4 rounded-xl border ${
                        result.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                        {result.type === 'success'
                            ? <CheckCircle2 size={20} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            : <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                        }
                        <p className="text-sm font-medium">{result.message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Reporter Info (Read-Only) */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 mb-6">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Reporter Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-muted text-xs font-medium">Name</span>
                                <p className="text-primary font-semibold">{user?.full_name || '—'}</p>
                            </div>
                            <div>
                                <span className="text-muted text-xs font-medium">Email</span>
                                <p className="text-primary font-semibold">{user?.email || '—'}</p>
                            </div>
                            <div>
                                <span className="text-muted text-xs font-medium">Role</span>
                                <p className="text-primary font-semibold capitalize">{user?.role || '—'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 mb-6">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest block mb-3">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                                        category === cat
                                            ? 'bg-accent text-white border-accent shadow-sm'
                                            : 'bg-surface text-secondary border-border hover:border-accent/30'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 mb-6">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest block mb-3">
                            Describe the Issue <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            placeholder="What happened? What were you trying to do? Please include as much detail as possible..."
                            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-sm text-primary placeholder:text-muted focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none transition-all"
                            required
                            minLength={10}
                        />
                        <p className="text-[11px] text-muted mt-2 font-medium">
                            {message.length}/5000 characters (minimum 10)
                        </p>
                    </div>

                    {/* File Attachments */}
                    <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 mb-8">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest block mb-3">
                            Attachments (Optional)
                        </label>
                        <p className="text-[11px] text-muted mb-4">
                            Upload screenshots or screen recordings to help us understand the issue. Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each.
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {/* Upload Zone */}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={files.length >= MAX_FILES}
                            className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent/40 hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Upload size={24} className="mx-auto mb-2 text-muted group-hover:text-accent transition-colors" />
                            <p className="text-sm font-medium text-muted group-hover:text-secondary transition-colors">
                                {files.length >= MAX_FILES ? 'Max files reached' : 'Click to upload images or videos'}
                            </p>
                        </button>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between px-4 py-2.5 bg-surface-elevated rounded-lg border border-border/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {getFileIcon(file.type)}
                                            <span className="text-sm text-primary font-medium truncate">{file.name}</span>
                                            <span className="text-[10px] text-muted font-bold uppercase flex-shrink-0">
                                                {(file.size / 1024 / 1024).toFixed(1)}MB
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="p-1 text-muted hover:text-red-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting || message.trim().length < 10}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Sending Report...
                            </>
                        ) : (
                            <>
                                <Send size={16} />
                                Submit Bug Report
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
