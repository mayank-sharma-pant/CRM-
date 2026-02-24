'use client';

import { useState } from 'react';
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

import { getLeadById } from '../../../lib/adapters/leads-adapter';

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLead() {
      if (!params.id) return;
      setLoading(true);
      try {
        const data = await getLeadById(params.id);
        if (data) {
          // Map string icon names to components if needed, or update Page to handle string icons
          // For simplicity, treating icons as components requires a map.
          // The adapter returns strings for icons. Page expects components?
          // Page uses `item.icon: FileText` (imported component) in static data.
          // Adapter returns "FileText" string.
          // I need to map it.
          setLead(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [params.id]);

  if (loading) return <div className="p-8 flex justify-center text-slate-500">Loading lead details...</div>;
  if (!lead) return <div className="p-8 flex justify-center text-slate-500">Lead not found</div>;

  const LEAD_DATA = lead; // Alias for minimal code change

  // Icon mapper helper
  const getIcon = (iconName) => {
    switch (iconName) {
      case 'FileText': return FileText;
      case 'History': return History;
      case 'CheckSquare': return CheckSquare;
      case 'Mail': return Mail;
      case 'PlusCircle': return PlusCircle;
      default: return FileText;
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-full font-sans text-slate-900 dark:text-slate-100 pb-12">

      {/* --- PAGE HEADER --- */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 px-6 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/sales/leads')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {LEAD_DATA.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 uppercase tracking-wide border border-slate-200 dark:border-slate-600">
                  Lead
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">
                  {LEAD_DATA.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 size={12} /> {LEAD_DATA.company}
                </span>
                <span>•</span>
                <span>{LEAD_DATA.title}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
              Update Status
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors">
              Convert to Client
            </button>
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
              {LEAD_DATA.timeline.map((item) => (
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
                <span className="text-blue-600 hover:underline cursor-pointer truncate">{LEAD_DATA.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={14} className="text-slate-400 w-4" />
                <span className="text-slate-700 dark:text-slate-300">{LEAD_DATA.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase size={14} className="text-slate-400 w-4" />
                <span className="text-slate-700 dark:text-slate-300">{LEAD_DATA.source}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs">
                <span className="text-slate-500">Assignee</span>
                <span className="font-medium text-slate-900 dark:text-white">{LEAD_DATA.assignee}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Tasks */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pending Tasks</h2>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{LEAD_DATA.tasks.filter(t => t.status === 'Open').length} Open</span>
            </div>
            <div className="space-y-1">
              {LEAD_DATA.tasks.map((task) => (
                <div key={task.id} className="group p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center ${task.status === 'Completed' ? 'bg-slate-200 border-slate-300' : 'border-slate-300 dark:border-slate-500'}`}>
                      {task.status === 'Completed' && <CheckSquare size={10} className="text-slate-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                        {task.title}
                      </p>
                      {task.status === 'Open' && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] ${task.due === 'Tomorrow' ? 'text-amber-600' : 'text-slate-400'} flex items-center gap-1`}>
                            <Clock size={10} /> {task.due}
                          </span>
                          <span className="text-[10px] text-slate-400">• {task.assignee}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 mt-2 text-xs font-medium text-slate-500 hover:text-blue-600 dashed border border-slate-200 rounded hover:border-blue-200 transition-all flex items-center justify-center gap-2">
                <PlusCircle size={12} /> Add Task
              </button>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Recent Notes</h2>
              <button className="text-xs text-blue-600 hover:underline">Add Note</button>
            </div>
            <div className="space-y-4">
              {LEAD_DATA.notes.map((note) => (
                <div key={note.id} className="text-xs">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-slate-400">{note.author}</span>
                    <span className="text-slate-400">{note.date}</span>
                  </div>
                </div>
              ))}
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
                    <span className="block text-[10px] text-slate-400 uppercase">Location</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{LEAD_DATA.location}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Industry</span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{LEAD_DATA.industry}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase">Internal Ref</span>
                    <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{LEAD_DATA.internal_ref}</span>
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
