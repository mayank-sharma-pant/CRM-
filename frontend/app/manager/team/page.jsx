'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '../../../services/api';
import { 
    ChevronRight, User, Mail, Users, TrendingUp, AlertCircle, 
    Shuffle, X, Check, Activity, Layout, ShieldAlert, 
    Clock, CheckCircle2 
} from 'lucide-react';
import PerformanceView from '../../../components/shared/PerformanceView';

export default function TeamListPage() {
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'roster'
    const [team, setTeam] = useState([]);
    const [monitoringData, setMonitoringData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allTeams, setAllTeams] = useState([]);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [targetTeam, setTargetTeam] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [teamRes, monitoringRes, allTeamsRes] = await Promise.all([
                api.get('/manager/team'),
                api.get('/manager/monitoring'),
                api.get('/admin/teams')
            ]);

            setTeam(teamRes.data.team || []);
            setAllTeams(allTeamsRes.data.teams || []);
            
            // Format monitoring data for PerformanceView
            const apiData = monitoringRes.data;
            const monitoringSnapshot = {
                header: {
                    title: 'Team Performance Overview',
                    subtitle: `${apiData.team_summary?.online || 0} members active now`
                },
                leadsMetrics: [
                    { label: 'Team Members', value: apiData.team_summary?.total_members || 0, icon: 'Users', color: 'blue' },
                    { label: 'Active Tasks', value: apiData.team_members?.reduce((sum, m) => sum + (m.pending_tasks || 0), 0) || 0, icon: 'CheckCircle2', color: 'emerald' },
                    { label: 'Risk Alerts', value: apiData.team_members?.filter(m => m.overdue_tasks > 3).length || 0, icon: 'ShieldAlert', color: 'blue' }
                ],
                taskStatus: {
                    title: 'Current Mission Status',
                    completed: apiData.team_members?.reduce((sum, m) => sum + (m.completed_tasks || 0), 0) || 0,
                    inProgress: apiData.team_members?.reduce((sum, m) => sum + (m.pending_tasks || 0), 0) || 0,
                    overdue: apiData.team_members?.reduce((sum, m) => sum + (m.overdue_tasks || 0), 0) || 0
                },
                activity: {
                    title: 'Personnel Dynamics',
                    section1: {
                        title: 'Live Status',
                        items: apiData.team_members?.filter(m => m.status !== 'offline').map(m => ({ label: m.name, value: m.status })) || []
                    },
                    section2: {
                        title: 'Operational Support Needed',
                        items: apiData.team_members?.filter(m => m.overdue_tasks > 0).map(m => ({ label: m.name, value: `${m.overdue_tasks} overdue` })) || []
                    }
                },
                footer: { text: 'AI-generated operational intelligence' }
            };
            setMonitoringData(monitoringSnapshot);

        } catch (err) {
            console.error("Failed to fetch team data", err);
        } finally {
            setLoading(false);
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
                <div className="text-sm font-medium text-muted animate-pulse">Syncing team intelligence nodes...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-page overflow-x-hidden">
            {/* Context Header */}
            <div className="bg-surface border-b border-border px-6 py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-primary tracking-tight flex items-center gap-2">
                            <Users className="text-accent" size={24} />
                            Team Command
                        </h1>
                        <p className="text-muted text-sm mt-1">Unified operational control and personnel management</p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex bg-surface-elevated p-1 rounded-xl border border-border self-start">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'overview' 
                                ? 'bg-surface text-accent shadow-sm' 
                                : 'text-muted hover:text-primary'
                            }`}
                        >
                            <Activity size={14} />
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('roster')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === 'roster' 
                                ? 'bg-surface text-accent shadow-sm' 
                                : 'text-muted hover:text-primary'
                            }`}
                        >
                            <Layout size={14} />
                            Roster
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'overview' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {monitoringData ? (
                            <PerformanceView data={monitoringData} />
                        ) : (
                            <div className="text-center py-12 text-muted">No monitoring data available.</div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                        {/* Stats Summary from Roster perspective */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                                <div className="flex items-center gap-3 text-blue-500 mb-2">
                                    <Users size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Active Agents</span>
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
                                <h3 className="text-xs font-bold text-muted uppercase tracking-widest leading-none">Management Core</h3>
                            </div>
                            
                            <div className="divide-y divide-border/50">
                                {team.length === 0 ? (
                                    <div className="p-12 text-center text-muted">No agents assigned to this cluster.</div>
                                ) : (
                                    team.map(member => (
                                        <Link key={member.id} href={`/manager/team/${member.id}`}
                                            className="flex items-center gap-6 px-6 py-4 hover:bg-surface-elevated/20 transition-all group">
                                            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                                {member.full_name?.charAt(0)}
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
                )}
            </div>

            {/* Transfer Modal */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-elevated/30">
                            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                                <Shuffle size={16} className="text-accent" />
                                Operational Transfer Request
                            </h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="text-muted hover:text-primary transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Asset</label>
                                <div className="p-3 bg-surface-elevated/50 rounded-lg border border-border flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold">
                                        {selectedMember?.full_name?.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-primary">{selectedMember?.full_name}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Target Cluster</label>
                                <select 
                                    value={targetTeam}
                                    onChange={(e) => setTargetTeam(e.target.value)}
                                    className="w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                                >
                                    <option value="">Select target cluster...</option>
                                    {allTeams
                                        .filter(t => t.id !== selectedMember?.team_id)
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5">Strategic Justification</label>
                                <textarea 
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="Explain the necessity of this transfer..."
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
                                Abort
                            </button>
                            <button 
                                onClick={handleTransferSubmit}
                                disabled={!targetTeam || isSubmitting}
                                className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'Transmitting...' : 'Submit Request'}
                                {!isSubmitting && <Check size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
