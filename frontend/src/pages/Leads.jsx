import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

const statusColors = {
  New: 'bg-blue-100 text-blue-800',
  Contacted: 'bg-yellow-100 text-yellow-800',
  'Follow-up': 'bg-purple-100 text-purple-800',
  Converted: 'bg-green-100 text-green-800',
  Lost: 'bg-red-100 text-red-800',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

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
      fetchLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-100 border-b border-gray-300 px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Leads</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Leads
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            My Leads
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recent'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Recently Created
          </button>
          <button
            onClick={() => setActiveTab('modified')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'modified'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Recently Modified
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span>Filter</span>
          </button>
          <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            <span>Sort</span>
          </button>
          <div className="flex items-center border-l border-gray-300 pl-2 ml-2">
            <button className="p-1.5 hover:bg-gray-100 rounded">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded ml-1">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Lead</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Panel */}
        {showFilters && (
          <div className="w-64 border-r border-gray-200 bg-white overflow-y-auto">
            <div className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Q Search"
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="mb-4">
                <button className="w-full text-left flex items-center justify-between py-2 text-sm font-medium text-gray-700">
                  <span>System Defined Filters</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="mt-2 space-y-1 pl-2">
                  <label className="flex items-center text-sm text-gray-600">
                    <input type="checkbox" className="mr-2" />
                    <span>Touched Records</span>
                  </label>
                  <label className="flex items-center text-sm text-gray-600">
                    <input type="checkbox" className="mr-2" />
                    <span>Untouched Records</span>
                  </label>
                </div>
              </div>

              <div>
                <button className="w-full text-left flex items-center justify-between py-2 text-sm font-medium text-gray-700">
                  <span>Filter By Fields</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="mt-2 space-y-2 pl-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Converted">Converted</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <label className="flex items-center text-sm text-gray-600">
                    <input type="checkbox" className="mr-2" />
                    <span>Lead Name</span>
                  </label>
                  <label className="flex items-center text-sm text-gray-600">
                    <input type="checkbox" className="mr-2" />
                    <span>Created Time</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto bg-white">
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No leads found</p>
                <button onClick={() => setShowModal(true)} className="btn btn-primary">
                  Add Your First Lead
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Lead Name
                      <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Status
                      <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Service Type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input type="checkbox" className="rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {lead.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{lead.email || '-'}</div>
                        <div className="text-xs text-gray-500">{lead.phone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lead.source || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {lead.service_type || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                <span>Total Records {leads.length}</span>
                <div className="flex items-center space-x-2">
                  <button className="px-2 py-1 hover:bg-gray-100 rounded">&lt;</button>
                  <span>1 to {leads.length}</span>
                  <button className="px-2 py-1 hover:bg-gray-100 rounded">&gt;</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showModal && (
        <LeadModal
          onClose={() => {
            setShowModal(false);
            navigate('/leads');
          }}
          onSuccess={() => {
            setShowModal(false);
            fetchLeads();
            navigate('/leads');
          }}
        />
      )}
    </div>
  );
}

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Add New Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              name="name"
              required
              className="input"
              value={formData.name}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              className="input"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <input
              type="text"
              name="serviceType"
              className="input"
              value={formData.serviceType}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <input
              type="text"
              name="source"
              className="input"
              placeholder="e.g., Website, Referral, Social Media"
              value={formData.source}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" className="input" value={formData.status} onChange={handleChange}>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
          <div className="flex space-x-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 btn btn-primary">
              {loading ? 'Creating...' : 'Create Lead'}
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
