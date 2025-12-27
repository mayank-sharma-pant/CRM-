import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';

const statusColors = {
  New: 'bg-blue-50 text-blue-700 border-blue-200',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  'Follow-up': 'bg-purple-50 text-purple-700 border-purple-200',
  Converted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Lost: 'bg-rose-50 text-rose-700 border-rose-200',
};

const actionIcons = {
  note: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  delete: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        api.get(`/notes/lead/${id}`),
        api.get('/follow-ups', { params: { date: '' } }),
      ]);

      setLead(leadRes.data);
      setNotes(notesRes.data);
      setFollowUps(followUpsRes.data.filter((fu) => fu.lead_id === id));
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
      navigate('/leads');
    } finally {
      // Add a slight delay for smooth entry animation
      setTimeout(() => setLoading(false), 300);
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
      navigate('/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  // Combine and sort timeline items
  const timelineItems = useMemo(() => {
    const combined = [
      ...notes.map(n => ({ ...n, type: 'note', date: new Date(n.created_at) })),
      ...followUps.map(f => ({ ...f, type: 'followup', date: new Date(f.scheduled_date) })) // Use scheduled date for positioning? Or created_at? Typically history uses created_at, but planned items are future. Let's use created_at for history logic if available, but followups might strictly be future. 
      // User request: "Tell a timeline". 
      // Notes are past. Follow-ups are usually future or past.
      // Let's stick to a simple unified list sorted by relevance (Date desc).
    ];
    // Sort by date descending
    return combined.sort((a, b) => b.date - a.date);
  }, [notes, followUps]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!lead) return <div>Lead not found</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Detail Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">

        {/* Header Section */}
        <div className="mb-8 pl-1">
          <button
            onClick={() => navigate('/leads')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium mb-4 flex items-center transition-colors"
          >
            <span className="mr-1">←</span> Back to Leads
          </button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
                {lead.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-600 text-sm">
                {lead.email && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {lead.phone}
                  </span>
                )}
                <span className="flex items-center text-slate-400">
                  <svg className="w-4 h-4 mr-2 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Added {format(new Date(lead.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="hidden md:block">
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold border ${statusColors[lead.status]}`}>
                {lead.status}
              </span>
            </div>
          </div>
        </div>

        {/* Two-Zone Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT ZONE: Lead Story & Timeline */}
          <div className="lg:col-span-2 space-y-8">

            {/* Timeline Section */}
            <section className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-slate-900">Activity Timeline</h2>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Recent updates</div>
              </div>

              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                {timelineItems.length === 0 ? (
                  <div className="ml-8 py-4">
                    <p className="text-slate-500 italic">No activity recorded yet.</p>
                    <button onClick={() => setShowNoteModal(true)} className="mt-2 text-blue-600 text-sm font-medium hover:underline">
                      Add a note to start the story
                    </button>
                  </div>
                ) : (
                  timelineItems.map((item, index) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="relative ml-8 animate-staggered-fade"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[41px] top-1 h-5 w-5 rounded-full border-4 border-white ring-1 flex items-center justify-center
                        ${item.type === 'note' ? 'bg-blue-500 ring-blue-100' : 'bg-purple-500 ring-purple-100'}`}
                      >
                      </span>

                      {/* Content */}
                      <div className="group">
                        <div className="flex items-baseline justify-between mb-1">
                          <h3 className={`text-sm font-semibold ${item.type === 'note' ? 'text-slate-800' : 'text-slate-800'}`}>
                            {item.type === 'note' ? 'Note Added' : 'Follow-up Scheduled'}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {format(new Date(item.created_at || item.scheduled_date), 'MMM d, h:mm a')}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 group-hover:border-slate-200 transition-colors">
                          {item.type === 'note' ? (
                            <>
                              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{item.content}</p>
                              <div className="mt-3 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingNote(item)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Edit</button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Delete this note?')) {
                                      try {
                                        await api.delete(`/notes/${item.id}`);
                                        fetchLeadData();
                                      } catch (error) { console.error(error); }
                                    }
                                  }}
                                  className="text-xs font-medium text-rose-600 hover:text-rose-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          ) : (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                                  {format(new Date(item.scheduled_date), 'MMM d, yyyy')}
                                  {item.scheduled_time && ` at ${item.scheduled_time}`}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded font-medium 
                                    ${item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    item.status === 'Missed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {item.status}
                                </span>
                              </div>
                              {item.notes && <p className="text-slate-600 text-sm">{item.notes}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* RIGHT ZONE: Control Panel */}
          <div className="space-y-6">

            {/* Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Current Status</h3>
              <div className="relative">
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={`nav-select w-full appearance-none px-4 py-3 rounded-lg border-0 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-blue-600 text-sm font-medium bg-white cursor-pointer transition-shadow
                      ${statusColors[lead.status]} bg-opacity-10 text-opacity-100`}
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all active:scale-[0.98] text-sm font-medium shadow-md shadow-slate-200"
                >
                  {actionIcons.note}
                  Add Note
                </button>
                <button
                  onClick={() => setShowFollowUpModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  {actionIcons.calendar}
                  Schedule Follow-up
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-sm font-medium opacity-80 hover:opacity-100"
                >
                  {actionIcons.delete}
                  Delete Lead
                </button>
              </div>
            </div>

            {/* Meta Info */}
            <div className="bg-transparent p-4 rounded-xl border border-transparent">
              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex justify-between">
                  <span>ID</span>
                  <span className="font-mono text-slate-700">#{lead.id.toString().padStart(4, '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span className="font-medium text-slate-700">{lead.source}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service</span>
                  <span className="font-medium text-slate-700">{lead.service_type}</span>
                </div>
                {lead.updated_at && (
                  <div className="flex justify-between">
                    <span>Last Updated</span>
                    <span>{format(new Date(lead.updated_at), 'MMM d')}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <NoteModal
          leadId={id}
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => {
            setShowNoteModal(false);
            fetchLeadData();
          }}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <NoteModal
          leadId={id}
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSuccess={() => {
            setEditingNote(null);
            fetchLeadData();
          }}
        />
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && (
        <FollowUpModal
          leadId={id}
          onClose={() => setShowFollowUpModal(false)}
          onSuccess={() => {
            setShowFollowUpModal(false);
            fetchLeadData();
          }}
        />
      )}
    </div>
  );
}

// Modals remain largely the same visually but with slight cleanup if needed
function NoteModal({ leadId, note, onClose, onSuccess }) {
  const [content, setContent] = useState(note?.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (note) {
        await api.put(`/notes/${note.id}`, { content });
      } else {
        await api.post('/notes', { leadId, content });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{note ? 'Edit Note' : 'Add Note'}</h2>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Content</label>
            <textarea
              required
              rows={5}
              className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium">
              {loading ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FollowUpModal({ leadId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/follow-ups', { leadId, ...formData });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create follow-up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Schedule Follow-up</h2>
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                name="scheduledDate"
                required
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                value={formData.scheduledDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Time</label>
              <input
                type="time"
                name="scheduledTime"
                className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                value={formData.scheduledTime}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              name="notes"
              className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
              placeholder="What is this follow-up about?"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium">
              {loading ? 'Schedule' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


