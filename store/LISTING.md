# Hats on Google Play: listing and launch plan

Hats is for anyone who juggles roles. Teachers are the launch community, not the whole audience.

## The goal, stated honestly

"Top 100" on Google Play means a top chart. The overall Top Free chart is mostly big brands with ad budgets. The realistic target for Hats is the **Top Free chart in Productivity** in the US. That chart is driven mostly by **installs per day in a short burst**, plus ratings and how many people keep the app. A few hundred installs a day in one week can move an app onto a category chart.

The positioning: **the planner for people who wear a lot of hats.** Most to-do apps sort by project. Hats sorts by the roles in your life (your job, your kids, your side gig, your mom's care, your team), and each role brings its own small toolkit. Teachers are the first community to win, because that's where the founder has reach, but the app and the listing are for everyone.

The second, steadier target is search. Show up for "planner", "to do list for busy parents", "adhd planner" (careful: describe, don't claim medical benefit), "work life balance app" and "teacher planner".

## Listing

**App name (30 max):** `Hats: Planner for Every Role` (28)

**Short description (80 max):**
`Work, kids, side gig, everything else: one thing at a time, sorted by your hats.` (79)

**Category:** Productivity. Tags: Planner, To-do list, Time management.

**Full description:**

> You're not one person with one to-do list. You're an employee, a parent, maybe a team lead, a coach, a student, the one who handles Mom's refills, the one with the side gig. Hats is the planner built for that.
>
> **Pick the hats you wear.** Work, Team lead, Mentor, Union, Side gig, Teacher, Special ed, Student, Parent, Caregiver, Home, Volunteer, Coach, Creative and Me time. Rename any of them. Hats sorts everything you capture into the right one.
>
> **Every hat brings its own pack.**
> • Team lead: 1:1s with each person, and when you last met
> • Side gig: jobs and invoices, what's paid this month and what you're still owed
> • Student: deadlines with a countdown
> • Caregiver: refills and appointments that come back on their own
> • Coach: practices and games for the season
> • Creative: each project's next step and your sessions this week
> • Parent: a bedtime routine board the kids can tap
> • Home: tonight's dinner, a defrost reminder and the weekly chores
> • Teacher and Special ed: bell schedule, exit-ticket sorting and an IEP caseload
> Anything with a date shows up in Now on its day.
>
> **One thing at a time.** The Now screen shows only the one thing to do next, with a focus timer. Done or Not now. That's it.
>
> **It knows your day.** Set your work hours and regular meetings. Hats waits while you're busy, sizes the focus timer to the time you actually have, and switches to home stuff when work ends.
>
> **Say anything.** Talk or type a messy thought: "1:1 with Priya Tuesday at 2, invoice the Lees, and pick up Mom's prescription Friday". Hats splits it into tasks and events with the hat, day and time filled in.
>
> **Shut it down.** At the end of the day, see your wins and give every open task a date. Fridays end with your week by hat. No streaks, no guilt.
>
> **Home-screen widgets.** Your one thing, plus a one-tap Say anything.
>
> **Private by design.** No account. No ads. No tracking. Everything stays on your phone.
>
> Made by a teacher, union rep, department head, author and dad of three who needed it himself.

(About 2,400 characters.)

## Screenshots (phone, 1080×1920 or larger, 4 to 8)

Each screenshot gets a big caption above the phone. The first three do most of the work.

1. **"One thing at a time."** Now, with Up next showing four different hats.
2. **"Pick every hat you wear."** The grouped hat picker (Work, School, Life), each with its pack.
3. **"Every hat brings its own tools."** A row of three packs: 1:1s, Jobs and invoices, Care list.
4. **"Say it messy. Hats sorts it."** Say anything turning one sentence into three items across three hats.
5. **"It knows when you're busy."** The work week setup.
6. **"Your side gig, handled."** Jobs and invoices with the month total.
7. **"For teachers too."** Caseload and Pulse in one shot.
8. **"Shut the day down."** Shutdown wins.

Take these with the sample data (Settings → Look around with sample data), which is an office worker with a side gig and kids. Make a second set from a teacher setup for a store listing experiment later.

**Feature graphic (1024×500):** the navy cap with five hat patches around it, "Hats" and "the planner for every role you play".

## Data safety form answers

- Does the app collect or share user data? **No.** (Everything is stored on the device. Nothing is sent to the developer.)
- The only data that leaves the phone is optional and goes straight to services the person chose: speech goes to the phone's speech service, and if they add their own Claude key, Say anything text goes to Anthropic. Google's guidance treats data sent directly to a service the user picks, under that service's own terms, differently from data the developer collects. Read the current Data safety help page before you submit, and if in doubt declare "App activity → Other user-generated content: shared, optional, for app functionality".
- Is data encrypted in transit? **Yes** (HTTPS to Anthropic).
- Can users ask for data to be deleted? **Yes**: Settings → Erase everything, or uninstall.
- Privacy policy URL: https://github.com/cpb2992/Hats/blob/public/PRIVACY.md (fill in the contact email first).

**Target audience:** 18 and over. This keeps Hats out of the Families program. The kids' board is used by a parent. (Students under 18 are a natural audience for the Student hat; adding 13–17 later brings extra policy requirements, so leave it for after launch.)

**Content rating questionnaire:** Productivity / utility, no violence, no user-to-user communication, no purchases. Expect "Everyone".

**Permissions to explain:** microphone (Say anything), notifications (reminders), exact alarms if Play asks (timed reminders).

## Getting it on the store

1. **Developer account.** $25 one time at play.google.com/console. A personal account made now must run a **closed test with at least 12 testers for 14 straight days** before it can publish. An organization account skips this but needs a D-U-N-S number, which takes weeks.
2. **Build.** `npx eas-cli@latest build --platform android --profile production` makes the signed app bundle (.aab). EAS keeps the signing key. One free EAS account is enough.
3. **Internal test first** (no review, up to 100 people): `npx eas-cli@latest submit --platform android --profile production` sends it to the internal track as a draft.
4. **Closed test, 14 days, 12+ testers.** Your 7th grade team and department are a natural start; add friends and family who aren't teachers so the non-teacher path gets tested too. Ask them to actually use it for the two weeks (Google now checks that testers use the app) and to send you one thing that confused them.
5. **Apply for production**, then publish.

## The launch burst (what actually moves the chart)

Charts reward installs in a short window, so save every channel for **one launch week** instead of trickling.

- **Timing.** The first week of January is the biggest week of the year for planner and productivity apps (New Year planning, new semester). Run the closed test in November and December, fix what testers hit, and launch January 4–10.
- **Start with the community you have, then widen.** Teachers first: BTU stewards and building reps, district teacher groups, teacher Facebook groups, r/Teachers. Then the wider "lots of hats" crowd in the same week: working-parent groups and r/workingmoms and r/daddit, caregiver communities (r/AgingParents), side-hustle communities, r/productivity and r/getdisciplined. Follow each community's self-promotion rules: share the story, not an ad.
- **One short video per audience.** A 20 to 30 second screen recording of Say anything turning a messy sentence into tasks across three hats, re-cut with a different sentence for each crowd (a teacher, a parent with a sick parent, someone with a side gig). Post on TikTok, Instagram Reels and YouTube Shorts.
- **The angle that travels:** "I wear seven hats, so I built a planner that sorts by hat." People share stories, not feature lists.
- **Ratings in launch week.** Ask the closed-test group to leave an honest review on day one. The in-app prompt then asks real users only after a good stretch of use (5+ days, 15+ tasks, right after shutting the day down).
- **Reply to every review** in the first months. It lifts ratings and it shows up in search.
- **Tell a friend** is in Settings.
- **Closed testers who aren't teachers.** Of the 12+, get at least a few who aren't teachers (a nurse, a manager, a parent with a side gig) so you see the non-teacher first run before strangers do.

## What to watch in Play Console

- **Day-1 and day-7 retention.** If people install and leave, the chart won't hold. The first screen and the empty Now screen are where to look first.
- **Store listing conversion** (visitors who install). Try a different first screenshot after two weeks with a store listing experiment.
- **Ratings.** Stay above 4.5.
- **Android vitals** (crashes, app-not-responding). Google ranks apps with bad vitals lower.

## Next features that would help it grow (not built yet)

- Backup and restore to a file, so people trust it with their data.
- iPhone. Over half of US phones are iPhones, and every share to an iPhone friend is a lost install today.
- Say anything that adds pack items directly ("1:1 with Priya every other Tuesday" → a 1:1 in the Team lead pack).
- Pack widgets (next 1:1, money owed this month, next deadline).
- Shared hats: a co-parent, a grade-level team or a co-coach sharing one pack. Sharing is what makes apps spread.
