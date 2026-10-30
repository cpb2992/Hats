# Hats on Google Play: listing and launch plan

## The goal, stated honestly

"Top 100" on Google Play means a top chart. The overall Top Free chart is mostly big brands with ad budgets. The realistic target for Hats is the **Top Free chart in Productivity** (and Education as a second category) in the US. That chart is driven mostly by **installs per day in a short burst**, plus ratings and how many people keep the app. A few hundred installs a day in one week can move a niche app onto a category chart. The plan below is built to create that burst.

The second, steadier target: **show up first when a teacher searches "teacher planner"**. Search ranking comes from the title, short description and full description, plus ratings and installs.

## Listing

**App name (30 max):** `Hats: Teacher Planner & Focus` (29)

**Short description (80 max):**
`One thing at a time for teachers who wear a lot of hats. Knows your bell schedule.` (80)

**Category:** Productivity. Tags: Planner, To-do list, Education.

**Full description:**

> You're not just a teacher. You're the teacher, the IEP case manager, the department lead, the coach, the union rep, and the person who has to remember to defrost dinner. Hats is the planner built for that.
>
> **Pick the hats you wear.** Teacher, Special ed, Team lead, Union, Mentor, Coach, Club advisor, Grad school, Side gig, Creative, Home, Me time. Rename any of them. Hats sorts everything you capture into the right hat.
>
> **One thing at a time.** The Now screen shows only the one thing to do next, with a focus timer. Done or Not now. That's it.
>
> **It knows your bell schedule.** In class, Hats waits. In your planning period, it sizes the focus timer to the minutes you actually have left. After dismissal, home tasks take over.
>
> **Say anything.** Talk or type a messy thought between classes: "email the counselor tomorrow, print the exit tickets, and IEP meeting for A.R. Nov 2 at 2:45". Hats splits it into tasks and events with the hat, day and time filled in.
>
> **For special educators.** A caseload by initials only, with IEP and 504 goals, one-tap data points, accommodations, and review dates. Each goal charts its progress and drafts a progress report you can copy.
>
> **Pulse.** Sort a stack of exit tickets into Reteach, Practice and Extend in seconds. Every sort is saved as evidence for your evaluation.
>
> **Home, handled.** Tonight's dinner (with a defrost reminder), the weekly rhythm, and a bedtime-routine board for your kids.
>
> **Shut it down.** At the end of the day, see your wins and give every open task a date. Fridays end with a week-in-review. No streaks, no guilt.
>
> **Home-screen widgets.** Your one thing, a one-tap caseload +1, and a Say anything button.
>
> **Private by design.** No account. No ads. No tracking. Everything stays on your phone, and student details are initials only.
>
> Made by a middle school science and special education teacher who wears seven hats himself.

(About 1,900 characters; room to add a line once real reviews come in.)

## Screenshots (phone, 1080×1920 or larger, 4 to 8)

Each screenshot gets a big caption above the phone. The first three do most of the work, because that's all most people see.

1. **"One thing at a time."** The Now screen with a Special ed task and the hat patches in Up next.
2. **"Pick every hat you wear."** The hat picker on the first screen.
3. **"It knows your bell schedule."** Now during a planning period with the timer sized to the minutes left.
4. **"Say it messy. Hats sorts it."** Say anything turning one sentence into three items.
5. **"IEP data in one tap."** Caseload with a goal chart.
6. **"Exit tickets, sorted."** Pulse.
7. **"Shut the day down."** Shutdown wins.
8. **"Widgets for the busiest days."** Home screen with the three widgets.

Use the sample data (Settings → Look around with sample data) to take these, so no real student initials appear.

**Feature graphic (1024×500):** the navy cap on the dark background, with "Hats" and "for teachers who wear a lot of hats".

## Data safety form answers

- Does the app collect or share user data? **No.** (Everything is stored on the device. Nothing is sent to the developer.)
- The only data that leaves the phone is optional and goes straight to services the person chose: speech goes to the phone's speech service, and if they add their own Claude key, Say anything text goes to Anthropic. Google's guidance treats data sent directly to a service the user picks, under that service's own terms, differently from data the developer collects. Read the current Data safety help page before you submit, and if in doubt declare "App activity → Other user-generated content: shared, optional, for app functionality".
- Is data encrypted in transit? **Yes** (HTTPS to Anthropic).
- Can users ask for data to be deleted? **Yes**: Settings → Erase everything, or uninstall.
- Privacy policy URL: https://github.com/cpb2992/Hats/blob/public/PRIVACY.md (fill in the contact email first).

**Target audience:** 18 and over. This keeps Hats out of the Families program. The kids' board is used by a parent.

**Content rating questionnaire:** Productivity / utility, no violence, no user-to-user communication, no purchases. Expect "Everyone".

**Permissions to explain:** microphone (Say anything), notifications (reminders), exact alarms if Play asks (timed reminders).

## Getting it on the store

1. **Developer account.** $25 one time at play.google.com/console. A personal account made now must run a **closed test with at least 12 testers for 14 straight days** before it can publish. An organization account skips this but needs a D-U-N-S number, which takes weeks.
2. **Build.** `npx eas-cli@latest build --platform android --profile production` makes the signed app bundle (.aab). EAS keeps the signing key. One free EAS account is enough.
3. **Internal test first** (no review, up to 100 people): `npx eas-cli@latest submit --platform android --profile production` sends it to the internal track as a draft.
4. **Closed test, 14 days, 12+ testers.** Your 7th grade team, your department, the Merrimack candidate, and a few teachers from the district are a natural first 12 to 20. Ask them to actually use it for the two weeks (Google now checks that testers use the app) and to send you one thing that confused them.
5. **Apply for production**, then publish.

## The launch burst (what actually moves the chart)

Charts reward installs in a short window, so save every channel for **one launch week** instead of trickling.

- **Timing.** The best weeks for a teacher productivity app are the first week of January (new semester and New Year planning, the biggest week of the year for productivity apps) and mid-August (back to school). A January launch gives time for the closed test, a round of fixes and the first reviews. Do the closed test in November and December.
- **Teacher networks, all in the same week:** BTU stewards and building reps, your district's teacher groups, teacher Facebook groups (special education teachers, middle school science, new teachers), r/Teachers and r/specialed (follow each sub's self-promotion rules: share the story, not an ad), and teacher TikTok/Instagram. A 30-second screen recording of Say anything turning a messy sentence into three tasks is the single best ad.
- **The angle that travels:** "A teacher with seven hats built the planner he needed." People share stories, not feature lists.
- **Ratings in launch week.** Ask the closed-test teachers to leave an honest review on day one. The in-app prompt then asks real users only after a good stretch of use (5+ days, 15+ tasks, right after shutting the day down).
- **Reply to every review** in the first months. It lifts ratings and it shows up in search.
- **Tell a teacher** is in Settings; mention it in the Friday recap once people like the app.

## What to watch in Play Console

- **Day-1 and day-7 retention.** If people install and leave, the chart won't hold. The first screen and the empty Now screen are where to look first.
- **Store listing conversion** (visitors who install). Try a different first screenshot after two weeks with a store listing experiment.
- **Ratings.** Stay above 4.5.
- **Android vitals** (crashes, app-not-responding). Google ranks apps with bad vitals lower.

## Next features that would help it grow (not built yet)

- An onboarding step that sets the bell schedule (pick a template, adjust times), since that's what makes Hats different.
- Backup and restore to a file, so people trust it with their data.
- iPhone. Half of teachers use one, and every teacher who shares it with an iPhone colleague is a lost install today.
- A shared "team" hat for grade-level teams, which spreads Hats through a school.
