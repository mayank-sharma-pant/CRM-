'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { 
    User, 
    Mail, 
    Phone, 
    Shield, 
    Building, 
    Key, 
    AlertCircle, 
    CheckCircle,
    Loader2
} from 'lucide-react';

export default function ProfilePage() {
    const { user, fetchUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Password change state
    const [pwData, setPwData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (pwData.new_password !== pwData.confirm_password) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        
        setLoading(true);
        setMessage({ type: '', text: '' });
        
        try {
            await api.post('/auth/change-password', {
                current_password: pwData.current_password,
                new_password: pwData.new_password
            });
            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPwData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            setMessage({ 
                type: 'error', 
                text: err?.response?.data?.detail || 'Failed to update password' 
            });
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-primary">User Profile</h1>
                <p className="text-secondary">Manage your account settings and security</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Info */}
                <div className="md:col-span-2 space-y-6">
                    <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                <User size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary">{user.full_name}</h2>
                                <p className="text-sm text-muted capitalize">{user.role}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Mail size={12} /> Email Address
                                </label>
                                <p className="text-secondary font-medium">{user.email}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Phone size={12} /> Phone Number
                                </label>
                                <p className="text-secondary font-medium">{user.phone || 'Not provided'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Shield size={12} /> Role
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs font-bold uppercase tracking-tight">
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Building size={12} /> Company ID
                                </label>
                                <p className="text-secondary font-medium">{user.company_id || 'Platform Admin'}</p>
                            </div>
                        </div>
                    </section>

                    {/* Security / Password */}
                    <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Key size={20} className="text-primary" />
                            <h2 className="text-lg font-semibold text-primary">Security</h2>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            {message.text && (
                                <div className={`p-4 rounded-lg flex items-start gap-3 ${
                                    message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
                                }`}>
                                    {message.type === 'success' ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
                                    <p className="text-sm font-medium">{message.text}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={pwData.current_password}
                                    onChange={(e) => setPwData({...pwData, current_password: e.target.value})}
                                    className="w-full px-4 py-2 bg-page border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    value={pwData.new_password}
                                    onChange={(e) => setPwData({...pwData, new_password: e.target.value})}
                                    className="w-full px-4 py-2 bg-page border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none transition-all"
                                />
                                <p className="mt-1 text-xs text-muted">Must be at least 8 characters long.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={pwData.confirm_password}
                                    onChange={(e) => setPwData({...pwData, confirm_password: e.target.value})}
                                    className="w-full px-4 py-2 bg-page border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-page rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Change Password
                            </button>
                        </form>
                    </section>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-accent/5 border border-accent/10 rounded-xl p-6">
                        <h3 className="font-semibold text-primary mb-2">Need Help?</h3>
                        <p className="text-sm text-secondary mb-4">
                            If you're having trouble with your account or permissions, please contact your organization's admin.
                        </p>
                        <a href="mailto:support@perioxia.com" className="text-sm font-semibold text-accent hover:underline">
                            Contact Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
