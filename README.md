# Hats — your personal life, with room to breathe

A native Expo/React Native app for the hats you wear at home: Husband, Dad, Pets, Home, Friends & Family, and Myself.

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
