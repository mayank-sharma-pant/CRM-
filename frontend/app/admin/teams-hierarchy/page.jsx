'use client';

import { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    ChevronRight,
    ChevronDown,
    Plus,
    X,
    ArrowRight
} from 'lucide-react';

export default function TeamsHierarchyPage() {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [expandedTeams, setExpandedTeams] = useState({});
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [showEditManagerModal, setShowEditManagerModal] = useState(false);
    const [showShiftMemberModal, setShowShiftMemberModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    // Form state
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedManager, setSelectedManager] = useState('');
    const [targetTeam, setTargetTeam] = useState('');
    const [targetManager, setTargetManager] = useState('');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                {
                    id: 1, name: 'Sales Alpha', manager: 'Mike Brown', managerId: 'EMP003', memberCount: 4,
                    members: [
                        { id: 'EMP001', name: 'Alex Johnson' },
                        { id: 'EMP002', name: 'Sarah Smith' }
                    ]
                },
                {
                    id: 2, name: 'Sales Bravo', manager: 'James Wilson', managerId: 'EMP004', memberCount: 3,
                    members: [
                        { id: 'EMP005', name: 'Emily Davis' },
                        { id: 'EMP010', name: 'Chris Anderson' }
                    ]
                },
                {
                    id: 3, name: 'Sales Charlie', manager: 'Sarah Thompson', managerId: 'EMP011', memberCount: 5,
                    members: [
                        { id: 'EMP008', name: 'David Martinez' },
                        { id: 'EMP012', name: 'Rachel Green' },
                        { id: 'EMP013', name: 'Tom Wilson' }
                    ]
                }
            ];
            setTeams(data);
            setSelectedTeam(data[0]);
            const expanded = {};
            data.forEach(t => expanded[t.id] = true);
            setExpandedTeams(expanded);
            setLoading(false);
        }, 300);
    }, []);

    const toggleTeam = (teamId) => {
        setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
    };

    const handleShiftMember = (member, currentTeam) => {
        setSelectedMember({ ...member, currentTeam });
        setTargetTeam('');
        setTargetManager('');
        setShowShiftMemberModal(true);
    };

    if (loading) return <Skeleton />;

    const managers = teams.map(t => ({ id: t.managerId, name: t.manager }));

    return (
        <div className="mx-auto max-w-[1360px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Teams & Hierarchy</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage team structure and reporting</p>
                </div>
                <button
                    onClick={() => setShowCreateTeamModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                    <Plus size={16} />
                    Create Team
                </button>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-12 gap-4">

                {/* Teams List (Left) */}
                <div className="col-span-12 lg:col-span-5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{teams.length} Teams</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                onClick={() => setSelectedTeam(team)}
                                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${selectedTeam?.id === team.id
                                    ? 'bg-slate-50 dark:bg-slate-700/50 border-l-2 border-slate-900 dark:border-slate-400'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                        <Users size={16} className="text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-white">{team.name}</div>
                                        <div className="text-xs text-slate-500">{team.memberCount} members</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hierarchy View (Right) */}
                <div className="col-span-12 lg:col-span-7 space-y-4">

                    {/* Selected Team Manager */}
                    {selectedTeam && (
                        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedTeam.name}</h3>
                                <button
                                    onClick={() => { setSelectedManager(selectedTeam.managerId); setShowEditManagerModal(true); }}
                                    className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                                >
                                    Edit
                                </button>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <Shield size={16} className="text-slate-600 dark:text-slate-400" />
                                <div>
                                    <div className="text-xs text-slate-500">Manager</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedTeam.manager}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hierarchy Tree */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Reporting Structure</h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {teams.map((team) => (
                                <div key={team.id}>
                                    <div
                                        onClick={() => toggleTeam(team.id)}
                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                                    >
                                        <button className="w-5 h-5 flex items-center justify-center text-slate-400">
                                            {expandedTeams[team.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        <Users size={16} className="text-slate-500" />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-800 dark:text-white">{team.name}</div>
                                        </div>
                                        <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-400">
                                            <Shield size={12} />
                                            {team.manager}
                                        </div>
                                    </div>

                                    {expandedTeams[team.id] && (
                                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50">
                                            {team.members.map((member) => (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center justify-between pl-14 pr-4 py-2.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">{member.name}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{member.id}</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleShiftMember(member, team.name); }}
                                                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-opacity"
                                                    >
                                                        <ArrowRight size={12} />
                                                        Shift
                                                    </button>
                                                </div>
                                            ))}
                                            {team.members.length === 0 && (
                                                <div className="pl-14 pr-4 py-3 text-xs text-slate-400 italic">No members</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Team Modal */}
            {showCreateTeamModal && (
                <Modal title="Create Team" onClose={() => setShowCreateTeamModal(false)}>
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Team Name</label>
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                            placeholder="e.g. Sales Delta"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCreateTeamModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-sm">Cancel</button>
                        <button onClick={() => setShowCreateTeamModal(false)} disabled={!newTeamName.trim()} className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-sm disabled:opacity-50">Create</button>
                    </div>
                </Modal>
            )}

            {/* Edit Manager Modal */}
            {showEditManagerModal && (
                <Modal title="Change Manager" onClose={() => setShowEditManagerModal(false)}>
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Manager</label>
                        <select
                            value={selectedManager}
                            onChange={(e) => setSelectedManager(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                        >
                            <option value="">No manager</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowEditManagerModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-sm">Cancel</button>
                        <button onClick={() => setShowEditManagerModal(false)} className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-sm">Save</button>
                    </div>
                </Modal>
            )}

            {/* Shift Member Modal */}
            {showShiftMemberModal && selectedMember && (
                <Modal title="Shift Member" onClose={() => setShowShiftMemberModal(false)}>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Move <strong>{selectedMember.name}</strong> from {selectedMember.currentTeam}
                    </p>
                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Target Team</label>
                            <select
                                value={targetTeam}
                                onChange={(e) => setTargetTeam(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                            >
                                <option value="">Select team...</option>
                                {teams.filter(t => t.name !== selectedMember.currentTeam).map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New Manager</label>
                            <select
                                value={targetManager}
                                onChange={(e) => setTargetManager(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
                            >
                                <option value="">Select manager...</option>
                                {managers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-800 dark:text-amber-400">Changes affect data visibility and assignment scope for this user.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowShiftMemberModal(false)} className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium text-sm">Cancel</button>
                        <button onClick={() => setShowShiftMemberModal(false)} disabled={!targetTeam} className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-sm disabled:opacity-50">Confirm</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, children, onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl p-5 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-4 animate-pulse">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-5 h-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="col-span-7 h-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
        </div>
    );
}
