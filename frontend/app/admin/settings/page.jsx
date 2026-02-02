'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import {
    Building2,
    FileText,
    Bell,
    Upload,
    Save
} from 'lucide-react';

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('company');
    const [saved, setSaved] = useState(false);

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

            // Still mock pipeline/notifications for now as backend doesn't have them
            setLeadStages(['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']);
            setLostReasons(['No budget', 'Timing not right', 'Competitor', 'No response']);
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await api.put('/admin/settings', null, {
                params: {
                    company_name: companyName,
                    address: companyAddress,
                    invoice_prefix: invoicePrefix,
                    tax_rate: parseFloat(taxRate) || 0
                }
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
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">GST / Tax ID</label>
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
                    </div>
                )}

                {/* Save Button */}
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
