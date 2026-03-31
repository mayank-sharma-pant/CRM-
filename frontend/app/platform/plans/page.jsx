'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';

const PLATFORM_API = '/api/platform';

export default function PlansPage() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('platform_token');
            const response = await fetch(`${PLATFORM_API}/plans`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPlans(data.plans || []);
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Subscription Plans</h1>
                    <p className="text-slate-600 mt-1">Manage pricing and features</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                    <Plus size={20} />
                    Create Plan
                </button>
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div key={plan.id} className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-blue-400 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <CreditCard className="text-blue-600" size={24} />
                                </div>
                                {plan.is_active && (
                                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                                        Active
                                    </span>
                                )}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <p className="text-4xl font-bold text-blue-600 mb-6">
                                ${plan.price_monthly}
                                <span className="text-lg text-slate-600 font-normal">/mo</span>
                            </p>
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Max Users</span>
                                    <span className="font-semibold text-slate-900">{plan.max_users}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Max Teams</span>
                                    <span className="font-semibold text-slate-900">{plan.max_teams}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Storage</span>
                                    <span className="font-semibold text-slate-900">
                                        {plan.max_storage_gb ? `${plan.max_storage_gb} GB` : 'Unlimited'}
                                    </span>
                                </div>
                            </div>
                            <button className="w-full px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors">
                                Edit Plan
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
