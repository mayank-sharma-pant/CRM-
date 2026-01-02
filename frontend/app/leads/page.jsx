'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { VARIANTS, TRANSITIONS } from '../../lib/motion';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Users
} from 'lucide-react';

// ===============================================
// STATUS CONFIGURATION (Badge Styles)
// ===============================================
const statusConfig = {
  New: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500'
  },
  Contacted: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-800',
    dot: 'bg-indigo-500'
  },
  'Follow-up': {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500'
  },
  Converted: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500'
  },
  Lost: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400'
  },
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowModal(true);
    }
    fetchLeads();
  }, [searchParams]);

  const fetchLeads = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const response = await api.get('/leads', { params });
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      setLeads(leads.filter(lead => lead.id !== id)); // Optimistic update
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead');
      fetchLeads(); // Revert on fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-page">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      variants={VARIANTS.page}
      initial="hidden"
      animate="show"
      exit="exit"
      className="min-h-screen bg-page flex flex-col font-sans text-primary"
    >

      {/* 1. COMPACT TOOLBAR HEADER */}
      <motion.div variants={VARIANTS.header} className="bg-card border-b border-subtle sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Leads
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                {leads.length}
              </span>
            </h1>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Quick Filters (Pill Style) */}
            <div className="flex items-center gap-1">
              {['all', 'new', 'warm'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${activeTab === tab
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                  {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Dense Search Input */}
            <div className="relative group flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 bg-card border border-subtle rounded-md text-sm font-medium text-secondary focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">Status: All</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-sm font-semibold shadow-sm hover:shadow-indigo-500/25 transition-all flex items-center gap-1.5"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Lead</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* 2. DENSE LIST VIEW */}
      <div className="flex-1 overflow-y-auto bg-page p-4 sm:p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 select-none">
            <div className="col-span-4 sm:col-span-3">Identity</div>
            <div className="col-span-4 hidden sm:block">Contact & Source</div>
            <div className="col-span-3 sm:col-span-2">Status</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {leads.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users size={24} />
              </div>
              <h3 className="text-slate-900 dark:text-white font-medium">No leads found</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Adjust filters or add a new lead.</p>
            </div>
          ) : (
            <motion.div variants={VARIANTS.container} initial="hidden" animate="show" className="space-y-2">
              <AnimatePresence mode="popLayout">
                {leads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    layout
                    variants={VARIANTS.row}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, height: 0 }}
                    className="group bg-card border border-master rounded-lg hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-indigo-900/10 transition-all p-3 grid grid-cols-12 gap-4 items-center relative overflow-hidden"
                  >
                    {/* Active Stripe */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Identity: Name + Job */}
                    <div className="col-span-4 sm:col-span-3 pl-2">
                      <Link href={`/leads/${lead.id}`} className="block font-semibold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {lead.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <Briefcase size={12} className="text-slate-400" />
                        <span className="truncate">{lead.service_type || "General"}</span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="hidden sm:col-span-4 sm:flex flex-col justify-center gap-1">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <Mail size={12} className="text-slate-400" /> {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                          <Phone size={12} className="text-slate-400" /> {lead.phone}
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="col-span-3 sm:col-span-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${statusConfig[lead.status]?.bg || 'bg-gray-100'} ${statusConfig[lead.status]?.text || 'text-gray-600'} ${statusConfig[lead.status]?.border || 'border-gray-200'} Uppercase tracking-wide`}>
                        {statusConfig[lead.status]?.dot && (
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig[lead.status].dot}`} />
                        )}
                        {lead.status}
                      </span>
                    </div>

                    {/* Action Area */}
                    <div className="col-span-3 text-right flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                        title="View Details"
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* MODAL (Preserved Logic, Updated UI) */}
      <AnimatePresence>
        {showModal && (
          <LeadModal
            onClose={() => {
              setShowModal(false);
              router.push('/leads');
            }}
            onSuccess={() => {
              setShowModal(false);
              fetchLeads();
              router.push('/leads');
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ===============================================
// MODAL COMPONENT
// ===============================================
function LeadModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: '',
    source: '',
    status: 'New',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/leads', formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={TRANSITIONS.heavy}
        className="bg-card border border-master rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">Add New Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
            <XCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Lead Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="e.g. Acme Corp"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Type</label>
                <input
                  type="text"
                  name="serviceType"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  value={formData.serviceType}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Status</label>
                <select
                  name="status"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Lead</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
