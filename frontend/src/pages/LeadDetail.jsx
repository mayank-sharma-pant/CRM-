import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';

const statusColors = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  'Follow-up': 'bg-purple-100 text-purple-800',
  Converted: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
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
      // Filter follow-ups for this lead
      setFollowUps(followUpsRes.data.filter((fu) => fu.lead_id === id));
    } catch (error) {
      console.error('Failed to fetch lead data:', error);
      navigate('/leads');
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
      navigate('/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!lead) {
    return <div>Lead not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/leads')} className="text-primary-600 hover:text-primary-700 mb-2">
            ← Back to Leads
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
        </div>
        <div className="flex space-x-2">
          <button onClick={handleDelete} className="btn btn-danger">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Info Card */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Lead Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <p className="font-medium">{lead.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <p className="font-medium">{lead.phone || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Service Type</label>
                <p className="font-medium">{lead.service_type || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Source</label>
                <p className="font-medium">{lead.source || '-'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <div className="mt-1">
                  <select
                    value={lead.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`input ${statusColors[lead.status]}`}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Created</label>
                <p className="font-medium">
                  {format(new Date(lead.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Notes</h2>
              <button onClick={() => setShowNoteModal(true)} className="btn btn-primary text-sm">
                Add Note
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notes yet</p>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">
                        {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingNote(note)}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this note?')) {
                              try {
                                await api.delete(`/notes/${note.id}`);
                                fetchLeadData();
                              } catch (error) {
                                console.error('Failed to delete note:', error);
                              }
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-900">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Follow-ups */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Follow-ups</h2>
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="btn btn-primary text-sm"
              >
                Add
              </button>
            </div>
            {followUps.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No follow-ups</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((followUp) => (
                  <div key={followUp.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="font-medium text-sm">
                      {format(new Date(followUp.scheduled_date), 'MMM d, yyyy')}
                    </p>
                    {followUp.scheduled_time && (
                      <p className="text-xs text-gray-600">{followUp.scheduled_time}</p>
                    )}
                    <span
                      className={`badge text-xs mt-2 ${
                        followUp.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : followUp.status === 'Missed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {followUp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">{note ? 'Edit Note' : 'Add Note'}</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              required
              rows={4}
              className="input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex space-x-3">
            <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Schedule Follow-up</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              name="scheduledDate"
              required
              className="input"
              value={formData.scheduledDate}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="time"
              name="scheduledTime"
              className="input"
              value={formData.scheduledTime}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              name="notes"
              className="input"
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
          <div className="flex space-x-3">
            <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
              {loading ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

