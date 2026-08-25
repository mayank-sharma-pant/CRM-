# Phase 5.5 — Custom modules (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.5.

## Problem

Custom **fields** already hang extra attributes on lead / deal / client. Buyers still
want a net-new object (Properties, Projects, Sites) that is not a lead. Zoho's
custom modules are that: a company-defined table with its own fields and rows.

## Decisions (locked)

1. **New object, not more fields.** A module is a named slug with its own records.
   Built-in entity types stay on `custom_field_defs`. Do not reuse
   `entity_type=lead` for this.

2. **Tables**
   - `custom_modules`: `id, company_id, name, slug, is_active`
     unique `(company_id, slug)`.
   - `custom_module_fields`: `id, company_id, module_id, name, field_key,
     field_type, options_json, is_active` unique `(module_id, field_key)`.
     Same types as custom fields: `text | number | date | picklist`.
   - `custom_module_records`: `id, company_id, module_id, title, values_json,
     created_by_id, created_at, updated_at`. `title` is the list label.
     `values_json` is a JSON object of `field_key → string|null`.

3. **Caps** — 10 modules per company; 20 fields per module. Over cap → 400.

4. **Reserved slugs** — cannot create `lead(s)`, `deal(s)`, `client(s)`,
   `account(s)`, `invoice(s)`, `user(s)`, `module(s)`, `company(ies)`,
   `team(s)`, `quote(s)`, `product(s)`, `task(s)`. Slug = lowercase
   `[a-z][a-z0-9_]{0,49}`.

5. **Schema** — models in `app.models.sales`; Alembic `022_custom_modules`
   (`down_revision: 021_accounting`) calls `apply_schema`. New tables via
   `create_all`. No `MISSING_COLUMNS`.

6. **Routes** (`/api/modules`)
   - `GET ""` — company users; default active-only; `?include_inactive=true`
     admin/MD only.
   - `POST ""` admin/MD — `{name, slug}`.
   - `PATCH /{id}` admin/MD — `{name?, is_active?}`. Foreign id → 404.
   - `DELETE /{id}` admin/MD — 204, cascades fields + records. 404 other tenant.
   - `GET|POST /{id}/fields` — GET any company user; POST admin/MD
     `{name, field_key, field_type, options?}`.
   - `GET|POST /{id}/records` — any company user. POST `{title, values?}`.
     Inactive module → 400 on write.
   - `GET|PATCH|DELETE /{id}/records/{rid}` — same company; foreign → 404.

7. **Validation** — unknown field_key / bad type → 400 (reuse custom-field
   normalizers). Inactive fields cannot be written.

8. **UI** — `/settings/modules` (admin/MD define module + fields).
   `/modules/[slug]` list/create/edit records. Sidebar lists active modules
   (same pattern as ledgers).

## Non-goals

Layouts, related lists, lookups to leads, permissions per module, workflows on
custom records, import, public API, Deluge.
