'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../services/api';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Clock,
  FileText,
  MoreHorizontal,
  Trash2,
  CheckCircle2,
  X,
  Edit2,
  Plus,
  Briefcase
} from 'lucide-react';

const statusConfig = {
  New: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  Contacted: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
  'Follow-up': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  Converted: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  Lost: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
};

// Motion Variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemAnim = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function LeadDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const fetchLeadData = async () => {
    try {
      const [leadRes, notesRes, followUpsRes] = await Promise.all([
        api.get(`/leads/${id}`),
        api.get(`/notes/lead/${id}`).catch(() => ({ data: [] })), // Handle potential empty/404
        api.get('/follow-ups', { params: { date: '' } }).catch(() => ({ data: [] })),
      ]);

      setLead(leadRes.data);
      setNotes(notesRes.data || []);
      setFollowUps(followUpsRes.data ? followUpsRes.data.filter((fu) => fu.lead_id == id) : []);
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
      // router.push('/leads'); // Don't redirect immediately on error for now, clearer debugging
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      setLead({ ...lead, status: newStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      router.push('/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const timelineItems = useMemo(() => {
    const combined = [
      ...notes.map(n => ({ ...n, type: 'note', date: new Date(n.created_at) })),
      ...followUps.map(f => ({ ...f, type: 'followup', date: new Date(f.scheduled_date) }))
    ];
    return combined.sort((a, b) => b.date - a.date);
  }, [notes, followUps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-[#0B1120]">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) return <div className="p-8 text-center text-slate-500">Lead not found</div>;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="min-h-screen bg-slate-50 dark:bg-[#0B1120] pb-20 font-sans text-slate-900 dark:text-slate-100"
    >
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Back Button */}
        <motion.button
          variants={itemAnim}
          onClick={() => router.push('/leads')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 uppercase tracking-wider"
        >
          <ArrowLeft size={14} /> Back to Leads
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ================= LEFT ZONE: STORY (2/3) ================= */}
          <div className="lg:col-span-2 space-y-8">

            {/* 1. Identity Header */}
            <motion.div variants={itemAnim} className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{lead.name}</h1>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Briefcase size={14} /> {lead.service_type || 'General Lead'}
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} /> {lead.email}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} /> {lead.phone}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide
                       ${statusConfig[lead.status]?.bg || 'bg-gray-100'} 
                       ${statusConfig[lead.status]?.text || 'text-gray-600'} 
                       ${statusConfig[lead.status]?.border || 'border-gray-200'}`}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* 2. Timeline / Activity */}
            <motion.div variants={itemAnim} className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-slate-400" /> Activity Timeline
                </h2>
                <button onClick={() => setShowNoteModal(true)} className="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-wide">
                  + Add Note
                </button>
              </div>

              <div className="relative pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-8 ml-2">
                {timelineItems.length === 0 ? (
                  <div className="pl-6 py-8 text-slate-400 text-sm italic">
                    No history yet. Start by adding a note or scheduling a follow-up.
                  </div>
                ) : (
                  timelineItems.map((item, idx) => (
                    <div key={`${item.type}-${item.id}`} className="relative pl-6 group">
                      {/* Dot */}
                      <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-[#0F172A] 
                             ${item.type === 'note' ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                      />

                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {item.type === 'note' ? 'Note Added' : 'Follow-up Scheduled'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.created_at ? format(new Date(item.created_at), 'MMM d, h:mm a') : 'Just now'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
                        {item.type === 'note' ? (
                          <>
                            <p className="whitespace-pre-wrap">{item.content}</p>
                            <div className="mt-2 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditingNote(item)} className="text-xs text-indigo-500 hover:underline">Edit</button>
                              <button onClick={async () => {
                                if (window.confirm('Delete note?')) {
                                  await api.delete(`/notes/${item.id}`);
                                  fetchLeadData();
                                }
                              }} className="text-xs text-red-500 hover:underline">Delete</button>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Calendar size={12} className="text-emerald-500" />
                              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                {format(new Date(item.scheduled_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {item.notes && <p className="italic text-slate-500">{item.notes}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* ================= RIGHT ZONE: CONTROL (1/3) ================= */}
          <div className="space-y-6">

            {/* Actions Card */}
            <motion.div variants={itemAnim} className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-all font-semibold text-sm shadow-sm"
                >
                  <FileText size={16} /> Add Note
                </button>
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
                >
                  <Calendar size={16} /> Schedule Task
                </button>
              </div>
            </motion.div>

            {/* Status Control */}
            <motion.div variants={itemAnim} className="bg-white dark:bg-[#0F172A] rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Lead Status</h3>
              <div className="relative">
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
            </motion.div>

            {/* Meta Info */}
            <motion.div variants={itemAnim} className="bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Metadata</h3>
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{lead.source || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created On</span>
                  <span>{lead.created_at ? format(new Date(lead.created_at), 'MMM d, yyyy') : 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead ID</span>
                  <span className="font-mono">#{lead.id}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleDelete} className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-colors">
                  <Trash2 size={14} /> Delete Lead
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNoteModal && (
          <NoteModal leadId={id} onClose={() => setShowNoteModal(false)} onSuccess={() => { setShowNoteModal(false); fetchLeadData(); }} />
        )}
        {editingNote && (
          <NoteModal leadId={id} note={editingNote} onClose={() => setEditingNote(null)} onSuccess={() => { setEditingNote(null); fetchLeadData(); }} />
        )}
        {showFollowUpModal && (
          <FollowUpModal leadId={id} onClose={() => setShowFollowUpModal(false)} onSuccess={() => { setShowFollowUpModal(false); fetchLeadData(); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Minimal Components for Modals
function NoteModal({ leadId, note, onClose, onSuccess }) {
  const [content, setContent] = useState(note?.content || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (note) await api.put(`/notes/${note.id}`, { content });
      else await api.post('/notes', { leadId, content });
      onSuccess();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-[#0F172A] p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{note ? 'Edit Note' : 'Add Note'}</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
            rows={4}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Enter details..."
            required
          />
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FollowUpModal({ leadId, onClose, onSuccess }) {
  const [form, setForm] = useState({ scheduledDate: '', scheduledTime: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/follow-ups', { leadId, ...form });
      onSuccess();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-[#0F172A] p-6 rounded-xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Schedule Follow-up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
              <input type="date" required className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
              <input type="time" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
            <textarea className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm">
              {loading ? 'Schedule' : 'Schedule'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

