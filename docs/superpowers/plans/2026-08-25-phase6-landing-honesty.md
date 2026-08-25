# Landing honesty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public landing copy matches shipped product; fabricated social proof is gone.

**Architecture:** Forbidden-string unit test on `frontend/app/page.jsx`, then rewrite that page.

**Tech Stack:** Next.js landing, Node `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-landing-honesty-design.md`

## Global Constraints

No Alembic. No new npm/pip deps. Do not invent customers.

---

## Task 1: Honesty test + landing rewrite

- [ ] Add `frontend/lib/landingHonesty.test.cjs` and `npm run test:landing`.
- [ ] Watch it fail on current `page.jsx`.
- [ ] Edit `frontend/app/page.jsx` until the test passes.
- [ ] Mark 6.11 DONE in `IMPLEMENTATION_PLAN.md`.
