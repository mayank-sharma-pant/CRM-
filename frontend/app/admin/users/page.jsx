'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import {
    Search,
    Plus,
    ChevronRight,
    CheckCircle,
    XCircle,
    Mail,
    Clock,
    X
} from 'lucide-react';

export default function AdminUsersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [roleFilter, setRoleFilter] = useState('All');
    const [teamFilter, setTeamFilter] = useState('All');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [error, setError] = useState(null);

    // Invite form state
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const [inviteTeam, setInviteTeam] = useState('');
    const [inviteManager, setInviteManager] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const [usersRes, teamsRes] = await Promise.all([
                api.get('/admin/users'),
                api.get('/admin/teams')
            ]);

            const usersData = (usersRes.data.users || []).map(u => ({
                id: `EMP${String(u.user_id ?? u.id ?? '').padStart(3, '0')}`,
                rawId: u.user_id ?? u.id,
                name: u.name || u.full_name,
                email: u.email,
                phone: u.phone || '–',
                role: u.role,
                team: u.team || null,
                status: u.status,
                joinedAt: u.joined_at,
                lastActive: u.last_active
            }));

            setUsers(usersData);
            setTeams(teamsRes.data.teams || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All' || user.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesRole = roleFilter === 'All' || user.role.toLowerCase() === roleFilter.toLowerCase();
        const matchesTeam = teamFilter === 'All' || user.team === teamFilter;
        return matchesSearch && matchesStatus && matchesRole && matchesTeam;
    });

    const handleInvite = async () => {
        try {
            setInviteLoading(true);

            // Map display role back to backend enum
            const roleMap = {
                'Sales Executive': 'sales',
                'Manager': 'manager',
                'MD': 'md',
                'Purchase': 'purchase',
                'Admin': 'admin'
            };

            const params = {
                email: inviteEmail,
                full_name: inviteName,
                role: roleMap[inviteRole] || inviteRole.toLowerCase()
            };

            if (invitePhone) params.phone = invitePhone;
            const teamId = inviteTeam ? parseInt(inviteTeam, 10) : null;
            const managerId = inviteManager ? parseInt(inviteManager, 10) : null;
            if (teamId && !isNaN(teamId)) params.team_id = teamId;
            if (managerId && !isNaN(managerId)) params.manager_id = managerId;

            await api.post('/admin/invites', params);

            setShowInviteModal(false);
            setInviteEmail('');
            setInviteName('');
            setInvitePhone('');
            setInviteRole('');
            setInviteTeam('');
            setInviteManager('');
            fetchUsers();
            alert('Invite sent successfully!');
        } catch (err) {
            console.error('Failed to create invite:', err);
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Failed to create invite');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleUpdateUser = async (userId, data) => {
        try {
            await api.put(`/admin/users/${userId}`, data);
            fetchUsers();
        } catch (err) {
            console.error('Update user failed', err);
            const detail = err.response?.data?.detail;
            alert(typeof detail === 'object' ? JSON.stringify(detail) : detail || 'Failed to update user');
        }
    };

    if (loading) return <UsersSkeleton />;

    const roles = ['All', 'sales', 'manager', 'md', 'admin'];
    const statuses = ['All', 'Active', 'Disabled', 'Pending Approval'];
    const teamOptions = ['All', ...teams.map(t => t.name)];

    return (
        <div className="mx-auto max-w-[1360px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Users</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Invite and manage system users</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                >
                    <Plus size={16} />
                    Invite Member
                </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or ID..."
                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                </div>

                {/* Filters */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    {statuses.map(status => (
                        <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
                    ))}
                </select>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    {roles.map(role => (
                        <option key={role} value={role}>{role === 'All' ? 'All Roles' : role}</option>
                    ))}
                </select>

                <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                    {teamOptions.map(team => (
                        <option key={team} value={team}>{team === 'All' ? 'All Teams' : team}</option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">ID</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Name</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Contact</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Role</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Team</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Status</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Joined</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs">Last Active</th>
                                <th className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide text-xs text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredUsers.map((user) => (
                                <tr
                                    key={user.rawId}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-400">{user.id}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{user.name}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="text-slate-700 dark:text-slate-300 text-xs">{user.email}</div>
                                        <div className="text-[10px] text-slate-400">{user.phone}</div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <select
                                            value={user.role.toLowerCase()}
                                            onChange={(e) => handleUpdateUser(user.rawId, { role: e.target.value })}
                                            className="bg-transparent border-none text-[10px] font-medium focus:ring-0 p-0 cursor-pointer"
                                        >
                                            <option value="sales">Sales</option>
                                            <option value="manager">Manager</option>
                                            <option value="md">MD</option>
                                            <option value="purchase">Purchase</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <select
                                            value={teams.find(t => t.name === user.team)?.id || ''}
                                            onChange={(e) => handleUpdateUser(user.rawId, { team_id: e.target.value })}
                                            className="bg-transparent border-none text-[10px] font-medium focus:ring-0 p-0 cursor-pointer max-w-[100px] truncate"
                                        >
                                            <option value="">No Team</option>
                                            {teams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <select
                                            value={user.status.toLowerCase()}
                                            onChange={(e) => handleUpdateUser(user.rawId, { status: e.target.value })}
                                            className="bg-transparent border-none text-[10px] font-medium focus:ring-0 p-0 cursor-pointer"
                                        >
                                            <option value="active">Active</option>
                                            <option value="disabled">Disabled</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{user.joinedAt}</td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{user.lastActive || '-'}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            onClick={() => handleUpdateUser(user.rawId, { status: user.status === 'active' ? 'disabled' : 'active' })}
                                            className={`text-[10px] px-2 py-1 rounded border min-w-[60px] ${user.status === 'active' ? 'text-red-500 border-red-100' : 'text-emerald-500 border-emerald-100'}`}
                                        >
                                            {user.status === 'active' ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400 text-sm">
                        No users found
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-lg shadow-xl p-5 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Invite Member</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-5">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="email@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="John Smith"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={invitePhone}
                                    onChange={(e) => setInvitePhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="+1 555-0100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Role *</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="">Select role...</option>
                                    <option value="Sales Executive">Sales Executive</option>
                                    <option value="Manager">Manager</option>
                                    <option value="MD">Managing Director</option>
                                    <option value="Purchase">Purchase</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Team</label>
                                <select
                                    value={inviteTeam}
                                    onChange={(e) => setInviteTeam(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                >
                                    <option value="">No team</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            {inviteRole === 'Sales Executive' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reporting Manager</label>
                                    <select
                                        value={inviteManager}
                                        onChange={(e) => setInviteManager(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                    >
                                        <option value="">Select manager...</option>
                                        {users.filter(u => u.role.toLowerCase() === 'manager').map(m => (
                                            <option key={m.rawId} value={m.rawId}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInvite}
                                disabled={!inviteEmail || !inviteName || !inviteRole}
                                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-medium text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send Invite
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RoleBadge({ role }) {
    const colors = {
        'Sales Executive': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        'Manager': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
        'MD': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
        'Purchase': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
        'Admin': 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
    };

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${colors[role] || 'bg-slate-100 text-slate-600'}`}>
            {role}
        </span>
    );
}

function StatusBadge({ status }) {
    if (status === 'Active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-medium">
                <CheckCircle size={10} /> Active
            </span>
        );
    }
    if (status === 'Disabled') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-[10px] font-medium">
                <XCircle size={10} /> Disabled
            </span>
        );
    }
    if (status === 'Invite Pending') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-[10px] font-medium">
                <Mail size={10} /> Pending
            </span>
        );
    }
    if (status === 'Invite Expired') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-[10px] font-medium">
                <Clock size={10} /> Expired
            </span>
        );
    }
    return <span className="text-xs text-slate-400">{status}</span>;
}

function UsersSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-4 animate-pulse">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="flex gap-3">
                <div className="h-9 flex-1 max-w-md bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
    );
}
