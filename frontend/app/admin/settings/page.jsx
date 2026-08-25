'use client';

import { useState, useEffect } from 'react';
import api, { companySecurity } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import NotificationPreferencesPanel from '@/components/shared/NotificationPreferencesPanel';
import {
    Building2,
    FileText,
    Bell,
    Upload,
    Save,
    Shield
} from 'lucide-react';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('company');
    const [saved, setSaved] = useState(false);

    // 2FA mandate
    const [require2FA, setRequire2FA] = useState(false);
    const [require2FALoading, setRequire2FALoading] = useState(false);
    const [require2FAError, setRequire2FAError] = useState('');

    // Company Profile
    const [companyName, setCompanyName] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [companyGST, setCompanyGST] = useState('');

    // Pipeline Settings
    const [leadStages, setLeadStages] = useState([]);
    const [lostReasons, setLostReasons] = useState([]);

    // Invoice Settings
    const [invoicePrefix, setInvoicePrefix] = useState('');
    const [taxRate, setTaxRate] = useState('');

    // Notification Rules
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [followupAlertsEnabled, setFollowupAlertsEnabled] = useState(true);
    const [runningReminders, setRunningReminders] = useState(false);
    const [reminderRunMsg, setReminderRunMsg] = useState('');
    const [fieldDefs, setFieldDefs] = useState([]);
    const [newField, setNewField] = useState({
        entity_type: 'lead', name: '', field_key: '', field_type: 'text', options: '',
    });

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/settings');
            const data = res.data;
            setCompanyName(data.company_name || '');
            setCompanyAddress(data.address || '');
            setCompanyGST(data.gst_number || '');
            setInvoicePrefix(data.invoice_prefix || '');
            setTaxRate(String(data.tax_rate || ''));

            setLeadStages(Array.isArray(data.lead_stages) ? data.lead_stages : ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']);
            setLostReasons(Array.isArray(data.lost_reasons) ? data.lost_reasons : ['No budget', 'Timing not right', 'Competitor', 'No response']);
            setRemindersEnabled(Boolean(data.task_reminders_enabled));
            setFollowupAlertsEnabled(Boolean(data.followup_alerts_enabled));
            const fieldsRes = await api.get('/custom-fields');
            setFieldDefs(fieldsRes.data.items || []);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (user?.role !== 'admin') return;
        companySecurity.getRequire2FA()
            .then((data) => setRequire2FA(Boolean(data.require_2fa)))
            .catch((err) => console.error('Failed to fetch 2FA mandate', err));
    }, [user?.role]);

    const handleToggleRequire2FA = async () => {
        const next = !require2FA;
        const previous = require2FA;
        setRequire2FA(next);
        setRequire2FAError('');
        setRequire2FALoading(true);
        try {
            await companySecurity.setRequire2FA(next);
        } catch (err) {
            setRequire2FA(previous);
            setRequire2FAError(err.response?.data?.detail || 'Could not update the 2FA requirement.');
        } finally {
            setRequire2FALoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await api.put('/admin/settings', {
                company_name: companyName,
                address: companyAddress,
                invoice_prefix: invoicePrefix,
                tax_rate: parseFloat(taxRate) || 0,
                task_reminders_enabled: remindersEnabled,
                followup_alerts_enabled: followupAlertsEnabled,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save settings', err);
            alert(err.response?.data?.detail || 'Failed to save settings');
        }
    };

    if (loading) return <SettingsSkeleton />;

    return (
        <div className="mx-auto max-w-[1100px] space-y-4 pb-8 font-sans text-slate-900 dark:text-slate-100">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Settings</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Company-wide configuration</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('company')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'company'
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Company Profile
                </button>
                <button
                    onClick={() => setActiveTab('pipeline')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pipeline'
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Pipeline Settings
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'invoices'
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Invoice Settings
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notifications'
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Notifications
                </button>
                <button
                    onClick={() => setActiveTab('fields')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'fields'
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Custom Fields
                </button>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">

                {/* Company Profile */}
                {activeTab === 'company' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 size={20} className="text-slate-600 dark:text-slate-400" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Company Information</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Address</label>
                            <textarea
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GSTIN</label>
                            <input
                                type="text"
                                value={companyGST}
                                onChange={(e) => setCompanyGST(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Company Logo</label>
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
                                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Click to upload or drag and drop</p>
                                <p className="text-xs text-slate-400">PNG, JPG up to 2MB</p>
                            </div>
                        </div>

                        {user?.role === 'admin' && (
                            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield size={16} className="text-slate-600 dark:text-slate-400" />
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Security</h4>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <div>
                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Require 2FA for all members</div>
                                        <div className="text-xs text-slate-500">Members without two-factor enabled must set it up on their next sign-in.</div>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={require2FA}
                                        aria-label="Require 2FA for all members"
                                        onClick={handleToggleRequire2FA}
                                        disabled={require2FALoading}
                                        className={`w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 ${require2FA ? 'bg-slate-900 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${require2FA ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                    </button>
                                </div>
                                {require2FAError && (
                                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">{require2FAError}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Pipeline Settings */}
                {activeTab === 'pipeline' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={20} className="text-slate-600 dark:text-slate-400" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">CRM Pipeline Configuration</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Lead Stages</label>
                            <div className="flex flex-wrap gap-2">
                                {leadStages.map((stage, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                                        {stage}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">Contact admin to modify pipeline stages</p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Lost Reasons</label>
                            <div className="space-y-2">
                                {lostReasons.map((reason, i) => (
                                    <div key={i} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm">
                                        {reason}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice Settings */}
                {activeTab === 'invoices' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={20} className="text-slate-600 dark:text-slate-400" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Invoice Configuration</h3>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Invoice Prefix</label>
                            <input
                                type="text"
                                value={invoicePrefix}
                                onChange={(e) => setInvoicePrefix(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                                placeholder="e.g. INV"
                            />
                            <p className="text-xs text-slate-400 mt-1">Invoices will be numbered as {invoicePrefix}-0001, {invoicePrefix}-0002, etc.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Default Tax Rate (%)</label>
                            <input
                                type="number"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                                placeholder="e.g. 18"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Default Payment Terms</label>
                            <select className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900">
                                <option>Net 30 days</option>
                                <option>Net 15 days</option>
                                <option>Net 60 days</option>
                                <option>Due on receipt</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Notifications */}
                {activeTab === 'notifications' && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <Bell size={20} className="text-slate-600 dark:text-slate-400" />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Notification Rules</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Task Reminders</div>
                                    <div className="text-xs text-slate-500">Send reminders for upcoming tasks</div>
                                </div>
                                <button
                                    onClick={() => setRemindersEnabled(!remindersEnabled)}
                                    className={`w-11 h-6 rounded-full transition-colors ${remindersEnabled ? 'bg-slate-900 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${remindersEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                <div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">Follow-up Alerts</div>
                                    <div className="text-xs text-slate-500">Alert when follow-ups are due</div>
                                </div>
                                <button
                                    onClick={() => setFollowupAlertsEnabled(!followupAlertsEnabled)}
                                    className={`w-11 h-6 rounded-full transition-colors ${followupAlertsEnabled ? 'bg-slate-900 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${followupAlertsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <button
                                type="button"
                                disabled={runningReminders}
                                onClick={async () => {
                                    setRunningReminders(true);
                                    setReminderRunMsg('');
                                    try {
                                        const res = await api.post('/reminders/run');
                                        const tasks = res.data.tasks ?? 0;
                                        const followUps = res.data.follow_ups ?? 0;
                                        setReminderRunMsg(`Sent ${tasks} task and ${followUps} follow-up reminder(s).`);
                                    } catch (err) {
                                        setReminderRunMsg(err.response?.data?.detail || 'Could not run reminders');
                                    } finally {
                                        setRunningReminders(false);
                                    }
                                }}
                                className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg disabled:opacity-50"
                            >
                                {runningReminders ? 'Sending…' : 'Send due reminders now'}
                            </button>
                            {reminderRunMsg && (
                                <p className="text-xs text-slate-500">{reminderRunMsg}</p>
                            )}
                        </div>
                        <p className="text-xs text-slate-400">
                            Emails go to the assignee when SMTP is configured. Point a daily cron at POST /api/reminders/run. WhatsApp is not sent yet.
                        </p>

                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="mb-3">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Personal Notification Preferences</p>
                                <p className="text-xs text-slate-500">Control which in-app categories appear in your own inbox.</p>
                            </div>
                            <NotificationPreferencesPanel />
                        </div>
                    </div>
                )}

                {activeTab === 'fields' && (
                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Custom fields</h3>
                        <p className="text-xs text-slate-500">Shown on leads, deals, and clients. Keys cannot be changed later.</p>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <select
                                value={newField.entity_type}
                                onChange={(e) => setNewField({ ...newField, entity_type: e.target.value })}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            >
                                <option value="lead">Lead</option>
                                <option value="deal">Deal</option>
                                <option value="client">Client</option>
                            </select>
                            <input
                                placeholder="Name"
                                value={newField.name}
                                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            />
                            <input
                                placeholder="key_slug"
                                value={newField.field_key}
                                onChange={(e) => setNewField({ ...newField, field_key: e.target.value })}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            />
                            <select
                                value={newField.field_type}
                                onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="picklist">Picklist</option>
                            </select>
                            <button
                                type="button"
                                onClick={async () => {
                                    try {
                                        const payload = {
                                            entity_type: newField.entity_type,
                                            name: newField.name,
                                            field_key: newField.field_key,
                                            field_type: newField.field_type,
                                        };
                                        if (newField.field_type === 'picklist') {
                                            payload.options = newField.options.split(',').map((s) => s.trim()).filter(Boolean);
                                        }
                                        await api.post('/custom-fields', payload);
                                        setNewField({ entity_type: 'lead', name: '', field_key: '', field_type: 'text', options: '' });
                                        const fieldsRes = await api.get('/custom-fields');
                                        setFieldDefs(fieldsRes.data.items || []);
                                    } catch (err) {
                                        alert(err.response?.data?.detail || 'Could not create field');
                                    }
                                }}
                                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm"
                            >
                                Add
                            </button>
                        </div>
                        {newField.field_type === 'picklist' && (
                            <input
                                placeholder="Options, comma separated"
                                value={newField.options}
                                onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900"
                            />
                        )}
                        <ul className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {fieldDefs.length === 0 && <li className="py-2 text-slate-500">No custom fields yet.</li>}
                            {fieldDefs.map((f) => (
                                <li key={f.id} className="py-2 flex justify-between gap-2">
                                    <span>{f.name} <span className="text-slate-400">({f.entity_type} · {f.field_key} · {f.field_type})</span></span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Save Button */}
                {activeTab !== 'fields' && (
                <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400">
                        {saved ? 'Saved by Admin' : 'Changes will be applied system-wide'}
                    </p>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
                )}
            </div>
        </div>
    );
}

function SettingsSkeleton() {
    return (
        <div className="mx-auto max-w-[1100px] space-y-4 animate-pulse">
            <div className="space-y-1">
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="flex gap-2 border-b border-slate-200">
                {[...Array(4)].map((_, i) => <div key={i} className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded-t"></div>)}
            </div>
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
    );
}
