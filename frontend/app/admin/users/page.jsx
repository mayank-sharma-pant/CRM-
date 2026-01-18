'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Filter,
    ChevronRight,
    CheckCircle,
    XCircle
} from 'lucide-react';

export default function AdminUsersPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [teamFilter, setTeamFilter] = useState('All');

    useEffect(() => {
        setTimeout(() => {
            const data = [
                { id: 'EMP001', name: 'Alex Johnson', email: 'alex.j@company.com', role: 'Sales Executive', team: 'Sales Alpha', status: 'Active', createdAt: '2023-06-15', lastLogin: '2024-01-15 09:30' },
                { id: 'EMP002', name: 'Sarah Smith', email: 'sarah.s@company.com', role: 'Sales Executive', team: 'Sales Alpha', status: 'Active', createdAt: '2023-07-20', lastLogin: '2024-01-15 08:45' },
                { id: 'EMP003', name: 'Mike Brown', email: 'mike.b@company.com', role: 'Manager', team: 'Sales Alpha', status: 'Active', createdAt: '2023-05-10', lastLogin: '2024-01-14 17:20' },
                { id: 'EMP004', name: 'James Wilson', email: 'james.w@company.com', role: 'Manager', team: 'Sales Bravo', status: 'Active', createdAt: '2023-04-01', lastLogin: '2024-01-15 07:00' },
                { id: 'EMP005', name: 'Emily Davis', email: 'emily.d@company.com', role: 'Sales Executive', team: 'Sales Bravo', status: 'Inactive', createdAt: '2023-08-25', lastLogin: '2023-12-20 16:00' },
                { id: 'EMP006', name: 'Robert Thompson', email: 'robert.t@company.com', role: 'MD', team: null, status: 'Active', createdAt: '2023-01-15', lastLogin: '2024-01-15 10:00' },
                { id: 'EMP007', name: 'Lisa Chen', email: 'lisa.c@company.com', role: 'Purchase', team: null, status: 'Active', createdAt: '2023-09-01', lastLogin: '2024-01-14 15:30' },
                { id: 'EMP008', name: 'David Martinez', email: 'david.m@company.com', role: 'Sales Executive', team: 'Sales Charlie', status: 'Active', createdAt: '2023-10-05', lastLogin: '2024-01-15 09:15' },
                { id: 'EMP009', name: 'Jennifer Lee', email: 'jennifer.l@company.com', role: 'Sales Executive', team: 'Sales Charlie', status: 'Inactive', createdAt: '2023-03-20', lastLogin: '2023-11-30 12:00' }
            ];
            setUsers(data);
            setLoading(false);
        }, 400);
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'All' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
        const matchesTeam = teamFilter === 'All' || user.team === teamFilter;
        return matchesSearch && matchesRole && matchesStatus && matchesTeam;
    });

    const roles = ['All', 'Sales Executive', 'Manager', 'MD', 'Purchase'];
    const statuses = ['All', 'Active', 'Inactive'];
    const teams = ['All', 'Sales Alpha', 'Sales Bravo', 'Sales Charlie'];

    if (loading) return <UsersSkeleton />;

    return (
        <div className="mx-auto max-w-[1360px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">Users</h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Manage user roles, teams, and lifecycle.</p>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or ID..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Role Filter */}
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {roles.map(role => (
                        <option key={role} value={role}>{role === 'All' ? 'All Roles' : role}</option>
                    ))}
                </select>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {statuses.map(status => (
                        <option key={status} value={status}>{status === 'All' ? 'All Statuses' : status}</option>
                    ))}
                </select>

                {/* Team Filter */}
                <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    {teams.map(team => (
                        <option key={team} value={team}>{team === 'All' ? 'All Teams' : team}</option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-[13px]">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Employee ID</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Name</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Role</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Team</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Created</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Last Login</th>
                            <th className="px-5 py-3 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredUsers.map((user) => (
                            <tr
                                key={user.id}
                                onClick={() => router.push(`/admin/users/${user.id}`)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                            >
                                <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-400">{user.id}</td>
                                <td className="px-5 py-3.5">
                                    <div className="font-medium text-slate-800 dark:text-slate-200">{user.name}</div>
                                    <div className="text-[11px] text-slate-400">{user.email}</div>
                                </td>
                                <td className="px-5 py-3.5">
                                    <RoleBadge role={user.role} />
                                </td>
                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">
                                    {user.team || <span className="text-slate-400">-</span>}
                                </td>
                                <td className="px-5 py-3.5">
                                    <StatusBadge status={user.status} />
                                </td>
                                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{user.createdAt}</td>
                                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{user.lastLogin}</td>
                                <td className="px-5 py-3.5 text-right">
                                    <ChevronRight size={16} className="inline text-slate-300" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredUsers.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
                        No users found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}

function RoleBadge({ role }) {
    const colors = {
        'Sales Executive': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Manager': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'MD': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'Purchase': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    return (
        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${colors[role] || 'bg-slate-100 text-slate-600'}`}>
            {role}
        </span>
    );
}

function StatusBadge({ status }) {
    if (status === 'Active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[11px] font-bold uppercase">
                <CheckCircle size={12} /> Active
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded text-[11px] font-bold uppercase">
            <XCircle size={12} /> Inactive
        </span>
    );
}

function UsersSkeleton() {
    return (
        <div className="mx-auto max-w-[1360px] space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-4">
                <div className="h-10 w-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-[400px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
    );
}
