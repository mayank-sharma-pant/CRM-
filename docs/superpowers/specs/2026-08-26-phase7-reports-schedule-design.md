# Phase 7.12 — Reports + schedule (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.12.

## Problem

Phase 3.4 ships one saved report type (`leads_invoices`) with manual run/CSV only. Trial defense needs deals pipeline + GST invoice reports and scheduled CSV email to admins.

## Decisions (locked)

1. Extend **`SavedReportType`** with `deals_pipeline` and `gst_invoices`.
2. **`report_runner`** dispatches by type; `/reports/{id}/run|csv` use saved filters.
3. **Deals pipeline filters:** date range (created_at), optional `pipeline_id`, `group_by`: stage | owner.
4. **GST invoice filters:** date range, optional status, `group_by`: date | status. Grid includes CGST/SGST/IGST/GSTIN/IRN.
5. **Schedule** on `company_settings`: enabled, frequency (daily|weekly), `saved_report_id`, `last_sent_at`.
6. **`GET/PUT /api/settings/report-schedule`** for admin/md; **`POST /api/settings/report-schedule/run`** for external cron (same pattern as reminders).
7. Email CSV attachment to all active admin/md users when SMTP configured.

Alembic **`036_report_schedule`** off `035_import_batches`.

## UI

`/reports` — report type picker, type-specific filters, schedule panel for admin/md.
