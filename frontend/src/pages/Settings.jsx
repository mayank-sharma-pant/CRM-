import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [userRes, businessRes] = await Promise.all([
        api.get('/settings/profile'),
        api.get('/settings/business'),
      ]);
      setUser(userRes.data);
      setBusiness(businessRes.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and business settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'business'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Business
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Password
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'profile' && <ProfileTab user={user} onUpdate={fetchSettings} />}
        {activeTab === 'business' && <BusinessTab business={business} onUpdate={fetchSettings} />}
        {activeTab === 'password' && <PasswordTab />}
      </div>
    </div>
  );
}

function ProfileTab({ user, onUpdate }) {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/settings/profile', { fullName });
      setMessage('Profile updated successfully');
      onUpdate();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" className="input bg-gray-50" value={user?.email || ''} disabled />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function BusinessTab({ business, onUpdate }) {
  const [formData, setFormData] = useState({
    name: business?.name || '',
    phone: business?.phone || '',
    address: business?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/settings/business', formData);
      setMessage('Business information updated successfully');
      onUpdate();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update business information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Business Information</h2>
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            type="text"
            name="name"
            className="input"
            value={formData.name}
            onChange={handleChange}
            required
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            name="address"
            rows={3}
            className="input"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function PasswordTab() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.put('/settings/password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      setMessage('Password updated successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Change Password</h2>
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg ${
            message.includes('success')
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            className="input"
            value={formData.currentPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            name="newPassword"
            className="input"
            value={formData.newPassword}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            className="input"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

