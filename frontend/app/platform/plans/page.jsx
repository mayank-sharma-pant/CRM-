'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';

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
                headers: { Authorization: `Bearer ${token}` },
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
        <div className="p-5 sm:p-6 lg:p-8 space-y-5">
            <div>
                <h1 className="font-display text-[1.75rem] font-semibold text-primary tracking-tight">
                    Subscription plans
                </h1>
                <p className="text-[15px] text-muted mt-1">Catalog from the API (read-only)</p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className="bg-surface rounded-xl border border-border p-5 hover:border-border-strong transition-colors"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 rounded-lg bg-accent-subtle text-accent">
                                    <CreditCard size={18} strokeWidth={1.75} />
                                </div>
                                {plan.is_active && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-success text-xs font-semibold rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                        Active
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-primary mb-1">{plan.name}</h3>
                            <p className="mb-5">
                                <span className="text-3xl font-semibold text-accent tabular-nums tracking-tight">
                                    ${plan.price_monthly}
                                </span>
                                <span className="text-[14px] text-muted font-normal">/mo</span>
                            </p>
                            <div className="space-y-0 border-t border-border-subtle pt-3">
                                {[
                                    { label: 'Max users', value: plan.max_users },
                                    { label: 'Max teams', value: plan.max_teams },
                                    {
                                        label: 'Storage',
                                        value: plan.max_storage_gb ? `${plan.max_storage_gb} GB` : 'Unlimited',
                                    },
                                ].map((row) => (
                                    <div
                                        key={row.label}
                                        className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                                    >
                                        <span className="text-[14px] text-secondary">{row.label}</span>
                                        <span className="text-[14px] font-semibold text-primary tabular-nums">
                                            {row.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
