# Mobile store release (Phase 6.8)

The Dart app lives in `flutter_app/`. **Android and iOS project trees are not in git.** Generate them locally, then upload from a machine with Flutter and store credentials.

## Generate platform projects

Requires Flutter SDK 3.2+:

```bash
cd flutter_app
flutter create . --org com.perioxia --project-name perioxia_crm --platforms=android,ios
flutter test
```

Application id / bundle: `com.perioxia.perioxia_crm` (from `--org` + project name). If Play already reserved `com.perioxia.crm`, set `applicationId` in `android/app/build.gradle` and `PRODUCT_BUNDLE_IDENTIFIER` in Xcode to match.

Version: `pubspec.yaml` `1.0.0+1` (versionName / versionCode).

## Signing (Play)

1. Create an upload keystore (do **not** commit it). Put passwords in `android/key.properties` (already gitignored).
2. Point `android/app/build.gradle` `signingConfigs.release` at that file.
3. Upload an AAB: `flutter build appbundle --release`.

## Privacy / data safety

- Permissions expected: `INTERNET` only for v1.
- Accounts: email + password / email OTP; optional TOTP 2FA.
- Privacy policy URL to paste in Play Console: `https://crm.perioxia.com` until a dedicated `/privacy` page exists (Phase 6.11).
- Data collected: account email, CRM records the user already has access to. No advertising SDK.

## Listing copy (sales field path)

**Short:** Perioxia CRM for field sales — leads, follow-ups, and invoices.

**Full:** Sign in to your Perioxia company account. Work leads, complete follow-ups, and view GST invoices on the go. Two-factor authentication is supported when your company enables it. This app is for existing Perioxia customers; it does not create a company by itself as the primary path.

## App Store (second)

Same binary via `flutter build ipa`. Add `ITSAppUsesNonExemptEncryption` = false in Info.plist if you only use HTTPS + OS crypto (confirm with counsel). Age rating 4+.

## Residual

This environment cannot run `flutter` or talk to Play Console / App Store Connect. Upload is a human deploy step.
