# Phase 6.5 — One object UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** One client/deal/invoice record UI reused across role prefixes; Deals in nav; client ActivityFeed.

**Architecture:** Role routes re-export shared components. Path helpers pick `/sales|/manager|/md` prefixes. API scope already differs by JWT role.

**Tech stack:** Next.js App Router, existing `leadsPaths` pattern, `node --test` for path helpers.

## File map

- `frontend/lib/objectPaths.cjs` — path helpers
- `frontend/lib/objectPaths.test.cjs` — tests
- `frontend/lib/leadsPaths.js` — re-export
- `frontend/components/clients/ClientsIndexPage.jsx`
- `frontend/components/clients/ClientDetailPage.jsx`
- `frontend/components/invoices/InvoiceDetailPage.jsx`
- `frontend/components/deals/DealsBoard.jsx`
- `frontend/components/deals/DealDetailPage.jsx`
- Role `app/*/…/page.jsx` thin re-exports
- `frontend/components/Sidebar.jsx` — Deals links

## Task 1: Path helpers (TDD)

## Task 2: Extract client + invoice + deal components; thin routes; sidebar; ActivityFeed on client

## Task 3: Mark 6.5 DONE in IMPLEMENTATION_PLAN.md
