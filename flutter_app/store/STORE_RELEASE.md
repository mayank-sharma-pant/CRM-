# Mobile store release (Phase 6.8 / 7.3)

The Dart app lives in `flutter_app/`. **Android and iOS project trees are not in git.** Generate them locally, then upload from a machine with Flutter and store credentials.

**Listing copy is versioned** under [`store/metadata/`](./metadata/) (Fastlane `en-US` layout, filled by hand — no Fastlane dependency): `android/en-US/` and `ios/en-US/` title/description files, `data_safety.md` (Play Data Safety answers), and `privacy_url.txt`. Edit those files, not the prose below, and keep them in sync with the public policy at `/privacy`.

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

1. Create an upload keystore (do **not** commit it). Copy [`store/key.properties.example`](./key.properties.example) to `android/key.properties` (already gitignored) and fill in real values.
2. Point `android/app/build.gradle` `signingConfigs.release` at that file:

   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file("key.properties")
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   android {
       signingConfigs {
           release {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
               storePassword keystoreProperties['storePassword']
           }
       }
       buildTypes {
           release { signingConfig signingConfigs.release }
       }
   }
   ```

3. Upload an AAB: `flutter build appbundle --release`.

## Privacy / data safety

- Permissions expected: `INTERNET` only for v1.
- Accounts: email + password / email OTP; optional TOTP 2FA.
- Privacy policy URL to paste in Play Console / App Store Connect: `https://crm.perioxia.com/privacy` (public page shipped in 7.3, `frontend/app/privacy/page.jsx`; also in `store/metadata/privacy_url.txt`). Ship the frontend so it is live **before** submitting the listing.
- Data collected: account email, CRM records the user already has access to. No advertising SDK.

## Listing copy (sales field path)

Copy is versioned in [`store/metadata/`](./metadata/) — paste from there:

- **Android title / short / full:** `metadata/android/en-US/{title,short_description,full_description}.txt`
- **iOS name / subtitle / description:** `metadata/ios/en-US/{name,subtitle,description}.txt`
- **Data Safety answers:** `metadata/data_safety.md`

Length limits are guarded by `frontend/lib/storePrivacy.test.cjs` (Android title ≤ 30 / short ≤ 80; iOS name ≤ 30 / subtitle ≤ 30). Keep the copy consistent with the landing/brand honesty tests (6.11 / 6.12).

## App Store (second)

Same binary via `flutter build ipa`. Add `ITSAppUsesNonExemptEncryption` = false in Info.plist if you only use HTTPS + OS crypto (confirm with counsel). Age rating 4+.

## Residual

This environment cannot run `flutter` or talk to Play Console / App Store Connect. Upload is a human deploy step. 7.3 made the listing **submittable** from git — public `/privacy` page, versioned `metadata/`, signing scaffold, version invariants (`flutter_app/test/store_release_test.dart`) — but not **submitted**: no `flutter create`, no keystore, no AAB/IPA, no screenshots (design step), `en-US` listing only.
