# Phase 7.4 — Hindi UI (plan)

> Executes [the 7.4 spec](../specs/2026-08-26-phase7-hindi-ui-design.md). TDD:
> catalog test first, then infra, then wiring, then build.

## Task 1 — i18n core + test (red→green)

1. Write `frontend/lib/i18n/hi.js`: `module`-agnostic export of the flat Hindi
   catalog (start with the sales-loop keys from spec Scope).
2. Write `frontend/lib/i18n/index.js`: `catalogs = { hi }` and
   `translate(locale, source)` = `catalogs[locale]?.[source] ?? source`. Must be
   requireable from a `.cjs` test (use interop that works for both ESM import in
   the app and `require` in the test — mirror `lib/objectPaths.cjs` which is
   already CommonJS and imported by app code; keep the i18n core `.cjs`-friendly).
3. Write `frontend/lib/i18n/i18n.test.cjs` per spec (non-empty + differs-from-
   source for all hi keys; fallback; en identity; Devanagari sample). Add
   `"test:i18n": "node --test lib/i18n/i18n.test.cjs"` to `package.json`.
4. `npm run test:i18n` green.

**Review checkpoint.**

## Task 2 — LocaleContext + LanguageToggle

1. `frontend/contexts/LocaleContext.jsx`: clone `ThemeContext` shape.
   `useState('en')`, `mounted` gate, read `localStorage.crm_locale`, set
   `document.documentElement.lang`. Export `LocaleProvider`, `useLocale`,
   `useT` (`const t = (s) => translate(locale, s)`).
2. `frontend/components/LanguageToggle.jsx`: EN / हिं control calling
   `toggleLocale`.
3. Wire `LocaleProvider` into `app/layout.js` (inside `ThemeProvider`).
4. Place `LanguageToggle` in the sidebar footer near the theme/logout control.
5. `npm run build` clean.

**Review checkpoint.**

## Task 3 — Wire sales-loop chrome

1. `Sidebar.jsx`: render sales nav labels through `t(item.name)`, the Settings
   group label, and Logout. (Sales role first; other roles inherit `t()` for
   free where the same English label has a hi entry, but are not in v0 scope.)
2. `LeadsIndexPage.jsx`: title, primary actions, search placeholder, column
   headers, status labels, empty/loading/error.
3. `DealsBoard.jsx`: title, New deal, empty state, visible pills.
4. Invoice list + Quotes sales surfaces: title, actions, status, columns, empty.
5. Add any newly surfaced English strings to `hi.js` (keep the test green — every
   hi key must stay non-empty and differ from source).
6. `npm run build` clean; `npm run test:i18n` + `test:paths` + `test:landing` +
   `test:brand` + `test:store` green.

**Whole-branch review, then update IMPLEMENTATION_PLAN.md 7.4 → DONE (code).**

## Out of scope (this plan)

Backend locale column, date/number localization, non-sales screens, detail
forms, RTL, Accept-Language negotiation. All listed as spec residuals.
