# Phase 7.3 — Store-listed mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile listing genuinely submittable from git — public privacy
page (store-review requirement), versioned listing metadata, signing scaffolding —
leaving only the human `flutter create` + sign + upload steps that need an SDK and
store credentials this environment does not have.

**Spec:** [`../specs/2026-08-26-phase7-store-mobile-design.md`](../specs/2026-08-26-phase7-store-mobile-design.md)

## Constraints

- No Flutter SDK / store credentials here → no `flutter create`, no build, no
  upload. Those stay documented human steps.
- No new pip / npm / Flutter dependency.
- Privacy copy must not trip the 6.11 landing-honesty or 6.12 brand tests.
- Secrets stay out of git; only `key.properties.example` (placeholders) is committed.

---

### Task 1: Store metadata files (source of truth for listing copy)

**Files (create):**
- `flutter_app/store/metadata/privacy_url.txt`
- `flutter_app/store/metadata/data_safety.md`
- `flutter_app/store/metadata/android/en-US/{title,short_description,full_description}.txt`
- `flutter_app/store/metadata/ios/en-US/{name,subtitle,description}.txt`
- `flutter_app/store/key.properties.example`

- [ ] **Step 1:** Write the metadata, copy lifted from `STORE_RELEASE.md`'s honest
  listing text. Respect Play limits: Android title ≤ 30, short ≤ 80; iOS name ≤ 30,
  subtitle ≤ 30. `privacy_url.txt` ends in `/privacy`.
- [ ] **Step 2:** Write `key.properties.example` with placeholder values only.

### Task 2: Public `/privacy` page + four public-path gates (TDD)

**Files:**
- Create: `frontend/app/privacy/page.jsx`
- Modify: `frontend/src/middleware.ts`, `frontend/components/RouteGuard.jsx`,
  `frontend/components/Layout.jsx`, `frontend/services/api.js`
- Create test: `frontend/lib/storePrivacy.test.cjs`
- Modify: `frontend/package.json` (`test:store` script)

- [ ] **Step 1 (RED):** Write `storePrivacy.test.cjs` — page exists + required
  disclosures + none of the landing forbidden phrases + `/privacy` present in all
  four gate files + metadata length guards. Run `node --test`; it fails (no page).
- [ ] **Step 2 (GREEN):** Create `app/privacy/page.jsx` (static, no auth, no API),
  add `/privacy` to all four gates. Re-run; green.
- [ ] **Step 3:** Add `"test:store": "node --test lib/storePrivacy.test.cjs"` to
  `package.json`. Run `test:store`, `test:landing`, `test:brand`, `test:paths` —
  all green.

### Task 3: Version invariants (Dart test)

**Files:**
- Create: `flutter_app/test/store_release_test.dart`

- [ ] **Step 1:** Assert `pubspec.yaml` `version:` matches `^\d+\.\d+\.\d+\+\d+$`
  and `name:` is `perioxia_crm`. Cannot run here (no Flutter SDK) — mark untested,
  same residual as 6.8 / 3.9.

### Task 4: Docs

**Files:**
- Modify: `flutter_app/store/STORE_RELEASE.md` (privacy URL → `/privacy`; pointer
  to `store/metadata/`; signing Gradle block; 7.3 note)
- Modify: `docs/IMPLEMENTATION_PLAN.md` (status board 7.3 → DONE, 7.3 progress log,
  Resume → 7.4)
- Modify: `docs/PRODUCT_ROADMAP.md` if it carries a 7.3 line

- [ ] **Step 1:** Update `STORE_RELEASE.md`.
- [ ] **Step 2:** Update `IMPLEMENTATION_PLAN.md` + roadmap.

---

## Verification

- `cd frontend && npm run test:store && npm run test:landing && npm run test:brand && npm run test:paths` — all green.
- `flutter test flutter_app/` — run locally (no SDK here; state "untested" for the Dart test).
- Manual: logged-out `GET /privacy` renders the policy with no chrome and no redirect.

## Self-review (plan vs spec)

| Spec decision | Task |
|---|---|
| 1–3 public privacy page + gates + honest content | Task 2 |
| 4 versioned metadata | Task 1 |
| 5 signing scaffolding | Task 1 (example) + Task 4 (Gradle block) |
| 6 version invariants | Task 3 |
| 7 no new deps | all |
| 8 STORE_RELEASE.md updated | Task 4 |
