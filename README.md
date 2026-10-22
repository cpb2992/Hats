# Hats

One thing at a time, for everyone who wears a lot of hats. Hats sorts everything you capture into the hats you wear (Teacher, SPED, Dept Head, BTU, Mentor, Author, Home), knows your bell schedule, and shows only what's Now.

Built with Expo (React Native), the same way as Pace. Everything is stored on the phone. Student details are initials only.

## What's in the app

- **Now.** One task at a time with a full-screen focus timer, Done and Not now. It follows your bell schedule: in class, it shows the class and one-tap logging for your students in that section; during a meeting it offers to catch action items; in free blocks (prep, RBR) the focus timer is sized to the minutes you have left. Below: Up next, and your day as a timeline.
- **Say anything.** Talk or type. A run-on thought becomes separate tasks, each with its hat, day, time, length and student picked up automatically ("IEP meeting for A.R. Nov 2 at 2:45").
- **Morning plan.** WHOOP recovery, the defrost reminder for tonight's dinner, your open time today, and today's three. Low recovery days lead with quick wins.
- **Caseload.** Students by initials with goals (tally or "x of n"), accommodations and review dates. One tap logs a data point, with Undo. Each goal charts its checks and drafts a progress report you can share or copy.
- **Pulse.** Sort a stack of exit tickets into Reteach / Practice / Extend, edit tomorrow's moves, and see the next Boost block for that class. Each sort is saved as monthly evaluation evidence, shareable as a one-page summary.
- **Home Base.** Tonight's dinner, pick tomorrow's while you're calm, the evening, and the weekly rhythm (laundry days, baths, cleaners, ballet).
- **Kids' board.** A bedtime routine board for a tablet or an unfolded phone: tap steps, earn team stars toward a reward, "Caught being kind". Checkmarks clear each night.
- **Shutdown and Friday recap.** At 4:45, see the day's wins and give each open school task a date. Fridays end with the week's wins by hat. No streaks.
- **Reminders.** 6:15 morning plan (with the defrost reminder), free-block starts, shutdown, and tasks with a time. A running focus timer shows on the lock screen.
- **Home-screen widgets.** *Now* shows your one thing with Focus and Done (or your class while you're teaching). *Caseload +1* logs a data point with one tap, with the class in front of you first. *Say anything* opens capture. Add them from Settings → Home-screen widgets, or long-press the home screen → Widgets → Hats.
- **Foldables and tablets.** Wide screens switch to two columns.

The bell schedule is in `src/engine/schedule.ts` and editable in Settings → Bell schedule.

## 1. Get it on your phone

### Android, no computer

Every push to `main` builds `Hats.apk` with GitHub Actions and posts it at github.com/cpb2992/Hats/releases.

1. On the phone, open the Releases page and tap **Hats.apk** under the newest build.
2. Open the download. If Android asks, allow your browser to install unknown apps.
3. If Play Protect warns about an unknown developer, tap **More details → Install anyway**. On Samsung phones, if Auto Blocker stops the install, turn it off in Settings → Security and privacy → Auto Blocker, install, then turn it back on.
4. To update, install the newest build over the old one. Your data stays on the phone.

This build is signed with a debug key: fine for your own phone, not for the Play Store. The repo is public, so the code is visible to anyone with the link; your tasks, students and schedule edits live only on the phone.

### With a computer

You need Node.js 20+. Voice capture uses a native module, so use a development build rather than Expo Go:

```bash
npm install
npx expo run:android
```

Useful commands:

```bash
npm test             # engine tests (capture parser, Now queue, schedule, reports, reminders)
npm run typecheck    # TypeScript
npx expo lint        # lint
```

## Project layout

```
src/app/            screens (Expo Router): tabs (Now, Caseload, Pulse, Home), focus, capture, morning,
                    shutdown, recap, kids, schedule, settings, task and student editors
src/engine/         logic with no UI: parser, Now queue, bell schedule, progress reports, Pulse, reminders plan
src/store/          app state and on-device persistence
src/services/       notifications and speech recognition
src/widgets/        home-screen widgets: designs, tap handler, live updates
src/ui/             theme, components, icons, spot illustrations, boot screen, toasts
assets/             icon (embroidered gold cap), adaptive icon, splash, widget fonts and previews
.github/workflows/  Android APK build on every push
```
