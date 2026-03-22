'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { ChevronRight, User, Mail, Users, TrendingUp, AlertCircle, Shuffle, X, Check } from 'lucide-react';

export default function TeamListPage() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allTeams, setAllTeams] = useState([]);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [targetTeam, setTargetTeam] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTeam();
        fetchTeams();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await api.get('/manager/team');
            setTeam(res.data.team || []);
        } catch (err) {
            console.error("Failed to fetch team", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await api.get('/admin/teams'); // Adjust if manager has a different endpoint
            setAllTeams(res.data.teams || []);
        } catch (err) {
            console.error("Failed to fetch teams", err);
        }
    };

    const handleTransferClick = (e, member) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedMember(member);
        setIsTransferModalOpen(true);
    };

    const handleTransferSubmit = async () => {
        if (!targetTeam) return;
        setIsSubmitting(true);
        try {
            await api.post('/manager/transfer-request', {
                user_id: selectedMember.id,
                target_team_id: parseInt(targetTeam),
                reason: transferReason
            });
            alert("Transfer request submitted for Admin approval.");
            setIsTransferModalOpen(false);
            setTargetTeam('');
            setTransferReason('');
        } catch (err) {
            console.error("Transfer request failed", err);
            alert(err.response?.data?.detail || "Failed to submit transfer request");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-page">
                <div className="text-sm font-medium text-muted animate-pulse">Scanning team signals...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page">
            <div className="bg-surface border-b border-border px-6 py-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                        <Users className="text-accent" size={24} />
                        My Team
                    </h1>
                    <p className="text-muted text-sm mt-1">Manage and monitor your sales personnel performance</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-blue-500 mb-2">
                            <Users size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Total Members</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">{team.length}</p>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-emerald-500 mb-2">
                            <TrendingUp size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Top Performer</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {team.length > 0 ? team.reduce((prev, current) => (prev.order_count > current.order_count) ? prev : current).full_name : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                        <div className="flex items-center gap-3 text-amber-500 mb-2">
                            <AlertCircle size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">Total Pipeline</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">
                            {team.reduce((sum, m) => sum + m.lead_count, 0)} Leads
                        </p>
                    </div>
                </div>

                {/* Team Roster */}
                <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-surface-elevated/50">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-widest leading-none">Team Roster</h3>
                    </div>
                    
                    <div className="divide-y divide-border/50">
                        {team.length === 0 ? (
                            <div className="p-12 text-center text-muted">No team members assigned yet.</div>
                        ) : (
                            team.map(member => (
                                <Link key={member.id} href={`/manager/team/${member.id}`}
                                    className="flex items-center gap-6 px-6 py-4 hover:bg-surface-elevated/20 transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                        {member.full_name.charAt(0)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{member.full_name}</h4>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1.5 text-[11px] text-muted font-medium uppercase tracking-wide">
                                                <Mail size={10} /> {member.email}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-12 text-right px-8">
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Leads</p>
                                            <p className="text-sm font-bold text-primary">{member.lead_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Orders</p>
                                            <p className="text-sm font-bold text-primary">{member.order_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-0.5">Status</p>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${member.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                {member.status}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => handleTransferClick(e, member)}
                                            className="px-2 py-1 bg-surface-elevated text-muted hover:text-accent border border-border rounded flex items-center gap-1.5 transition-all text-[10px] font-bold uppercase"
                                        >
                                            <Shuffle size={12} />
                                            Transfer
                                        </button>
                                    </div>

                                    <div className="text-border group-hover:text-accent transition-all group-hover:translate-x-1">
                                        <ChevronRight size={18} />
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/30">
                            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                                <Shuffle size={16} className="text-accent" />
                                Request Team Transfer
                            </h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Employee</label>
                                <div className="p-3 bg-surface-elevated/50 rounded-lg border border-border flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                        {selectedMember?.full_name?.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-primary">{selectedMember?.full_name}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Target Team</label>
                                <select 
                                    value={targetTeam}
                                    onChange={(e) => setTargetTeam(e.target.value)}
                                    className="w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                >
                                    <option value="">Select target team...</option>
                                    {allTeams
                                        .filter(t => t.id !== selectedMember?.team_id)
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Reason for Transfer</label>
                                <textarea 
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="Explain why this transfer is necessary..."
                                    rows={3}
                                    className="w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-surface-elevated/30 border-t border-border flex gap-3">
                            <button 
                                onClick={() => setIsTransferModalOpen(false)}
                                className="flex-1 px-4 py-2 text-sm font-bold text-muted hover:text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleTransferSubmit}
                                disabled={!targetTeam || isSubmitting}
                                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Plea'}
                                {!isSubmitting && <Check size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
