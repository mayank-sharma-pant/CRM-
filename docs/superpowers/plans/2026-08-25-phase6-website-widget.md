# Website widget → lead Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embeddable site widget that creates a lead with source Website widget.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-website-widget-design.md`

## Global Constraints

No new pip/npm deps. No Alembic. 404 for unknown slugs.

---

## Task 1

- [x] `tests/sales/test_website_widget.py` (fail first).
- [x] Public widget API, embed.js, `/w/{slug}` UI, copy snippet on leads.
