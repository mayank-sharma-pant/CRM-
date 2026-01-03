'use client';

/**
 * LEAD DETAIL PAGE - Mature CRM Pattern
 * 
 * Pattern: HubSpot/Freshsales style
 * Layout: Header -> Engagement Strip -> Activity Composer -> Timeline
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { format, parseISO, formatDistanceToNow, isValid } from 'date-fns';
import api from '../../../services/api';
import {
  ArrowLeft,
  Plus,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  FileText,
  Calendar,
  ChevronRight,
  User,
  Building2,
  MoreHorizontal
} from 'lucide-react';

const ACTIVITY_TYPES = {
  NOTE: 'note',
  CALL: 'call',
  EMAIL: 'email',
  TASK: 'task',
  STATUS: 'status'
};

const STATUS_STYLES = {
  'New': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  'Contacted': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'Qualified': 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  'Converted': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'Lost': 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700'
};

export default function LeadDetail() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id;

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Note'); // Composer tab

  useEffect(() => {
    if (leadId) fetchLeadData();
  }, [leadId]);

  const fetchLeadData = async () => {
    try {
      const leadRes = await api.get(`/leads/${leadId}`);
      setLead(leadRes.data);

      // Mock Activities for demo
      setActivities([
        { id: 1, type: 'note', content: 'Met at conference, interested in enterprise plan.', timestamp: new Date().toISOString(), author: 'You' },
        { id: 2, type: 'email', content: 'Sent introductory brochure and pricing.', timestamp: new Date(Date.now() - 86400000).toISOString(), author: 'You' },
        { id: 3, type: 'status_change', content: 'Changed status to Qualified', timestamp: new Date(Date.now() - 172800000).toISOString(), author: 'System' },
        { id: 4, type: 'call', content: 'Discovery call - key requirement is SSO.', timestamp: new Date(Date.now() - 250000000).toISOString(), author: 'You' }
      ]);

      setTasks([
        { id: 1, title: 'Follow-up on proposal', dueDate: '2024-01-20', status: 'Pending' }
      ]);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  if (!lead) return <div className="p-8 text-center">Lead not found</div>;

  return (
    <>
      {/* 1. Header Area */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4">

          {/* Top Row: Nav & Actions */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.push('/leads')} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <ActionButton icon={FileText} label="Log Note" />
              <ActionButton icon={Phone} label="Log Call" />
              <ActionButton icon={Mail} label="Log Email" />
              <ActionButton icon={CheckCircle} label="Task" />
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
              <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors">
                Convert
              </button>
            </div>
          </div>

          {/* Identity Row */}
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 font-semibold text-lg">
                {lead.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{lead.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  {lead.company && (
                    <span className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Building2 size={12} /> {lead.company}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_STYLES[lead.status] || STATUS_STYLES.New}`}>
                    {lead.status === 'Qualified' ? 'Follow-up' : lead.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Contacted (Header context) */}
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Last Contacted</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {lead.last_contacted_at ? format(parseISO(lead.last_contacted_at), 'MMM d, h:mm a') : 'Not yet'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Engagement Summary Strip */}
      <div className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-8 overflow-x-auto">
          <SummaryItem label="Last Response" value={lead.last_response_at ? formatDistanceToNow(parseISO(lead.last_response_at), { addSuffix: true }) : 'No response'} icon={MessageSquare} />
          <SummaryItem label="Next Task" value={lead.next_task ? format(parseISO(lead.next_task), 'MMM d, yyyy') : 'None scheduled'} icon={Calendar} active={!!lead.next_task} />
          <SummaryItem label="Lead Source" value={lead.source || 'Direct'} icon={User} />
          <SummaryItem label="Owner" value="You" icon={User} />
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Timeline & Composer (2/3) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Activity Composer */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                {['Note', 'Call', 'Email'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${activeTab === tab ? 'text-blue-600 bg-white dark:bg-slate-700 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-3">
                <textarea
                  className="w-full text-sm text-slate-700 dark:text-slate-200 bg-transparent border-none focus:ring-0 placeholder:text-slate-400 resize-none"
                  rows={3}
                  placeholder={`Start typing a ${activeTab.toLowerCase()}...`}
                />
                <div className="flex justify-end mt-2">
                  <button className="px-3 py-1.5 bg-slate-900 dark:bg-slate-600 text-white text-xs font-medium rounded hover:bg-slate-800 transition-colors">
                    Save {activeTab}
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                Activity Timeline
                <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{activities.length}</span>
              </h3>
              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-0 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                {activities.map(activity => (
                  <TimelineItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Related Info (1/3) */}
          <div className="space-y-6">

            {/* Related Tasks Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Related Tasks</h3>
                <Link href="/tasks" className="text-xs text-blue-600 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {tasks.length > 0 ? tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                    <div className="mt-0.5 text-slate-400"><CheckCircle size={14} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{task.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} /> Due {format(parseISO(task.dueDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic">No open tasks.</p>
                )}
                <button className="w-full mt-2 py-1.5 text-xs text-slate-500 font-medium border border-dashed border-slate-300 rounded hover:border-slate-400 hover:text-slate-600 transition-colors">
                  + Add Task
                </button>
              </div>
            </div>

            {/* Info Card (Example) */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">About {lead.name}</h3>
              <div className="space-y-3 text-sm">
                <InfoRow label="Email" value={lead.email} />
                <InfoRow label="Phone" value={lead.phone} />
                <InfoRow label="Location" value="San Francisco, CA" />
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}

// Sub-components for cleaner file
function ActionButton({ icon: Icon, label }) {
  return (
    <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors" title={label}>
      <Icon size={16} />
    </button>
  );
}

function SummaryItem({ label, value, icon: Icon, active }) {
  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className={`p-1.5 rounded-md ${active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'} dark:bg-slate-700`}>
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <p className={`text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
      </div>
    </div>
  )
}

function TimelineItem({ activity }) {
  const isNote = activity.type === 'note';
  const isCall = activity.type === 'call';

  return (
    <div className="flex gap-4 relative">
      <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 z-10
                ${isNote ? 'bg-amber-100 text-amber-600' : isCall ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}
             `}>
        {isNote ? <FileText size={14} /> : isCall ? <Phone size={14} /> : <Mail size={14} />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{activity.author}</span>
          <span className="text-xs text-slate-400">• {formatDistanceToNow(parseISO(activity.timestamp), { addSuffix: true })}</span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-sm text-slate-600 dark:text-slate-300">
          {activity.content}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-700 dark:text-slate-200 font-medium truncate">{value || 'N/A'}</p>
    </div>
  )
}
