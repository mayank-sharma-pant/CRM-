# Phase 7.3 — Store-listed mobile (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.3,
> [2026-08-26-phase7-trial-defense-design.md](./2026-08-26-phase7-trial-defense-design.md) item 7.3,
> and [2026-08-25-phase6-mobile-2fa-store-design.md](./2026-08-25-phase6-mobile-2fa-store-design.md)
> (6.8, which shipped the Flutter MFA login path and the first `STORE_RELEASE.md`).
> Grounded in the code as of 26 Aug 2026: `flutter_app/` (Dart app, no `android/`
> or `ios/` tree in git), `flutter_app/store/STORE_RELEASE.md`, and the four
> frontend public-path gates (`src/middleware.ts`, `components/RouteGuard.jsx`,
> `components/Layout.jsx`, `services/api.js`).

## Problem

Table-stakes CRMs have an app in the Play Store and the App Store. 6.8 put the
**code** path there — MFA login, secure-storage tokens, the sales field listing —
and a `STORE_RELEASE.md` that says "generate the platform trees, sign, upload."
It did not make the store **listing** real. Three concrete gaps block a human
from actually shipping the listing, and one of them is a hard store-review
rejection:

1. **No public privacy policy.** Both Play Data Safety and App Store review
   require a privacy-policy URL that loads **with no login**. The only privacy
   surface today is `frontend/app/settings/privacy` (authenticated DPDP retention
   controls, 6.19), and `STORE_RELEASE.md:29` openly points the Play field at the
   bare homepage "until a dedicated `/privacy` page exists." A reviewer that hits
   an auth wall rejects the listing. This is also the 6.11 "no legal pages"
   residual.
2. **Listing copy lives in prose.** The store title / short / full description and
   the data-safety answers sit as paragraphs inside `STORE_RELEASE.md`. Nothing
   an uploader (or a future Fastlane/CI step) can consume as files, and nothing a
   test can assert stays honest against the landing/brand copy (6.11 / 6.12).
3. **Signing is described, not scaffolded.** `STORE_RELEASE.md` says "create an
   upload keystore, point `signingConfigs.release` at it" but ships no example
   `key.properties` and no copy-pasteable Gradle block, so the human step is
   guesswork.

## What this environment can and cannot do (stated, not smuggled)

This environment has **no Flutter SDK and no store credentials**, exactly as 6.8
recorded. Therefore 7.3 **cannot**: run `flutter create`, generate the `android/`
or `ios/` trees, produce a keystore, build an AAB/IPA, or upload to Play Console
/ App Store Connect. Those stay a documented **human deploy step** — which the
phase spec's "Done when" already anticipates ("a store build **or** a documented
sideload while listing is in review").

7.3 delivers the parts that **can** live in git and be verified here: the public
privacy page, the versioned listing metadata, the signing scaffolding, and the
docs that turn the upload into a checklist instead of a research project.

## Decisions (locked)

1. **Public privacy page at `/privacy`**, a new `frontend/app/privacy/page.jsx`,
   server-rendered static content, **no auth, no API call**. It is a legal
   surface, not a data control — the authenticated `settings/privacy` retention
   screen stays exactly as it is and is **linked from** the public page for
   logged-in users who want to exercise DPDP rights.
2. **`/privacy` is whitelisted in all four public-path gates**, the same set 6.8 /
   3.1 had to touch for `/settings/security`: `src/middleware.ts` `isPublicRoute`,
   `components/RouteGuard.jsx` `PUBLIC_PATHS`, `components/Layout.jsx` bare-chrome
   check, and the `services/api.js` 401 interceptor. Missing any one either
   bounces a logged-out reviewer to `/login` (middleware / RouteGuard) or wraps
   the policy in app chrome (Layout). A single missed gate reproduces the exact
   rejection this item exists to prevent, so all four change together.
3. **Content is honest and matches the app's real data behaviour**, derived from
   the same facts as `STORE_RELEASE.md`'s data-safety section: account email;
   CRM records the signed-in user already has access to; tokens in the OS secure
   store; **no advertising SDK, no third-party analytics, no location, no
   selling**. It names the sub-processors the product actually uses and only
   those (Razorpay for payments, Gupshup for WhatsApp, Exotel for calls, Google /
   Microsoft for opt-in mailbox / calendar OAuth) — no aspirational vendor. A
   `Last updated` date and a contact address. It must **not** claim anything the
   landing-honesty (6.11) and brand (6.12) tests forbid.
4. **Listing metadata is versioned as files**, in the Fastlane
   `supply` / `deliver` directory layout so a later CI step can consume it
   unchanged, but populated **by hand** (no Fastlane dependency added):
   `flutter_app/store/metadata/android/en-US/{title,short_description,full_description}.txt`
   and `flutter_app/store/metadata/ios/en-US/{name,subtitle,description}.txt`,
   plus a human-readable `data_safety.md` (Play Data Safety answers) and the
   `privacy_url`. This is the single source of truth for the copy; `STORE_RELEASE.md`
   points at it instead of restating it. Play limits are respected: Android title
   ≤ 30 chars, short description ≤ 80; iOS name ≤ 30, subtitle ≤ 30.
5. **Signing scaffolding, not secrets.** Add
   `flutter_app/store/key.properties.example` (placeholder values, safe to commit)
   and a copy-pasteable `signingConfigs.release` Gradle snippet in
   `STORE_RELEASE.md`. The real `android/key.properties` and `*.jks` stay
   gitignored (already are, `flutter_app/.gitignore:21-22`). The example lives
   under `store/` (not `android/`, which is not in git and gets regenerated by
   `flutter create`).
6. **Version discipline is asserted, not just documented.** `pubspec.yaml` stays
   `1.0.0+1` for the first submission; the app id / bundle stays
   `com.perioxia.perioxia_crm`. A Dart test pins the version-string **shape**
   (`^\d+\.\d+\.\d+\+\d+$`) and the org constant so a careless bump that would be
   rejected by the store (or mismatch the two platforms) fails a test instead of
   a reviewer. Runs under `flutter test` locally, alongside the 6.8 tests; not run
   in this environment (no SDK), same residual 6.8 already carries.
7. **No new pip deps, no new npm deps, no Flutter package.** The privacy page is
   plain JSX; the metadata is plain text/markdown; the tests are the repo's
   existing `node --test` (`.cjs`) and `flutter test` runners.
8. **`STORE_RELEASE.md` is updated, not replaced.** It gains: privacy URL → the
   real `/privacy` route, a pointer to `store/metadata/`, the signing block, and a
   7.3 note. Its "human uploads from a machine with Flutter + credentials" residual
   stays — that is the honest boundary of what this repo can do.

## Non-goals

Running `flutter create` or committing `android/` / `ios/`; generating or storing
a keystore; building or uploading an AAB / IPA; Fastlane / CI automation of the
upload; a terms-of-service or pricing page (7.3 is the store-required privacy
surface only); localised store listings beyond `en-US` (Hindi UI is 7.4, and even
then the store listing locale is separate); screenshots / feature-graphic asset
generation (binary art, human/design step); in-app purchase or store billing
(billing is Razorpay web, Phase 1); push notifications; deep links.

**Not closed:** the app is not *in the stores* at the end of 7.3 — it is
*submittable*. Uploading needs a machine with the Flutter SDK, a signing key, and
Play / App Store accounts, none of which exist here. That is the same posture 6.8
took and the phase "Done when" explicitly allows.

## Frontend — `/privacy`

`frontend/app/privacy/page.jsx`: a static, server-rendered policy. Sections:
who we are (Perioxia CRM, a B2B tool sold to companies whose staff sign in);
what data the app handles (account email; CRM records the user's company already
holds; auth tokens in OS secure storage); what it does **not** do (no ads, no
analytics SDK, no location, no data sale); sub-processors (Razorpay, Gupshup,
Exotel, Google/Microsoft OAuth — each only when the company enables it); data
rights and the pointer to `settings/privacy` for retention/export/delete (DPDP,
6.19); a contact address; a `Last updated` date.

Whitelisting (all four, decision 2):

| File | Change |
|---|---|
| `src/middleware.ts` | add `pathname === '/privacy'` to `isPublicRoute` |
| `components/RouteGuard.jsx` | add `'/privacy'` to `PUBLIC_PATHS` |
| `components/Layout.jsx` | add `pathname === '/privacy'` to the bare-chrome condition |
| `services/api.js` | add `/privacy` to the 401-interceptor `isPublicPath` |

No new nav link in the app shell — this is a footer/legal page reached by URL and
by the Play/App listing, not a CRM feature.

## Store metadata files

```
flutter_app/store/metadata/
  privacy_url.txt                         # https://crm.perioxia.com/privacy
  data_safety.md                          # Play Data Safety answers, prose
  android/en-US/title.txt                 # "Perioxia CRM"            (<= 30)
  android/en-US/short_description.txt      #                          (<= 80)
  android/en-US/full_description.txt       # long listing body
  ios/en-US/name.txt                       # "Perioxia CRM"           (<= 30)
  ios/en-US/subtitle.txt                   #                          (<= 30)
  ios/en-US/description.txt                # long listing body
```

Copy is lifted from the honest listing text already in `STORE_RELEASE.md` (6.8),
kept consistent with the landing/brand copy: existing-customer framing, GST
invoices, follow-ups, optional 2FA; no fabricated scale, no unshipped
integration.

## Signing scaffolding

`flutter_app/store/key.properties.example`:

```properties
storePassword=changeme
keyPassword=changeme
keyAlias=upload
storeFile=/absolute/path/to/upload-keystore.jks
```

`STORE_RELEASE.md` gains the Gradle block that reads it:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
// signingConfigs.release { storeFile file(keystoreProperties['storeFile']) ... }
```

## Tests

1. **`frontend/lib/storePrivacy.test.cjs`** (`node --test`, mirrors
   `landingHonesty.test.cjs`):
   - `app/privacy/page.jsx` exists and contains the required disclosures
     ("privacy", the data-handling and no-ads statements, a contact address,
     a `settings/privacy` link, a `Last updated` marker).
   - It contains **none** of the landing-honesty forbidden phrases (no fabricated
     vendors / scale) — reuse the 6.11 forbidden list.
   - All four gates whitelist `/privacy`: assert the literal `'/privacy'`
     substring in `src/middleware.ts`, `components/RouteGuard.jsx`,
     `components/Layout.jsx`, and `services/api.js`.
2. **`flutter_app/test/store_release_test.dart`** (`flutter test`, run locally):
   - `pubspec.yaml` `version:` matches `^\d+\.\d+\.\d+\+\d+$`.
   - `pubspec.yaml` `name:` is `perioxia_crm` (bundle-id invariant with the
     documented `--org com.perioxia`).
3. **Metadata length guards** — folded into `storePrivacy.test.cjs` (it already
   runs in the JS suite): Android `title` ≤ 30 and `short_description` ≤ 80 chars;
   iOS `name` ≤ 30 and `subtitle` ≤ 30; `privacy_url.txt` ends in `/privacy`.

`npm run test:landing` and `test:brand` stay green (the new page must not trip
them). Add `test:store` to `frontend/package.json` scripts.

## Deploy / human steps (unchanged boundary)

No migration, no env var, no dependency. Ship the frontend so `/privacy` is live
**before** the store listing points at it. Then, on a machine with Flutter + store
credentials, follow `STORE_RELEASE.md`: `flutter create` the platform trees,
create the upload keystore from `key.properties.example`, `flutter build
appbundle` / `flutter build ipa`, paste the `store/metadata/` copy and the
`/privacy` URL into the consoles, upload. That upload is the residual this
environment cannot perform.

## Residuals

Not in the stores yet (submittable, not submitted); `en-US` listing only;
no screenshots / feature graphic (design step); no Fastlane/CI upload automation;
no terms-of-service or pricing page; `android/` / `ios/` still generated locally,
so the signing scaffold lives in `store/`, not in the (regenerated) `android/`
tree; the Dart test runs only where the Flutter SDK is installed (same as every
6.8 / 3.9 Flutter test).
