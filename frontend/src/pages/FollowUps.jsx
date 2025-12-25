import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { format, isPast, isToday } from 'date-fns';

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, overdue, pending

  useEffect(() => {
    fetchFollowUps();
  }, [filter]);

  const fetchFollowUps = async () => {
    try {
      let response;
      if (filter === 'today') {
        response = await api.get('/follow-ups/today');
      } else if (filter === 'overdue') {
        response = await api.get('/follow-ups/overdue');
      } else {
        const params = filter === 'pending' ? { status: 'Pending' } : {};
        response = await api.get('/follow-ups', { params });
      }
      setFollowUps(response.data);
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/follow-ups/${id}`, { status: newStatus });
      fetchFollowUps();
    } catch (error) {
      console.error('Failed to update follow-up:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
        <p className="text-gray-600 mt-1">Manage your scheduled follow-ups</p>
      </div>

      {/* Filters */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`btn ${filter === 'today' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Today
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`btn ${filter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Overdue
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`btn ${filter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Pending
        </button>
      </div>

      {/* Follow-ups List */}
      <div className="card">
        {followUps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No follow-ups found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {followUps.map((followUp) => {
              const scheduledDate = new Date(followUp.scheduled_date);
              const isOverdue = isPast(scheduledDate) && !isToday(scheduledDate) && followUp.status === 'Pending';
              
              return (
                <div
                  key={followUp.id}
                  className={`border rounded-lg p-4 ${
                    isOverdue
                      ? 'border-red-300 bg-red-50'
                      : isToday(scheduledDate)
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Link
                          to={`/leads/${followUp.lead_id}`}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {followUp.lead_name}
                        </Link>
                        <span
                          className={`badge ${
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
                      <div className="mt-2 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Date:</span>{' '}
                          {format(scheduledDate, 'MMM d, yyyy')}
                        </p>
                        {followUp.scheduled_time && (
                          <p>
                            <span className="font-medium">Time:</span> {followUp.scheduled_time}
                          </p>
                        )}
                        {followUp.lead_email && (
                          <p>
                            <span className="font-medium">Email:</span> {followUp.lead_email}
                          </p>
                        )}
                        {followUp.lead_phone && (
                          <p>
                            <span className="font-medium">Phone:</span> {followUp.lead_phone}
                          </p>
                        )}
                        {followUp.notes && (
                          <p className="mt-2">
                            <span className="font-medium">Notes:</span> {followUp.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      {followUp.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(followUp.id, 'Completed')}
                            className="btn btn-primary text-sm whitespace-nowrap"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleStatusChange(followUp.id, 'Missed')}
                            className="btn btn-secondary text-sm whitespace-nowrap"
                          >
                            Mark Missed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

