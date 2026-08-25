# Phase 6.11 — Landing honesty (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.11.
> Roadmap: fake testimonials and unshipped landing claims must go before public launch.

## Problem

`frontend/app/page.jsx` still presents named customer quotes (fabricated), a
volume claim (“hundreds of service businesses”), and a logo strip of products
we do not ship as native integrations (Stripe, QuickBooks, Slack, Zapier).
Footer `#` links imply Pricing, Careers, Blog, and social pages that do not exist.

Quotes, Razorpay pay, cadence, Gmail/Outlook, Google Calendar, and WhatsApp
exist now. The 14-day trial (`TRIAL_DAYS = 14`) is real. Copy must match that.

## Decisions (locked)

1. **No named testimonials** and no implied customer count until we have real ones.
2. **Integrations listed only if shipped in-product:** Gmail, Outlook, Google
   Calendar, WhatsApp, Razorpay. No Stripe/QB/Slack/Zapier strip.
3. **No “schedule jobs” / marketing-ROI / margin claims.** Close step is quotes +
   portal pay + cadence reminders.
4. **Footer:** only in-page anchors and `/login` / `/signup`. No `#` dead links.
5. Guard with `frontend/lib/landingHonesty.test.cjs` (forbidden substrings in
   `app/page.jsx`). No new npm deps.

## Non-goals

Pricing page, legal pages, 6.12 brand-name sweep, rewriting the whole marketing site.
