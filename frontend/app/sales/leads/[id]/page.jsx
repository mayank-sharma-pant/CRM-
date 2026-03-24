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
import TaskModal from '../../../../components/leads/TaskModal';
import NoteModal from '../../../../components/leads/NoteModal';
import ReassignModal from '../../../../components/leads/ReassignModal';
import DocumentsList from '../../../../components/documents/DocumentsList';

export default function LeadDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

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
        canEdit: !['Converted', 'Lost', 'Lost Client'].includes(data.status),
        canConvert: !['Converted', 'Lost', 'Lost Client'].includes(data.status),
        canAddTask: true,
        canAddNote: true,
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
              timestamp: task.updated_at || new Date().toISOString(),
              icon: CheckSquare,
              color: 'text-emerald-600 bg-emerald-100'
            });
          }
        });
      }

      // Fetch audit timeline events
      try {
        const timelineRes = await api.get(`/timeline/lead/${id}`);
        const events = timelineRes.data?.events || [];
        events.forEach(ev => {
          if (ev.action === 'created') return;
          
          let actionLabel = ev.action;
          let desc = `by ${ev.admin_name || 'System'}`;
          let color = 'text-gray-600 bg-gray-100';
          
          if (ev.action === 'status_changed') {
            actionLabel = `Status: ${ev.before_value} → ${ev.after_value}`;
            color = 'text-blue-600 bg-blue-100';
          } else if (ev.action === 'converted') {
            actionLabel = 'Converted to Client';
            color = 'text-emerald-600 bg-emerald-100';
          } else if (ev.action === 'reassigned') {
            actionLabel = 'Owner Reassigned';
            desc = `${ev.before_value} → ${ev.after_value} (by ${ev.admin_name})`;
            color = 'text-purple-600 bg-purple-100';
          } else if (ev.action === 'updated') {
            actionLabel = ev.after_value || 'Lead Updated';
          } else if (ev.action === 'deleted') {
            actionLabel = 'Deleted';
            color = 'text-red-600 bg-red-100';
          }

          timeline.push({
            id: `audit-${ev.id}`,
            type: 'activity',
            title: actionLabel,
            description: desc,
            timestamp: ev.timestamp,
            icon: History,
            color: color
          });
        });
      } catch { /* timeline fetch is non-critical */ }

      // Sort timeline by date desc
      data.timeline = timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const safeFormatAgo = (isoStr) => {
        if (!isoStr) return '—';
        try {
          const d = parseISO(isoStr);
          return isNaN(d.getTime()) ? isoStr : formatDistanceToNow(d, { addSuffix: true });
        } catch {
          return isoStr;
        }
      };
      data.timeline = data.timeline.map(item => ({
        ...item,
        timestamp: safeFormatAgo(item.timestamp)
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

  const handleReassign = async (newOwnerId) => {
    try {
      await api.put(`/leads/${id}`, { assigned_to_id: newOwnerId });
      setIsReassignModalOpen(false);
      fetchLeadData();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reassign lead");
    }
  };

  const handleConvert = async () => {
    if (!window.confirm("Convert this lead to a formal client?")) return;
    try {
      await api.post('/clients', {
        name: lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        company: lead.company || null,
        address: null,
        converted_from_lead_id: parseInt(id),
        assigned_to_id: lead.assigned_to_id || null,
        team_id: lead.team_id || null,
      });
      await api.put(`/leads/${id}`, { status: 'Converted' });
      alert("Converted successfully!");
      router.push(window.location.pathname.startsWith('/manager') ? '/manager/clients' : '/sales/clients');
    } catch (err) {
      console.error("Conversion failed", err);
    }
  };

  const handleAddNote = () => {
    setIsNoteModalOpen(true);
  };

  const handleCreateTask = () => {
    setIsTaskModalOpen(true);
  };

  if (!lead) return <div className="p-6">Loading...</div>;

  return ( <>
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
              <button 
                onClick={() => setIsReassignModalOpen(true)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
               >
                Reassign Owner
              </button>
            )}
            {lead.permissions?.canEdit && (
              <div className="relative group">
                <button className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                  Update Status <ChevronDown size={14} />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-30 overflow-hidden">
                  {['New', 'Contacted', 'Qualified', 'Proposal', 'Lost', 'Lost Client'].map(status => (
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
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                {(lead.tasks || []).filter(t => t.status === 'Open').length} Open
              </span>
            </div>
            <div className="space-y-1">
              {(lead.tasks || []).filter(t => t.status !== 'Completed').map((task) => (
                <div key={task.id} className="group p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/tasks/${task.id}/complete`);
                          fetchLeadData();
                        } catch (err) { console.error(err); }
                      }}
                      title="Mark as completed"
                      className="mt-0.5 w-3.5 h-3.5 rounded border border-slate-300 dark:border-slate-500 hover:border-emerald-500 hover:bg-emerald-50 flex items-center justify-center transition-colors"
                    >
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-200">
                        {task.title}
                      </p>
                      {(task.status === 'Open' || task.status === 'Pending') && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] ${task.due_date ? 'text-amber-600' : 'text-slate-400'} flex items-center gap-1`}>
                            <Clock size={10} /> {task.due_date ? (() => { try { return formatDistanceToNow(parseISO(task.due_date), { addSuffix: true }); } catch { return task.due_date; } })() : 'No date'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(lead.tasks || []).filter(t => t.status !== 'Completed').length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3 italic">No pending tasks</p>
              )}
              {lead.permissions?.canAddTask && (
                <button onClick={async () => {
                  const title = window.prompt('Task title:');
                  if (!title) return;
                  const dueDate = window.prompt('Due date (YYYY-MM-DD):', new Date(Date.now() + 86400000).toISOString().split('T')[0]);
                  if (!dueDate) return;
                  try {
                    await api.post('/tasks', { title, lead_id: parseInt(id), due_date: dueDate, priority: 'medium' });
                    fetchLeadData();
                  } catch (err) { alert(err.response?.data?.detail || 'Failed to add task'); }
                }} className="w-full py-2 mt-2 text-xs font-medium text-slate-500 hover:text-blue-600 dashed border border-slate-200 rounded hover:border-blue-200 transition-all flex items-center justify-center gap-2">
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
                    <span className="text-slate-400">{note.created_at ? (() => { try { return formatDistanceToNow(parseISO(note.created_at), { addSuffix: true }); } catch { return note.created_at; } })() : '—'}</span>
                  </div>
                </div>
              ))}
              {(!lead.notes_list || lead.notes_list.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">No notes yet.</p>
              )}
            </div>
          </div>

          {/* Section: Documents */}
          <DocumentsList 
            entityType="lead" 
            entityId={id} 
            canDelete={true} 
            canUpload={true} 
          />

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
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  <TaskModal
    isOpen={isTaskModalOpen}
    onClose={() => setIsTaskModalOpen(false)}
    onRefresh={fetchLeadData}
    currentLeadId={id}
  />
  <NoteModal
    isOpen={isNoteModalOpen}
    onClose={() => setIsNoteModalOpen(false)}
    onRefresh={fetchLeadData}
    endpoint={`/leads/${id}/notes`}
  />
  <ReassignModal
    isOpen={isReassignModalOpen}
    onClose={() => setIsReassignModalOpen(false)}
    onReassign={handleReassign}
    currentAssigneeId={lead.assigned_to_id}
  />
  </> );
}
