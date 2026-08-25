# Phase 6.12 — Brand drift (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.12.

## Problem

Buyer-facing surfaces still say **CRM Inc** (login/signup/forgot-password) and
the npm package is `local-service-crm-frontend`. OpenAPI title is `CRM API`.
The git folder `CRM-` stays; we do not rename the repository.

## Decisions (locked)

1. Visible product name is **Perioxia CRM** (API title: **Perioxia CRM API**).
2. Frontend package name: `perioxia-crm-frontend`.
3. Auth footers: `© 2026 Perioxia CRM`.
4. Guard with `frontend/lib/brandDrift.test.cjs`. No new deps. No repo rename.

## Non-goals

Renaming the git directory, rewriting README body, Flutter store listing polish,
renaming SQL tables.
