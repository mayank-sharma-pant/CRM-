'use client';

import Link from 'next/link';

/**
 * Split auth chrome: teal blotter + desk mock on the left, form on the right.
 * Signature: stacked quote → paid invoice — the product metaphor, not generic SaaS glow.
 */
export default function AuthShell({ children, eyebrow = 'CRM for service businesses' }) {
    return (
        <div className="auth-shell">
            <aside className="auth-panel" aria-hidden="false">
                <div className="auth-panel-inner">
                    <Link href="/" className="auth-panel-brand">
                        <span className="brand-mark brand-mark--on-ink">P</span>
                        <span className="auth-panel-brand-name">Perioxia</span>
                    </Link>

                    <div className="auth-panel-copy">
                        <p className="auth-panel-eyebrow">{eyebrow}</p>
                        <h1 className="auth-panel-headline">
                            Leads to paid invoices,
                            <br />
                            on one desk.
                        </h1>
                        <p className="auth-panel-sub">
                            Capture the job, send the quote, collect with GST — without hopping tools.
                        </p>
                    </div>

                    <div className="auth-desk" aria-hidden="true">
                        <div className="auth-desk-stage">
                            <div className="auth-paper auth-paper--quote">
                                <div className="auth-paper-top">
                                    <span>QUO-1092</span>
                                    <span className="auth-paper-chip auth-paper-chip--muted">Sent</span>
                                </div>
                                <p className="auth-paper-client">Sharma Interiors</p>
                                <div className="auth-paper-line">
                                    <span>GEO Pro — monthly</span>
                                    <span>₹8,500</span>
                                </div>
                                <div className="auth-paper-line auth-paper-line--faint">
                                    <span>Valid 5 days</span>
                                    <span>GST 18%</span>
                                </div>
                            </div>

                            <div className="auth-paper auth-paper--invoice">
                                <div className="auth-paper-top">
                                    <span>INV-2841</span>
                                    <span className="auth-paper-chip auth-paper-chip--paid">Paid</span>
                                </div>
                                <p className="auth-paper-client">Kitchen remodel · GST invoice</p>
                                <div className="auth-paper-line">
                                    <span>Remodel deposit</span>
                                    <span className="amt">₹48,000</span>
                                </div>
                                <div className="auth-paper-line">
                                    <span>Site survey</span>
                                    <span className="amt">₹2,500</span>
                                </div>
                                <div className="auth-paper-total">
                                    <span>Total collected</span>
                                    <span>₹50,500</span>
                                </div>
                                <div className="auth-paper-meta">
                                    <span>CGST + SGST</span>
                                    <span>UPI · Axis ****4678</span>
                                </div>
                            </div>
                        </div>

                        <ol className="auth-flow">
                            <li>
                                <span className="auth-flow-dot" />
                                Lead
                            </li>
                            <li>
                                <span className="auth-flow-dot" />
                                Quote
                            </li>
                            <li className="is-done">
                                <span className="auth-flow-dot" />
                                Paid
                            </li>
                        </ol>
                    </div>
                </div>
            </aside>

            <div className="auth-form-side">
                <div className="auth-form-frame">{children}</div>
            </div>
        </div>
    );
}
