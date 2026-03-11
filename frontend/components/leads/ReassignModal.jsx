import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function ReassignModal({ isOpen, onClose, onReassign, currentAssigneeId }) {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchMembers();
            setSelectedUser('');
        }
    }, [isOpen]);

    const fetchMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/users?role=sales');
            const data = res.data?.items || [];
            // filter out the current assignee to avoid no-op reassignment
            setMembers(data.filter(m => m.id !== currentAssigneeId));
        } catch (err) {
            setError('Failed to fetch team members');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;
        
        setSubmitting(true);
        try {
            await onReassign(parseInt(selectedUser));
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Reassign Lead</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    ) : error ? (
                        <div className="text-sm text-red-500 text-center py-4">{error}</div>
                    ) : members.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-4">No other team members available for reassignment.</div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Select New Owner
                                </label>
                                <select
                                    required
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                                >
                                    <option value="" disabled>Choose a team member...</option>
                                    {members.map(member => (
                                        <option key={member.id} value={member.id}>
                                            {member.full_name} ({member.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedUser}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    Reassign
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
