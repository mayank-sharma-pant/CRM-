'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  CheckSquare,
  Clock,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  PlusCircle,
  History,
  Briefcase
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import api from '../../../../services/api';

// --- ROBUST MOCK DATA ---
const LEAD_DATA = {
  id: 101,
  name: 'Sarah Miller',
  title: 'VP of Engineering',
  company: 'TechFlow Inc.',
  status: 'Contacted',
  email: 'sarah.m@techflow.io',
  phone: '+1 (415) 555-0123',
  source: 'LinkedIn Campaign',
  assignee: 'Alex Johnson (Self)',
  location: 'San Francisco, CA',
  industry: 'SaaS / DevTools',
  internal_ref: 'L-2024-882',

  tasks: [
    { id: 1, title: 'Send technical requirements doc', status: 'Open', due: 'Tomorrow', assignee: 'Self' },
    { id: 2, title: 'Schedule follow-up demo', status: 'Open', due: 'Jan 12', assignee: 'Manager' },
    { id: 3, title: 'Initial outreach', status: 'Completed', due: 'Dec 20', assignee: 'Self' },
  ],

  notes: [
    { id: 1, content: 'She is looking for a solution that supports SSO.', date: '2 days ago', author: 'Alex Johnson' },
    { id: 2, content: 'Budget approval happens in Q1.', date: '1 week ago', author: 'Alex Johnson' },
  ],

  timeline: [
    { id: 1, type: 'note', title: 'Note added', description: 'Interested in the Enterprise plan for 50+ seats.', timestamp: '2 hours ago', icon: FileText, color: 'text-amber-600 bg-amber-100' },
    { id: 2, type: 'status', title: 'Status changed', description: 'Moved to "Contacted"', timestamp: 'Yesterday', icon: History, color: 'text-blue-600 bg-blue-100' },
    { id: 3, type: 'task', title: 'Task completed', description: 'Initial outreach call', timestamp: 'Yesterday', icon: CheckSquare, color: 'text-emerald-600 bg-emerald-100' },
    { id: 4, type: 'email', title: 'Email sent', description: 'Follow-up with pricing deck', timestamp: '3 days ago', icon: Mail, color: 'text-slate-600 bg-slate-100' },
    { id: 5, type: 'creation', title: 'Lead created', description: 'Imported from LinkedIn', timestamp: '5 days ago', icon: PlusCircle, color: 'text-violet-600 bg-violet-100' },
  ]
};

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadData();
  }, [id]);

  const fetchLeadData = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      const data = res.data;

      // Determine role from path (same as before)
      const isManager = window.location.pathname.startsWith('/manager');

      // Map permissions
      data.permissions = {
        canEdit: !isManager,
        canConvert: !isManager,
        canAddTask: !isManager,
        canAddNote: !isManager,
        canReassign: isManager
      };

      // Construct a simple timeline from tasks and notes
      const timeline = [
        {
          id: 'creation',
          type: 'creation',
          title: 'Lead Created',
          description: `Lead added to the system`,
          timestamp: data.created_at,
          icon: PlusCircle,
          color: 'text-violet-600 bg-violet-100'
        }
      ];

      if (data.notes_list) {
        data.notes_list.forEach(note => {
          timeline.push({
            id: `note-${note.id}`,
            type: 'note',
            title: 'Note Added',
            description: note.content,
            timestamp: note.created_at,
            icon: FileText,
            color: 'text-amber-600 bg-amber-100'
          });
        });
      }

      if (data.tasks) {
        data.tasks.forEach(task => {
          if (task.status === 'Completed') {
            timeline.push({
              id: `task-${task.id}`,
              type: 'task',
              title: 'Task Completed',
              description: task.title,
              timestamp: task.updated_at || new Date().toISOString(), // Fallback
              icon: CheckSquare,
              color: 'text-emerald-600 bg-emerald-100'
            });
          }
        });
      }

      // Sort timeline by date desc
      data.timeline = timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Format timestamps for display
      data.timeline = data.timeline.map(item => ({
        ...item,
        timestamp: formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })
      }));

      setLead(data);
    } catch (err) {
      console.error("Failed to fetch lead", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/leads/${id}`, { status: newStatus });
      fetchLeadData();
    } catch (err) {
      console.error("Update status failed", err);
    }
  };

  const handleConvert = async () => {
    if (!window.confirm("Convert this lead to a formal client?")) return;
    try {
      // Assuming a generic create client from lead info since no specific convert endpoint
      await api.post('/clients', null, {
        params: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company
        }
      });
      await api.put(`/leads/${id}`, { status: 'Converted' });
      alert("Converted successfully!");
      router.push('/sales/clients');
    } catch (err) {
      console.error("Conversion failed", err);
    }
  };

  const handleAddNote = async () => {
    const content = window.prompt("Enter note content:");
    if (!content) return;
    try {
      await api.post(`/leads/${id}/notes`, null, { params: { content } });
      fetchLeadData();
    } catch (err) {
      console.error("Add note failed", err);
    }
  };

  if (!lead) return <div className="p-6">Loading...</div>;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100 pb-12">

      {/* --- PAGE HEADER --- */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(window.location.pathname.startsWith('/manager') ? '/manager/leads' : '/sales/leads')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {lead.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-600">
                  Lead
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">
                  {lead.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 size={12} /> {lead.company}
                </span>
                <span>•</span>
                <span>{lead.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lead.permissions?.canReassign && (
              <button className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                Reassign Owner
              </button>
            )}
            {lead.permissions?.canEdit && (
              <div className="relative group">
                <button className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                  Update Status <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-30 overflow-hidden">
                  {['New', 'Contacted', 'Qualified', 'Proposal', 'Lost'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(status)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {lead.permissions?.canConvert && (
              <button
                onClick={handleConvert}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
              >
                Convert to Client
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* --- LEFT COLUMN: CORE ACTIVITY (7 cols) --- */}
        <div className="lg:col-span-7 space-y-6">

          {/* Section 2: Activity Timeline */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <History size={16} className="text-slate-400" />
              Activity History
            </h2>

            <div className="relative space-y-8 pl-3 border-l-2 border-slate-100 dark:border-slate-700 ml-2">
              {lead.timeline.map((item) => (
                <div key={item.id} className="relative pl-6 group">
                  <div className={`
                          absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 
                          ${item.color.replace('text-', 'bg-')} ring-1 ring-slate-100 dark:ring-slate-700
                       `}></div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}

              <div className="relative pl-6">
                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <p className="text-[10px] text-slate-400 italic">Start of timeline</p>
              </div>
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN: CONTEXT & TASKS (5 cols) --- */}
        <div className="lg:col-span-5 space-y-6">

          {/* Section 1: Lead Overview (Compact) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Lead Overview</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={14} className="text-slate-400 w-4" />
                <span className="text-blue-600 hover:underline cursor-pointer truncate">{lead.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={14} className="text-slate-400 w-4" />
                <span className="text-slate-700 dark:text-slate-300">{lead.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase size={14} className="text-slate-400 w-4" />
                <span className="text-slate-700 dark:text-slate-300">{lead.source}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">Assignee</span>
                <span className="font-medium text-slate-900 dark:text-white">{lead.assignee}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pending Tasks</h2>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{lead.tasks.filter(t => t.status === 'Open').length} Open</span>
            </div>
            <div className="space-y-1">
              {lead.tasks.map((task) => (
                <div key={task.id} className="group p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center ${task.status === 'Completed' ? 'bg-slate-200 border-slate-300' : 'border-slate-300 dark:border-slate-500'}`}>
                      {task.status === 'Completed' && <CheckSquare size={10} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                        {task.title}
                      </p>
                      {task.status === 'Open' || task.status === 'Pending' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] ${task.due_date ? 'text-amber-600' : 'text-slate-400'} flex items-center gap-1`}>
                            <Clock size={10} /> {task.due_date ? formatDistanceToNow(parseISO(task.due_date), { addSuffix: true }) : 'No date'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {lead.permissions?.canAddTask && (
                <button className="w-full py-2 mt-2 text-xs font-medium text-slate-500 hover:text-blue-600 dashed border border-slate-200 rounded hover:border-blue-200 transition-all flex items-center justify-center gap-2">
                  <PlusCircle size={12} /> Add Task
                </button>
              )}
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recent Notes</h2>
              {lead.permissions?.canAddNote && (
                <button onClick={handleAddNote} className="text-xs text-blue-600 hover:underline">Add Note</button>
              )}
            </div>
            <div className="space-y-4">
              {lead.notes_list?.map((note) => (
                <div key={note.id} className="text-xs">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-slate-400">{note.created_by_name || 'System'}</span>
                    <span className="text-slate-400">{formatDistanceToNow(parseISO(note.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              ))}
              {(!lead.notes_list || lead.notes_list.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No notes yet.</p>
              )}
            </div>
          </div>

          {/* Section 5: Lead Details (Collapsible) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <button
              onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Full Details</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDetailsOpen && (
              <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-700/50 animate-in slide-in-from-top-1">
                <div className="space-y-3 pt-3">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Lead Source</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{lead.source || 'Direct'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Service Interested In</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{lead.service_type || 'General Inquiry'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Created On</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
