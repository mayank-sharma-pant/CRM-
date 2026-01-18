'use client';

import { useState, useEffect } from 'react';
import {
    GitBranch,
    ChevronRight,
    ChevronDown,
    User,
    Shield,
    ArrowRight,
    Users
} from 'lucide-react';

export default function AdminHierarchyPage() {
    const [loading, setLoading] = useState(true);
    const [hierarchy, setHierarchy] = useState([]);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [targetTeam, setTargetTeam] = useState('');
    const [targetManager, setTargetManager] = useState('');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                {
                    id: 1,
                    name: 'Sales Alpha',
                    manager: { id: 'EMP003', name: 'Mike Brown' },
                    members: [
                        { id: 'EMP001', name: 'Alex Johnson' },
                        { id: 'EMP002', name: 'Sarah Smith' }
                    ]
                },
                {
                    id: 2,
                    name: 'Sales Bravo',
                    manager: { id: 'EMP004', name: 'James Wilson' },
                    members: [
                        { id: 'EMP005', name: 'Emily Davis' },
                        { id: 'EMP010', name: 'Chris Anderson' }
                    ]
                },
                {
                    id: 3,
                    name: 'Sales Charlie',
                    manager: { id: 'EMP011', name: 'Sarah Thompson' },
                    members: [
                        { id: 'EMP008', name: 'David Martinez' },
                        { id: 'EMP012', name: 'Rachel Green' },
                        { id: 'EMP013', name: 'Tom Wilson' }
                    ]
                },
                {
                    id: 4,
                    name: 'Enterprise',
                    manager: { id: 'EMP014', name: 'Lisa Chen' },
                    members: [
                        { id: 'EMP015', name: 'Mark Stevens' }
                    ]
                }
            ];
            setHierarchy(data);
            // Expand all by default
            const expanded = {};
            data.forEach(t => expanded[t.id] = true);
            setExpandedTeams(expanded);
            setLoading(false);
        }, 400);
    }, []);

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const handleReassign = (member, currentTeam) => {
        setSelectedMember({ ...member, currentTeam });
        setTargetTeam('');
        setTargetManager('');
        setShowReassignModal(true);
    };

    const confirmReassign = () => {
        // Would call backend API here
        setShowReassignModal(false);
        setSelectedMember(null);
    };

    const teams = hierarchy.map(t => ({ id: t.id, name: t.name }));
    const managers = hierarchy.map(t => t.manager);

    if (loading) return <HierarchySkeleton />;

    const totalMembers = hierarchy.reduce((sum, t) => sum + t.members.length, 0);
    const totalManagers = hierarchy.length;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight flex items-center gap-3">
                    <GitBranch className="text-indigo-500" size={28} />
                    Organization Hierarchy
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">View and adjust reporting structure.</p>
            </div>

            {/* Summary Stats */}
            <div className="flex gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Users size={16} className="text-indigo-500" />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{hierarchy.length} Teams</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Shield size={16} className="text-purple-500" />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{totalManagers} Managers</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <User size={16} className="text-blue-500" />
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{totalMembers} Sales Executives</span>
                </div>
            </div>

            {/* Hierarchy Tree */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">Team Structure</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {hierarchy.map((team) => (
                        <div key={team.id}>
                            {/* Team Header */}
                            <div
                                onClick={() => toggleTeam(team.id)}
                                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                            >
                                <button className="w-6 h-6 flex items-center justify-center text-slate-400">
                                    {expandedTeams[team.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </button>
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                    <Users size={18} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[14px] font-semibold text-slate-800 dark:text-white">{team.name}</div>
                                    <div className="text-[11px] text-slate-400">{team.members.length} members</div>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <Shield size={14} className="text-purple-600 dark:text-purple-400" />
                                    <span className="text-[12px] font-medium text-purple-700 dark:text-purple-400">{team.manager.name}</span>
                                </div>
                            </div>

                            {/* Members */}
                            {expandedTeams[team.id] && (
                                <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50">
                                    {team.members.map((member, i) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between pl-20 pr-5 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                    <User size={14} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{member.name}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{member.id}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReassign(member, team.name); }}
                                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-opacity"
                                            >
                                                <ArrowRight size={12} />
                                                Reassign
                                            </button>
                                        </div>
                                    ))}
                                    {team.members.length === 0 && (
                                        <div className="pl-20 pr-5 py-4 text-[12px] text-slate-400 italic">No members</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Reassign Modal */}
            {showReassignModal && selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReassignModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-2">Reassign Member</h3>
                        <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-4">
                            Move <strong>{selectedMember.name}</strong> from {selectedMember.currentTeam}
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">Target Team</label>
                                <select
                                    value={targetTeam}
                                    onChange={(e) => setTargetTeam(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                                >
                                    <option value="">Select team...</option>
                                    {teams.filter(t => t.name !== selectedMember.currentTeam).map(t => (
                                        <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">New Manager</label>
                                <select
                                    value={targetManager}
                                    onChange={(e) => setTargetManager(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                                >
                                    <option value="">Select manager...</option>
                                    {managers.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReassignModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReassign}
                                disabled={!targetTeam}
                                className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                Reassign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HierarchySkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-6">
                <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
