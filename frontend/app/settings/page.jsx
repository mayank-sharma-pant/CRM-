'use client';

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { VARIANTS, TRANSITIONS } from '../../lib/motion';
import {
  User,
  Building2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [userRes, businessRes] = await Promise.all([
        api.get('/settings/profile'),
        api.get('/settings/business'),
      ]);
      setUser(userRes.data);
      setBusiness(businessRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User, desc: 'Personal details' },
    { id: 'business', label: 'Business', icon: Building2, desc: 'Company info' },
    { id: 'password', label: 'Security', icon: Lock, desc: 'Password & Auth' },
  ];

  return (
    <motion.div
      variants={VARIANTS.page}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-page pb-20 font-sans text-primary"
    >

      {/* 1. Header (Stable) */}
      <motion.div variants={VARIANTS.header} className="border-b border-subtle bg-card sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <h1 className="text-lg font-bold text-primary tracking-tight">System Configuration</h1>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* 2. Navigation (Calm & Predictable) */}
          <motion.nav variants={VARIANTS.card} className="w-full md:w-64 flex-shrink-0 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3
                    ${isActive
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                >
                  <Icon size={18} className={isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500'} />
                  <div>
                    <div className="leading-none">{tab.label}</div>
                    <div className="text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </motion.nav>

          {/* 3. Main Content (Subtle Transitions) */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={VARIANTS.card}
                transition={TRANSITIONS.smooth}
              >
                {activeTab === 'profile' && <ProfileTab user={user} onUpdate={fetchSettings} />}
                {activeTab === 'business' && <BusinessTab business={business} onUpdate={fetchSettings} />}
                {activeTab === 'password' && <PasswordTab />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- SUB-COMPONENTS ---

function ProfileTab({ user, onUpdate }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await api.put('/settings/profile', { fullName });
      setStatus({ type: 'success', message: 'Saved successfully' });
      onUpdate();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.error || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-master shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-subtle bg-surface">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Personal Identity</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Email Address</label>
          <div className="flex items-center px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed select-none">
            {user?.email || 'email@example.com'}
            <Lock size={12} className="ml-auto opacity-50" />
          </div>
        </div>

        <div>
          <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Full Name</label>
          <input
            id="fullName"
            type="text"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors placeholder:text-slate-400"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="e.g. John Doe"
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
          {/* Feedback Area (Inline) */}
          <div className="flex-1 mr-4">
            {status.message && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-medium flex items-center gap-1.5
                  ${status.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.message}
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function BusinessTab({ business, onUpdate }) {
  const [formData, setFormData] = useState({
    name: business?.name || '',
    phone: business?.phone || '',
    address: business?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await api.put('/settings/business', formData);
      setStatus({ type: 'success', message: 'Settings saved' });
      onUpdate();
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.error || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-master shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-subtle bg-surface">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Business Info</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="b-name" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Company Name</label>
          <input
            id="b-name"
            type="text"
            name="name"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="e.g. Acme Corp"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="b-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Contact Phone</label>
            <input
              id="b-phone"
              type="tel"
              name="phone"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="b-address" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Office Address</label>
          <textarea
            id="b-address"
            name="address"
            rows={3}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address, city, state, zip"
          />
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
          {/* Feedback Area (Inline) */}
          <div className="flex-1 mr-4">
            {status.message && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-medium flex items-center gap-1.5
                  ${status.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.message}
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordTab() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (formData.newPassword !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Minimum 6 characters required' });
      return;
    }

    setLoading(true);

    try {
      await api.put('/settings/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setStatus({ type: 'success', message: 'Password updated' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.error || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-master shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-subtle bg-surface">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Credential Management</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="currentPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            name="currentPassword"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            value={formData.currentPassword}
            onChange={handleChange}
            required
            placeholder="••••••••"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="newPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">New Password</label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={formData.newPassword}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Min. 6 chars"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Confirm</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Repeat password"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-4">
          {/* Feedback Area (Inline) */}
          <div className="flex-1 mr-4">
            {status.message && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-medium flex items-center gap-1.5
                  ${status.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {status.message}
              </motion.div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            {loading ? 'Updating...' : 'Update Credentials'}
          </button>
        </div>
      </form>
    </div>
  );
}
