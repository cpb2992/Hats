# Personal Hats setup and verification

The personal rebuild is an Expo SDK 58 native app. `src/personal` is the new domain; the original engine and its tests are retained for data compatibility and history. No school routes are exposed in the app. A separate encrypted `hats.personal.v2` key leaves `hats.data.v1` untouched. Importing original Home tasks is explicit and excludes tasks with student links.

## Run

```
npm ci
npm run typecheck
npm run lint
npm test
npx expo export --platform web
npx expo run:android
```

The native focus module needs a development/production build, not Expo Go. It is autolinked from `modules/hats-focus`. Generated `android/` and `ios/` projects remain untracked.

## Private profile

Public source and APKs do not embed the owner's household details. Use **Import my setup or backup** to load a private `hats-personal-profile` JSON file. The profile loader accepts names, chosen people/pets, preferences, and notes. It never imports credentials or provider configuration. A full exported personal backup uses schema version 2. A pre-import recovery snapshot is kept separately.

## Sync backend

1. Apply `supabase/migrations/202610280001_personal_state.sql` in a user-controlled Supabase project.
2. Enable email OTP and include the email `{{ .Token }}` in the sign-in template. Configure the project's sign-up policy as appropriate for a personal deployment.
3. In Hats Settings, enter the project's HTTPS URL and **public publishable/anon** key. Never enter a service-role secret.
4. Sign in and sync. A conflicting cloud snapshot requires an explicit version choice; the local version is backed up first. Revision comparisons happen atomically in the database. Local changes are retained on network errors.
5. Verify RLS with two separate test accounts before production: neither may read or update the other's row. Revoking a session must stop API access.

Data is encrypted on the native device using Expo Crypto AES-GCM; the key is held in SecureStore. Cloud synchronization uses account authorization, RLS, TLS, and the provider's storage protection. It is **not end-to-end encryption**. The browser preview uses browser storage and session-scoped auth secrets. Exported JSON is readable, private data. Photo attachments currently remain local; their text notes can sync.

## Google Calendar

Configure Google as a Supabase OAuth provider with the matching Google Cloud OAuth consent/client setup. Add `hats://auth-callback` to Supabase's allowed redirect URLs; configure the provider callback URL from the Supabase dashboard in Google Cloud. For web development add the exact development origin and callback used by Expo Linking.

The app uses PKCE and requests only read-only Calendar event and calendar-list scopes. It reads selected calendars for the next 30 days. It does not create, update, or delete any Google Calendar event. Imported events are replaced by stable IDs on refresh, avoiding duplicate imports. Provider-token expiration requires reconnecting Google. Do not claim automatic live updates.

## Android attention protection

The optional AccessibilityService observes `TYPE_WINDOW_STATE_CHANGED` and only checks the package name. It cannot retrieve screen contents, does not log accessibility events, and does not transmit accessibility data. When a user-started protected session is active, it returns the phone home on opening a chosen distracting app. Hats itself, Settings, phone/emergency apps, and any app not explicitly selected are unaffected. The feature is inactive until the user accepts the in-app disclosure and enables the service in Android Settings. They can stop a session or disable the service at any time.

Validate on the actual device: allowed apps continue working; selected apps return home during the session; protection expires on time; turning consent off immediately stops enforcement; the app and system Settings remain accessible. Google Play distribution requires the relevant accessibility declaration and review; this repository does not represent that review as complete.

Android text sharing uses a `SEND text/plain` intent filter. Shared text is consumed once into Capture as an idea, with no external network processing. Verify both cold-launch and warm-app sharing on device.

## Reminders and widgets

Enable notifications inside Hats. Current tasks remain in the app and widget after dismissing a notification. Modern Android allows dismissal of many ongoing notices. Notification bodies are generic so private notes and personal task details do not appear on the lock screen. Reminder actions open the app to reliably finish a step or reschedule it. Widget actions operate on the separate personal store.

## Current limits

- WHOOP, financial accounts, Gmail, Google Tasks/Drive, Facebook, live local listings/weather, and automatic BPS closure ingestion are not connected in this build. Disconnected states are explicit; no data is fabricated. Official BPS calendar and Maps links provide manual access.
- Calendar OAuth and cloud recovery require the private backend configuration and real account testing; a local build alone is not an end-to-end provider verification.
- A family outing search link is not a vetted recommendation or booking. Childcare and travel are not presumed confirmed.
- Flexible routine windows are initial estimates, editable in Settings; exact dinner and bedtime times were not supplied.
- Streaks are user-chosen daily or weekly behaviors. Weekly targets count distinct check-in days. Current and best streaks are stored through the underlying check-in history; future or duplicate checks do not inflate progress. No relationship score is inferred.

## Meaningful checks

Personal tests cover unfinished laundry steps, collision-free scheduling, fixed commitments, next-opening deferral, low-energy capacity, recurrence de-duplication, confirmed closures, daily and weekly streak boundaries, shopping lists, budget unknowns, capture, and activity variation. Existing engine tests remain as regression coverage. Typecheck, lint, web export, native autolinking, and Android compilation are separate checks; do not report device behavior as tested from a TypeScript build.
