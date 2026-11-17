# Verification status

Updated October 27, 2026, on branch `codex/hats-personal-life` (PR #1).

## Verified

- TypeScript, lint, and 75 tests (56 retained engine regression tests and 19 personal tests: planner, staged chores, streak boundaries, setup import, and a guard against HTML elements in native screens).
- Production web export and Android prebuild.
- **Android release compile on GitHub Actions** (`Hats personal preview` workflow). The APK is published as a `personal-preview-N` prerelease. Use the newest one; preview 1 crashes on launch.
- APK inspection: package `com.hatsfocus.app`, versionCode 2, same signing certificate as the main `build-12` APK, so it installs as an update over the existing app. The only new permissions are camera (ingredient photos) and the opt-in focus AccessibilityService, which is bound to `BIND_ACCESSIBILITY_SERVICE`. No household names or location appear anywhere in the APK.
- **Emulator smoke test** (`Personal smoke test on an emulator`, API 34 x86_64, push to `smoke/**`): first launch shows Welcome; setup with a sample name reaches Today; My hats, Plan, Capture, and Settings render; widget refreshes run with the app open and closed; shared text reaches Capture on both warm and cold launch; the crash buffer is empty. Screenshots and logs go to a `logs/smoke-personal-*` branch.
- The private setup file imports through the app's parser (checked outside the repository).

## Fixed during verification

- Launch crash from an HTML `<br>` in the Welcome title (found by the emulator test).
- Undo after an import, reload, or cloud pull could restore pre-import data.
- Greeting punctuation ("Home. Be here., Sam").

## Not yet verified

- Real-device behavior: notifications and reminder actions, placing widgets on a home screen and acting from them, focus service consent/expiry, encryption recovery after reinstall, and the kitchen-completion streak check-in in the UI (it is covered by unit tests).
- Supabase backend, RLS with two real accounts, email OTP, and Google Calendar OAuth. These need a private backend first; see PERSONAL_SETUP.md.
- WHOOP, connected finance, Gmail/Tasks/Drive, Facebook, live weather/listings, and automatic BPS closure ingestion are not connected in this build. The app shows them as disconnected.
- Watch haptics and companion behavior.
