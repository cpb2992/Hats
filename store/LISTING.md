# Hats on Google Play: listing and launch plan

## The goal, stated honestly

"Top 100" on Google Play means a top chart. The overall Top Free chart is mostly big brands with ad budgets. The realistic target for Hats is the **Top Free chart in Productivity** (Lifestyle and Parenting are worth testing as the category too) in the US. Those charts move on **installs per day in a short burst**, plus ratings and how many people keep using the app. A few hundred installs a day for a week can put an app on a category chart.

The positioning: **You wear a lot of hats. Keep them all in one place.** Most planners sort by project. Hats gives each role in your life its own space (partner, parent, pets, home, work, friends and family, yourself, and any hat you add from a library of 42), plans one calm day across all of them, and lets each hat pick up its own tools (packs).

## Listing

**App name (30 max):** `Hats: Family & Life Planner` (27)

**Short description (80 max):**
`You wear a lot of hats. Keep them all in one place: one calm plan for the day.` (79)

**Category:** Productivity (test Parenting later with a store listing experiment). Tags: Planner, Family, To-do list.

**Full description:**

> You wear a lot of hats: partner, parent, pet person, the one who keeps the house running, the one at work, a friend, and somewhere in there, yourself. Hats keeps them all in one place and turns them into one calm plan for the day.
>
> **A space for every hat.** Setup asks who's at home and which hats you wear, then builds your hats, work hours and evenings from your answers. Add your own from a library of 42 hats: Coach, Garden, Band, Side hustle, Grad school, anything.
>
> **One calm day.** Today lays out what's next across every hat, keeps your work hours clear of home to-dos, protects dinner and bedtime, and makes a low-energy day lighter with one tap.
>
> **Packs: tools for each hat.** Add the tools a hat needs:
> • 1:1s and check-ins for the people you lead or mentor
> • Jobs and invoices for a side hustle, with the month's total
> • Deadlines with a countdown for school
> • A care list for a parent's refills and appointments, which come back on their own
> • Games and practices for the season
> • Projects with a next step and your sessions this week
> • Commitments, and issues and cases
> Anything with a date shows up in your day.
>
> **Family life, handled.** Meals and recipe cards, the grocery list, date nights with childcare and costs planned separately, kids' activities, and a bedtime routine.
>
> **Laundry ends when it's put away.** Chores come in stages, so "done" means done.
>
> **Share with your family.** Groceries, the dinner plan, date nights and the family calendar on both phones. Everything else stays private.
>
> **Say it or snap it.** Talk, type or take a photo to capture something, and Hats puts it under the right hat.
>
> **Streaks you choose,** daily or weekly, with no guilt. Home-screen widgets show your next step.
>
> **Private by design.** No ads, no tracking. Everything is encrypted on your phone; sync and sharing are optional.

(About 2,100 characters.)

## Screenshots (phone, 1080×1920 or larger, 4 to 8)

Each screenshot gets a big caption above the phone. The first three do most of the work.

1. **"You wear a lot of hats."** The Hats tab, every hat as a sticker.
2. **"One calm plan for the day."** Today across several hats.
3. **"Every hat gets its own tools."** A hat page with a pack (1:1s, or Jobs and invoices with the month total).
4. **"Add any hat."** The 42-hat library.
5. **"Dinner, decided."** A recipe card and the grocery list.
6. **"Share with your family."** The shared family calendar or groceries.
7. **"Low on energy? Make it lighter."** Today after the lighter-day tap.
8. **"Your next step, on your home screen."** The widget.

Take them from a made-up family set up through the normal setup (no real names or photos of real people).

**Feature graphic (1024×500):** the tilted blue cap on sun yellow with a few library hats around it, and "You wear a lot of hats."

## Before you submit: things Google will check

- **Account deletion (required).** Hats lets people make an account (sign-in for sync and family sharing), so Google requires a way to delete the account from inside the app **and** a web page or email route to request it. The app doesn't have in-app account deletion yet. This is the one real blocker; it needs a small server function that deletes the account and its synced data.
- **Accessibility service.** The public build leaves out "Protected family time" (the Android accessibility service), because Google only approves those for real accessibility needs. Personal builds keep it.
- **Google Calendar.** The read-only Calendar scopes need Google's OAuth consent screen verified for public users (it shows "unverified app" otherwise, and has a 100-user cap). Start that early: it can take a few weeks.
- **WHOOP.** Using WHOOP's API with the public needs WHOOP's developer approval for a production app. Until then, hide or label it as coming soon.
- **Privacy policy:** `PRIVACY.md` (add your contact email). URL: https://github.com/cpb2992/Hats/blob/public/PRIVACY.md

## Data safety form answers

Because of the optional account, sync and family sharing, Hats **does collect** some data. Declare it honestly:

- **Personal info → Email address:** collected, optional, for account management. Not shared.
- **App activity / Other user-generated content** (to-dos, notes, plans): collected only when sync or family sharing is on, optional, for app functionality. Not shared with third parties.
- **Calendar → Calendar events:** collected when Google Calendar is connected, optional, app functionality, read-only.
- **Health and fitness:** WHOOP recovery and sleep, only if connected, optional, app functionality.
- Encrypted in transit: **Yes.** Users can request deletion: **Yes** (once account deletion is in).
- Speech is processed by the phone's own speech service, not sent to Hats.

**Target audience:** 18 and over. This keeps Hats out of the Families program.

**Content rating questionnaire:** Lifestyle/productivity, no violence; users can share content only within their own family (not public user-to-user communication). Expect "Everyone".

## Getting it on the store

1. **Developer account.** $25 one time at play.google.com/console. A personal account made now must run a **closed test with at least 12 testers for 14 straight days** before it can publish. An organization account skips this but needs a D-U-N-S number, which takes weeks.
2. **Build.** `npx eas-cli@latest build --platform android --profile production` makes the signed app bundle (.aab) on the `public` channel. EAS keeps the signing key.
3. **Internal test first** (no review, up to 100 people): `npx eas-cli@latest submit --platform android --profile production` sends it to the internal track as a draft.
4. **Closed test, 14 days, 12+ testers.** Your team and department are a natural start; add parents and friends who aren't teachers, and a couple of couples, so family sharing gets used for real.
5. **Apply for production**, then publish.

## The launch burst (what actually moves the chart)

Save every channel for **one launch week** instead of trickling.

- **Timing.** The first week of January is the biggest week of the year for planner apps. Run the closed test in November and December, fix what testers hit, launch January 4–10.
- **Where:** your own networks first (school, BTU, family and friends), then parent communities (local parent Facebook groups, r/Parenting, r/workingmoms, r/daddit), couples and household-management communities, and r/productivity. Follow each community's self-promotion rules: share the story, not an ad.
- **Short videos.** 20–30 second screen recordings for TikTok, Reels and Shorts: setup building your hats from three answers; Today across hats; a pack (a side hustle's month total); family sharing on two phones.
- **The angle that travels:** "I wear a lot of hats, so I built an app that gives each one its own space." People share stories, not feature lists.
- **Ratings in launch week.** Ask the closed-test group to leave an honest review on day one. The in-app prompt then asks real users only after 15 things are checked off across 5 days, at most every four months.
- **Reply to every review** in the first months.
- **Family sharing is the growth loop.** Every family invite is a second install. Make the invite one tap from Today once a partner is named.

## What to watch in Play Console

- **Day-1 and day-7 retention.** If people install and leave, the chart won't hold. Setup and the first Today are where to look.
- **Store listing conversion.** Try a different first screenshot after two weeks with a store listing experiment.
- **Ratings.** Stay above 4.5.
- **Android vitals** (crashes, freezes). Google ranks apps with bad vitals lower.

## Next features that would help it grow

- In-app account deletion (needed before submitting; see above).
- Say anything that adds straight to packs ("1:1 with Priya every other Tuesday").
- Pack widgets (next 1:1, money owed this month, next deadline).
- iPhone (the family web app covers iPhones for now).
