# Phase 7.12 — Reports + schedule Implementation Plan

**Goal:** Add deals pipeline + GST invoice saved report types and scheduled CSV email to company admins.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-reports-schedule-design.md`](../specs/2026-08-26-phase7-reports-schedule-design.md)

---

### Task 1: Report types + runner

- Extend `SavedReportType` enum
- `run_deals_pipeline_report`, `run_gst_invoices_report`, `run_report`, `report_csv_headers_and_rows`
- Dispatch in reports router create/patch/run/csv

### Task 2: Schedule + migration

- `company_settings` schedule columns + schema_sync
- Alembic `036_report_schedule`
- `report_schedule` service + `/api/settings/report-schedule` router
- Tests in `test_report_types_schedule.py`

### Task 3: Frontend + docs

- `/reports` type picker, filters, result tables, schedule panel
- IMPLEMENTATION_PLAN 7.12 DONE; Phase 7 complete
