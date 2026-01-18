'use client';

import { useState, useEffect } from 'react';
import {
    UsersRound,
    User,
    ChevronRight,
    Plus,
    X,
    ArrowRight,
    Shield
} from 'lucide-react';

export default function AdminTeamsPage() {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
    const [showChangeManagerModal, setShowChangeManagerModal] = useState(false);
    const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);

    // Form state
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedNewMember, setSelectedNewMember] = useState('');
    const [selectedNewManager, setSelectedNewManager] = useState('');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                {
                    id: 1, name: 'Sales Alpha', manager: 'Mike Brown', managerId: 'EMP003',
                    members: [
                        { id: 'EMP001', name: 'Alex Johnson', role: 'Sales Executive' },
                        { id: 'EMP002', name: 'Sarah Smith', role: 'Sales Executive' }
                    ]
                },
                {
                    id: 2, name: 'Sales Bravo', manager: 'James Wilson', managerId: 'EMP004',
                    members: [
                        { id: 'EMP005', name: 'Emily Davis', role: 'Sales Executive' },
                        { id: 'EMP010', name: 'Chris Anderson', role: 'Sales Executive' }
                    ]
                },
                {
                    id: 3, name: 'Sales Charlie', manager: 'Sarah Thompson', managerId: 'EMP011',
                    members: [
                        { id: 'EMP008', name: 'David Martinez', role: 'Sales Executive' },
                        { id: 'EMP012', name: 'Rachel Green', role: 'Sales Executive' },
                        { id: 'EMP013', name: 'Tom Wilson', role: 'Sales Executive' }
                    ]
                },
                {
                    id: 4, name: 'Enterprise', manager: 'Lisa Chen', managerId: 'EMP014',
                    members: [
                        { id: 'EMP015', name: 'Mark Stevens', role: 'Sales Executive' }
                    ]
                }
            ];
            setTeams(data);
            setSelectedTeam(data[0]);
            setLoading(false);
        }, 400);
    }, []);

    const availableMembers = [
        { id: 'EMP020', name: 'John Miller' },
        { id: 'EMP021', name: 'Anna Brown' },
        { id: 'EMP022', name: 'Peter Chen' }
    ];

    const availableManagers = [
        { id: 'EMP003', name: 'Mike Brown' },
        { id: 'EMP004', name: 'James Wilson' },
        { id: 'EMP011', name: 'Sarah Thompson' },
        { id: 'EMP014', name: 'Lisa Chen' }
    ];

    const handleRemoveMember = (member) => {
        setMemberToRemove(member);
        setShowRemoveMemberModal(true);
    };

    const confirmRemoveMember = () => {
        if (selectedTeam && memberToRemove) {
            const updatedTeam = {
                ...selectedTeam,
                members: selectedTeam.members.filter(m => m.id !== memberToRemove.id)
            };
            setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
            setSelectedTeam(updatedTeam);
        }
        setShowRemoveMemberModal(false);
        setMemberToRemove(null);
    };

    const confirmAddMember = () => {
        if (selectedTeam && selectedNewMember) {
            const memberToAdd = availableMembers.find(m => m.id === selectedNewMember);
            if (memberToAdd) {
                const updatedTeam = {
                    ...selectedTeam,
                    members: [...selectedTeam.members, { ...memberToAdd, role: 'Sales Executive' }]
                };
                setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
                setSelectedTeam(updatedTeam);
            }
        }
        setShowAddMemberModal(false);
        setSelectedNewMember('');
    };

    const confirmChangeManager = () => {
        if (selectedTeam && selectedNewManager) {
            const newManager = availableManagers.find(m => m.id === selectedNewManager);
            if (newManager) {
                const updatedTeam = {
                    ...selectedTeam,
                    manager: newManager.name,
                    managerId: newManager.id
                };
                setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
                setSelectedTeam(updatedTeam);
            }
        }
        setShowChangeManagerModal(false);
        setSelectedNewManager('');
    };

    const confirmCreateTeam = () => {
        if (newTeamName.trim()) {
            const newTeam = {
                id: teams.length + 1,
                name: newTeamName.trim(),
                manager: null,
                managerId: null,
                members: []
            };
            setTeams([...teams, newTeam]);
            setSelectedTeam(newTeam);
        }
        setShowCreateTeamModal(false);
        setNewTeamName('');
    };

    if (loading) return <TeamsSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Teams</h1>
                    <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage team composition and membership.</p>
                </div>
                <button
                    onClick={() => setShowCreateTeamModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors"
                >
                    <Plus size={16} />
                    Create Team
                </button>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-12 gap-6">

                {/* Team List */}
                <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
                        <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{teams.length} Teams</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                onClick={() => setSelectedTeam(team)}
                                className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${selectedTeam?.id === team.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <UsersRound size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-[13px] font-semibold text-slate-800 dark:text-white">{team.name}</div>
                                        <div className="text-[11px] text-slate-400">{team.members.length} members</div>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Team Details */}
                {selectedTeam && (
                    <div className="col-span-12 lg:col-span-8 space-y-5">

                        {/* Manager */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">{selectedTeam.name}</h3>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Shield size={18} className="text-purple-500" />
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Team Manager</div>
                                        <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-200">
                                            {selectedTeam.manager || 'No manager assigned'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedNewManager(selectedTeam.managerId || ''); setShowChangeManagerModal(true); }}
                                    className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    Change
                                </button>
                            </div>
                        </div>

                        {/* Members */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">Team Members ({selectedTeam.members.length})</h3>
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="flex items-center gap-1 text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                >
                                    <Plus size={14} /> Add Member
                                </button>
                            </div>
                            <div className="space-y-2">
                                {selectedTeam.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <User size={14} className="text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{member.name}</div>
                                                <div className="text-[11px] text-slate-400">{member.id} | {member.role}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveMember(member)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                            title="Remove from team"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {selectedTeam.members.length === 0 && (
                                    <div className="py-8 text-center text-slate-400 text-[13px]">No members in this team</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Team Modal */}
            {showCreateTeamModal && (
                <Modal title="Create Team" onClose={() => setShowCreateTeamModal(false)}>
                    <div className="mb-4">
                        <label className="block text-[12px] font-medium text-slate-500 mb-1">Team Name</label>
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                            placeholder="Enter team name..."
                        />
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCreateTeamModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                        <button onClick={confirmCreateTeam} disabled={!newTeamName.trim()} className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50">Create</button>
                    </div>
                </Modal>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && (
                <Modal title="Add Member" onClose={() => setShowAddMemberModal(false)}>
                    <div className="mb-4">
                        <label className="block text-[12px] font-medium text-slate-500 mb-1">Select Member</label>
                        <select
                            value={selectedNewMember}
                            onChange={(e) => setSelectedNewMember(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                        >
                            <option value="">Select a member...</option>
                            {availableMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowAddMemberModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                        <button onClick={confirmAddMember} disabled={!selectedNewMember} className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50">Add</button>
                    </div>
                </Modal>
            )}

            {/* Change Manager Modal */}
            {showChangeManagerModal && (
                <Modal title="Change Manager" onClose={() => setShowChangeManagerModal(false)}>
                    <div className="mb-4">
                        <label className="block text-[12px] font-medium text-slate-500 mb-1">Select Manager</label>
                        <select
                            value={selectedNewManager}
                            onChange={(e) => setSelectedNewManager(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                        >
                            <option value="">No manager</option>
                            {availableManagers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowChangeManagerModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                        <button onClick={confirmChangeManager} className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium">Save</button>
                    </div>
                </Modal>
            )}

            {/* Remove Member Modal */}
            {showRemoveMemberModal && memberToRemove && (
                <Modal title="Remove Member" onClose={() => setShowRemoveMemberModal(false)}>
                    <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-6">
                        Are you sure you want to remove <strong>{memberToRemove.name}</strong> from {selectedTeam?.name}?
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowRemoveMemberModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                        <button onClick={confirmRemoveMember} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium">Remove</button>
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
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md">
                <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">{title}</h3>
                {children}
            </div>
        </div>
    );
}

function TeamsSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="flex justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-4 h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="col-span-8 h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        </div>
    );
}
