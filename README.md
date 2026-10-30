# Hats

**You wear a lot of hats. Keep them all in one place.**

> **This is the `public` branch: the version of Hats headed for Google Play.** It's your newest Hats (from `codex/hats-personal-life`) plus: **packs** (tools any hat can add: 1:1s, jobs and invoices, deadlines, care list, commitments, games and practices, projects, issues; `src/personal/packs.ts`), its own app ID (`com.hatsplanner.app`, so test copies install beside your personal Hats), the `public` update channel, no accessibility service (Play rarely approves it), a rare Play rating prompt, Tell a friend / Rate / Privacy in Settings, the privacy policy ([`PRIVACY.md`](PRIVACY.md)) and the store listing and launch plan ([`store/LISTING.md`](store/LISTING.md)). Test builds: the **Public Hats test build** workflow posts `Hats-public.apk` as a pre-release. The earlier public attempt (built from the old `main`) is kept on `public-v1`.

A native Expo/React Native app for the roles you juggle: partner, parent, pets, home, work, friends and family, yourself, and any hat you add (Coach, Garden, Band). Setup asks who's at home and which hats you wear, and builds your hats, work hours, and evenings from the answers.

The personal rebuild combines separate spaces for each hat with a calm daily plan. It includes staged chores (laundry ends when it is put away), next-opening rescheduling, low-energy planning, date preparation with separate childcare/transport costs, family activities, meals and groceries, private reflections and gift ideas, pets and chosen contacts, manual spending targets and a reconsider-later list, voice/photo capture, optional adventures, and configurable daily/weekly streaks.

Android widgets show your personal next step. Optional, explicitly enabled native distraction protection helps preserve user-started family sessions. Secure account sync and read-only Google Calendar have a configurable private backend; they are not connected until configured and authorized. Other providers remain visibly disconnected.

No personal household profile or credentials are embedded in public source or builds. Import a private setup file once, or configure the app yourself. The original on-device Hats data is preserved separately.

## Getting the preview

Personal preview builds are published as prereleases by the **Hats personal preview** workflow. Download `Hats-Personal.apk` from a completed preview release. Do not mistake a queued or failed workflow for a ready APK. Preview APKs use the standard development signing key; store distribution requires production signing and review.

## Development

```bash
npm ci
npm run typecheck
npm run lint
npm test
npx expo export --platform web
npx expo run:android
```

Read [setup, privacy, provider requirements, and verification](docs/PERSONAL_SETUP.md) for installation, cloud SQL, native modules, and known limits. Read AGENTS.md before changing Expo or native APIs.
