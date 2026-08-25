# SAML SSO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Company SAML login for existing users (email + company match).

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-saml-sso-design.md`

## Global Constraints

No new pip deps. No Alembic. 404 for missing/disabled IdP and other-tenant config.

---

## Task 1

- [x] `tests/auth/test_saml_sso.py` (fail first).
- [x] Model, SAML service, auth ACS/start, admin config, login + settings UI.
