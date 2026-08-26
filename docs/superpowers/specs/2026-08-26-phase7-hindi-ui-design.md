# Phase 7.4 — Hindi UI (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.4
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).
> Grounded in the shipped frontend (Next.js 15 App Router, code 26 Aug 2026).

## Problem

Zoho CRM ships a Hindi UI; India-first trial users expect it. Our frontend is
English-only. Phase 7.4 adds Hindi to the **sales loop** surface (nav, leads,
deals, invoices, quotes) so a trial user can switch the sales UI to Hindi. Not
28 locales, not a full-app translation.

## Grounding (verified, not assumed)

- No i18n framework is installed (`package.json`: no `next-intl` / `react-intl`;
  the only `locale` hits are `date-fns` / `toLocaleString`).
- The app uses **React Context providers** wired in `app/layout.js`
  (`ThemeProvider`, `AuthProvider`, `NotificationProvider`). `ThemeContext.js`
  is the working model: `useState` + a `mounted` gate + `localStorage`.
- The root layout is a server component with `<html lang="en">`.
- Sales nav lives in `components/Sidebar.jsx` as `navigationItems` objects with a
  `name` label per role. The sales-loop pages are shared components
  (`components/leads/LeadsIndexPage.jsx`, `components/deals/DealsBoard.jsx`, the
  invoice/quote surfaces), rendered from thin `app/<role>/…/page.jsx` re-exports.
- Custom auth/public-path gating already exists (RouteGuard, Layout, api.js
  interceptor). We must **not** restructure routing.

## Decisions (locked)

1. **No `next-intl`.** Its App-Router mode wants a `[locale]` path segment +
   middleware, which would rewrite every route and collide with the existing
   auth/public-path gates. Cost far exceeds one item. Use a **Context + message
   catalog**, mirroring `ThemeContext` exactly (same provider shape, same
   `localStorage` + `mounted` gate). This is "the existing i18n pattern if
   present" the phase-7 spec allows — the app's own provider pattern.
2. **Message ids are the English source string** (gettext `msgid` style).
   `t("Leads")` → Hindi in `hi`, and **falls back to the English source** when a
   key is missing. Rationale: retrofitting an existing app, this avoids inventing
   hundreds of dot-keys and re-identifying every string; untranslated strings
   stay English instead of showing a raw key, so partial coverage degrades
   gracefully. New code may still add strings without a catalog entry and render
   correctly in English.
3. **Two locales only: `en`, `hi`.** `en` needs no catalog (identity fallback).
   `hi` covers the sales-loop chrome (see Scope). English default; the toggle
   opts in.
4. **Persist in `localStorage` (`crm_locale`)**, per browser, like `theme`. No
   backend column in v0 (documented residual). The `mounted` gate keeps SSR/first
   paint English so there is no hydration mismatch.
5. **Set `document.documentElement.lang`** to the active locale on the client for
   a11y/correctness; the server-rendered `lang="en"` stays as the pre-hydration
   default.

## Scope (what gets Hindi in v0)

The **sales-loop chrome** a trial user sees first — high-value visible strings,
not every helper label:

- **Sales sidebar nav** (`Sidebar.jsx` sales role): Dashboard, Leads, Clients,
  Accounts, Deals, My Orders, Stock, Products, Tasks, Follow-ups, Performance,
  Forecast, AI Assistant, Logout, and the Settings group label.
- **Leads index** (`LeadsIndexPage.jsx`): page title, primary actions (New /
  Add lead, Import CSV, Export), search placeholder, table column headers, lead
  **status** labels, empty/loading/error states.
- **Deals board** (`DealsBoard.jsx`): title, New deal, stage/column framing,
  empty state, the board's own filter pills where shown.
- **Invoices list** and **Quotes**: title, primary actions, status labels,
  column headers, empty state, on the shared sales-facing surfaces.
- **Language toggle** control itself (EN / हिं).

Explicitly **out of v0** (documented residuals, English is acceptable):
detail-page deep forms, validation messages, AI assistant free text, settings
sub-pages beyond the nav label, manager/MD/admin/purchase-only screens, dates and
number formatting (`toLocaleString` stays as-is), server-sent strings
(statuses computed on the backend keep their English value and are translated at
the display layer only where the catalog has them).

## Shape

- `contexts/LocaleContext.jsx` — `LocaleProvider` + `useLocale()` (`{locale,
  setLocale, toggleLocale}`) + `useT()` returning `t(source)`. Same `mounted`
  gate and `localStorage` handling as `ThemeContext`; also sets
  `document.documentElement.lang`. Default `en`.
- `lib/i18n/hi.js` — the Hindi catalog: a flat `{ [english]: hindi }` map.
- `lib/i18n/index.js` — `catalogs = { hi }`; `translate(locale, source)` →
  `catalogs[locale]?.[source] ?? source`. Pure, importable by the `.cjs` test.
- `components/LanguageToggle.jsx` — a small EN/हिं control; placed in the
  sidebar footer next to the existing theme control.
- `app/layout.js` — wrap children in `LocaleProvider` (inside `ThemeProvider`,
  around the rest), no other layout change.
- Wire `useT()` into `Sidebar.jsx` (sales nav labels via `t(item.name)`),
  `LeadsIndexPage.jsx`, `DealsBoard.jsx`, and the invoice/quote list surfaces per
  Scope.

## Testing

- **`lib/i18n/i18n.test.cjs`** (`node --test`, wired as `npm run test:i18n`,
  matching the existing `test:paths` / `test:brand` / `test:store` pattern):
  - `translate('hi', src)` returns a non-empty Hindi string for every key in the
    catalog, and the value differs from the English source (proves it is actually
    translated, not a copy).
  - `translate('hi', 'some string not in catalog')` falls back to the source.
  - `translate('en', src)` returns the source unchanged for catalog keys
    (identity for the default locale).
  - The catalog is valid Devanagari for a sampled set of core keys (contains
    characters in the Devanagari Unicode block) — guards against an accidental
    English paste.
- **`npm run build`** clean (App Router still compiles; provider added).
- Existing `test:paths` / `test:landing` / `test:brand` / `test:store` still
  green.

## Done when

A trial user on the sales UI can toggle EN → हिं and the sales-loop chrome (nav,
leads, deals, invoices, quotes headers/actions/statuses/empty states) renders in
Hindi, persisted across reloads; missing strings fall back to English; the i18n
catalog test and `next build` are green.

## Residuals (named, not smuggled)

- Sales-loop chrome only; detail forms, settings sub-pages, and
  manager/MD/admin/purchase screens stay English.
- No backend per-user locale column; per-browser `localStorage` only.
- No date/number/currency localization; `toLocaleString` unchanged.
- Source-string keys mean an English copy edit silently drops that Hindi string
  to fallback until the catalog key is updated — acceptable for graceful
  degradation; a future item could switch to stable ids.
- Two locales; no RTL, no locale negotiation from `Accept-Language`.
