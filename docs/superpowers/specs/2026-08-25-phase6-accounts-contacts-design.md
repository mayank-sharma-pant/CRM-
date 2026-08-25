# Phase 6.13 — Accounts vs Contacts (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.13.
> B2B company record (HubSpot Company / Salesforce Account). Thin.

## Problem

`Client` is a person-shaped row with a free-text `company` string. Two contacts
at the same buyer cannot share one org record. Competitors split Account vs Contact.

## Decisions (locked)

1. **`accounts` table** — tenant `company_id`, `name`, optional `website`, `phone`,
   `gstin`, `address`. Not the tenant `companies` row.
2. **`clients.account_id`** nullable FK. Client stays the contact; API name
   unchanged. Do not rename Client to Contact.
3. **CRUD** ` /api/accounts` — list/create/get/patch/delete. Company-scoped.
   Delete **409** if any client is linked. Cross-tenant account_id → **404**.
4. Create/update client accepts `account_id` (null unlinks). List/get client
   include `account_id` and `account_name`.
5. **UI:** `/sales|/manager|/md/accounts` (+ `[id]`). Picker on client detail.
6. No Alembic; new table via `create_all`, column via `_MISSING_COLUMNS`. No new pip deps.

## Non-goals

Renaming Client, Account on Deal/Lead, converting the `company` string automatically,
Accounts vs Contacts as required for every tenant.
