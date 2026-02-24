'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Shield,
    UsersRound,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    LogOut
} from 'lucide-react';

export default function UserDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);

    // Form state
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [selectedManager, setSelectedManager] = useState('');

    useEffect(() => {
        setTimeout(() => {
            // Mock user detail data
            const userData = {
                id: params.userId,
                name: 'Alex Johnson',
                email: 'alex.j@company.com',
                phone: '+1 555-0101',
                role: 'Sales Executive',
                team: 'Sales Alpha',
                manager: 'Mike Brown',
                status: 'Active',
                createdAt: '2023-06-15',
                lastLogin: '2024-01-15 09:30',
                assignmentHistory: [
                    { date: '2023-11-01', change: 'Team changed from Sales Bravo to Sales Alpha', by: 'Admin' },
                    { date: '2023-08-15', change: 'Manager changed to Mike Brown', by: 'Admin' },
                    { date: '2023-06-15', change: 'User created with role Sales Executive', by: 'System' }
                ]
            };
            setUser(userData);
            setSelectedRole(userData.role);
            setSelectedTeam(userData.team);
            setSelectedManager(userData.manager);
            setLoading(false);
        }, 400);
    }, [params.userId]);

    const handleToggleStatus = () => {
        setShowDeactivateModal(true);
    };

    const confirmToggleStatus = () => {
        setUser({ ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' });
        setShowDeactivateModal(false);
    };

    const confirmRoleChange = () => {
        setUser({ ...user, role: selectedRole });
        setShowRoleModal(false);
    };

    const confirmTeamChange = () => {
        setUser({ ...user, team: selectedTeam, manager: selectedManager });
        setShowTeamModal(false);
    };

    if (loading) return <DetailSkeleton />;

    return (
        <div className="mx-auto max-w-[1100px] space-y-6 pb-12 font-sans text-slate-900 dark:text-slate-100">

            {/* Back Link */}
            <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
                <ArrowLeft size={16} />
                Back to Users
            </Link>

            {/* Identity Strip */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <User size={28} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-[24px] font-semibold text-slate-900 dark:text-white">{user.name}</h1>
                                <StatusBadge status={user.status} />
                            </div>
                            <p className="text-[13px] font-mono text-slate-500">{user.id}</p>
                            <div className="flex items-center gap-4 mt-3 text-[13px] text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1.5"><Mail size={14} /> {user.email}</span>
                                <span className="flex items-center gap-1.5"><Phone size={14} /> {user.phone}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <RoleBadge role={user.role} />
                        {user.team && (
                            <p className="text-[13px] text-slate-500 mt-2">Team: {user.team}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* Controls Panel */}
                <div className="col-span-12 lg:col-span-5 space-y-5">

                    {/* Role & Team Controls */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Role & Team Assignment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">Current Role</label>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">{user.role}</span>
                                    <button
                                        onClick={() => { setSelectedRole(user.role); setShowRoleModal(true); }}
                                        className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">Current Team</label>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                    <span className="text-[14px] font-medium text-slate-800 dark:text-slate-200">{user.team || 'No team'}</span>
                                    <button
                                        onClick={() => { setSelectedTeam(user.team); setSelectedManager(user.manager); setShowTeamModal(true); }}
                                        className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>
                            {user.manager && (
                                <div>
                                    <label className="block text-[12px] font-medium text-slate-500 mb-1">Reporting Manager</label>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="text-[14px] text-slate-800 dark:text-slate-200">{user.manager}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lifecycle Controls */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Account Controls</h3>
                        <div className="space-y-3">
                            <button
                                onClick={handleToggleStatus}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${user.status === 'Active'
                                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                    }`}
                            >
                                {user.status === 'Active' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                {user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                            </button>
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-medium opacity-50 cursor-not-allowed"
                                title="Backend integration required"
                            >
                                <RefreshCw size={18} />
                                Reset Password
                            </button>
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg font-medium opacity-50 cursor-not-allowed"
                                title="Backend integration required"
                            >
                                <LogOut size={18} />
                                Force Logout
                            </button>
                            <p className="text-[11px] text-slate-400 text-center">Some features require backend integration</p>
                        </div>
                    </div>
                </div>

                {/* Assignment History */}
                <div className="col-span-12 lg:col-span-7">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Assignment History</h3>
                        <div className="space-y-4">
                            {user.assignmentHistory.map((entry, i) => (
                                <div key={i} className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 last:pb-0">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                        <Clock size={14} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] text-slate-700 dark:text-slate-300">{entry.change}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">{entry.date} by {entry.by}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-5">
                        <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white mb-4">Account Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-[13px]">
                            <div>
                                <span className="text-slate-500">Created</span>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{user.createdAt}</p>
                            </div>
                            <div>
                                <span className="text-slate-500">Last Login</span>
                                <p className="font-medium text-slate-800 dark:text-slate-200">{user.lastLogin}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deactivate/Activate Modal */}
            {showDeactivateModal && (
                <ConfirmModal
                    title={user.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                    message={`Are you sure you want to ${user.status === 'Active' ? 'deactivate' : 'activate'} ${user.name}?`}
                    confirmLabel={user.status === 'Active' ? 'Deactivate' : 'Activate'}
                    confirmColor={user.status === 'Active' ? 'red' : 'emerald'}
                    onConfirm={confirmToggleStatus}
                    onCancel={() => setShowDeactivateModal(false)}
                />
            )}

            {/* Role Change Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRoleModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">Change Role</h3>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800 mb-4"
                        >
                            <option value="Sales Executive">Sales Executive</option>
                            <option value="Manager">Manager</option>
                            <option value="MD">Managing Director</option>
                            <option value="Purchase">Purchase</option>
                        </select>
                        <div className="flex gap-3">
                            <button onClick={() => setShowRoleModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                            <button onClick={confirmRoleChange} className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Change Modal */}
            {showTeamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTeamModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-4">Change Team</h3>
                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">Team</label>
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                                >
                                    <option value="">No team</option>
                                    <option value="Sales Alpha">Sales Alpha</option>
                                    <option value="Sales Bravo">Sales Bravo</option>
                                    <option value="Sales Charlie">Sales Charlie</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-slate-500 mb-1">Manager</label>
                                <select
                                    value={selectedManager}
                                    onChange={(e) => setSelectedManager(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-[14px] bg-white dark:bg-slate-800"
                                >
                                    <option value="">No manager</option>
                                    <option value="Mike Brown">Mike Brown</option>
                                    <option value="James Wilson">James Wilson</option>
                                    <option value="Sarah Thompson">Sarah Thompson</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowTeamModal(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-medium">Cancel</button>
                            <button onClick={confirmTeamChange} className="flex-1 px-4 py-2.5 bg-indigo-500 text-white rounded-lg font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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

function RoleBadge({ role }) {
    const colors = {
        'Sales Executive': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Manager': 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'MD': 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        'Purchase': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    };

    return (
        <span className={`inline-flex px-2.5 py-1 rounded text-[12px] font-medium ${colors[role] || 'bg-slate-100 text-slate-600'}`}>
            {role}
        </span>
    );
}

function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel }) {
    const colorClasses = {
        red: 'bg-red-500 hover:bg-red-600',
        emerald: 'bg-emerald-500 hover:bg-emerald-600',
        indigo: 'bg-indigo-500 hover:bg-indigo-600'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md">
                <h3 className="text-[18px] font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
                <p className="text-[14px] text-slate-600 dark:text-slate-400 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium">Cancel</button>
                    <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium ${colorClasses[confirmColor]}`}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="mx-auto max-w-[1100px] space-y-6 animate-pulse">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-[130px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-5 space-y-5">
                    <div className="h-[200px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-[180px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
                <div className="col-span-7 h-[300px] bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
        </div>
    );
}
