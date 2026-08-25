# Phase 3.9 — Minimal Flutter sales path (design)

Existing `flutter_app/` is a full role clone. v0 for this item is **sales field path only**: Leads, Follow-ups, Invoices (+ More for profile/logout). Other roles keep their current shells.

- Sales login lands on `/leads`, not dashboard.
- Bottom nav: Leads · Follow-ups · Invoices · More.
- Invoice list reads API `items` (same as `/api/invoices`). Detail shows GST breakup when `tax_mode` is present.
- No new native plugins. No rewrite. No stripping other roles.
