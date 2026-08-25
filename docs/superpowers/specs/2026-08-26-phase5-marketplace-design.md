# Phase 5.6 — Marketplace / apps (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.6.

## Problem

Buyers compare “marketplace” as a checkbox. A third-party developer
platform (Zoho’s 1,100 apps, sandboxed code, OAuth app store billing)
is explicitly out of scope ([PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md)
§7). 5.6 ships a **first-party app catalog** with per-company
install/uninstall so the settings surface exists. Catalog entries
point at features we already ship; installing records intent, it does
not load third-party code.

## Decisions (locked)

1. **First-party catalog only** — code-defined list, no HTTP, no
   pip/npm deps, no third-party manifests. Unknown slug → 400.

2. **Install is a company-scoped flag**, not an execution sandbox.
   Installing `accounting` does not call Tally; it marks the app
   installed and returns `settings_href` so the admin can open the
   real settings page.

3. **Table** `marketplace_installs`:
   `id, company_id, app_slug, status (installed|uninstalled),
   installed_by_id, installed_at, updated_at`.
   Unique `(company_id, app_slug)`. Reinstall flips `status` back to
   `installed` on the same row (idempotent). Uninstall sets
   `uninstalled` (row kept).

4. **Catalog slugs** (must match `CATALOG` in
   `app/services/marketplace/catalog.py`):
   `scoring`, `predictions`, `accounting`, `custom_modules`,
   `email`, `calendar`, `whatsapp`, `telephony`, `webhooks`.
   Each has `name`, `summary`, `settings_href`.

5. **Schema** — model in `app.models.sales`; Alembic
   `023_marketplace` (`down_revision: 022_custom_modules`) calls
   `apply_schema`. New table via `create_all`. No `MISSING_COLUMNS`.

6. **Routes** (`/api/marketplace`)
   - `GET /apps` — any company user. Catalog + this company’s
     `status` (`not_installed` if no row). Company B never sees A’s
     installs.
   - `POST /apps/{slug}/install` — admin/MD. 200 + app payload.
     Unknown slug → 400. Idempotent if already installed.
   - `DELETE /apps/{slug}` — admin/MD uninstall. No row or already
     uninstalled → 404. Foreign company has its own row or 404.
   - `GET /installs` — admin/MD list of this company’s install rows
     (including uninstalled history).

7. **Tenancy** — every query filters `company_id`. There is no
   cross-company install id in the public API; isolation is proven by
   A installing an app and B seeing `not_installed` for the same slug
   (positive control: A still sees `installed`).

8. **UI** — `/settings/marketplace` (list, Install / Uninstall /
   Open settings). Link from `/settings`. Sales can view the catalog
   but cannot install.

## Non-goals

Third-party developers, OAuth app store, billed add-on SKUs, sandboxed
code, webhooks into installed apps, Deluge, Zoho Marketplace parity.
