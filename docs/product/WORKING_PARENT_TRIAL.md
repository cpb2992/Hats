# Hats: working-parent product trial

Status: proposed product direction and research kit. No testers have been recruited, no invitations sent, and no results recorded. Personal and public release channels remain separate. Do not use Chris's household, health, school schedule, or private data in public fixtures or marketing.

## One audience and promise

First audience: working parents who coordinate work, children, a household and their own needs. Include different household structures; do not assume a partner, a gender or shared custody arrangement.

Promise to test: **One realistic day across work, family and yourself.**

Success means less remembering, fewer coordination mistakes and a feasible next step. Installs, app opens and task checkmarks alone do not establish that success. Expanding job packs pauses during this trial.

## Four-week execution plan

1. Week one: verify schedule integrity, explicit routine completion, date-care confirmation, private/shared boundaries, previewed day changes and Undo. Test an installed Android build, offline save, background resume, widget refresh and notification permission denial. Do not publish until release gates below pass.
2. Week two: invite 10–15 consenting working parents through approved channels. Aim for at least three consenting pairs for sharing tests. Observe the first session without coaching. Fix blockers before broad marketing. Never gather children's names or personal calendar text in research notes.
3. Week three: ask participants to use Hats for seven days. Ask about a real disrupted day and an actual responsibility handoff. Collect voluntary feedback through Settings → Is Hats helping? Feedback is saved privately; participants choose whether and where to share it.
4. Week four: summarize denominators and examples, prioritize the three largest sources of effort, and decide whether to widen the trial. A small convenience sample gives direction, not proof of market fit.

No future activity is scheduled by this document. Dates and recipients must be chosen when recruitment is authorized.

## Invitation draft — not sent

I'm testing Hats, an app for working parents who juggle work, home and everything in between. Would you try it for a week and tell me what still feels like work? I'd like to watch a short first-use session, then hear whether it helped with one real day. There are no right answers. Please use made-up names for the observed session. You can stop at any time, and you choose whether to share any feedback.

## Fifteen-minute first session

Before starting, explain what is observed and ask permission to take notes. Do not record screens or audio without separate consent. Use a disposable profile and sample commitments.

| Task | Observe | Record |
| --- | --- | --- |
| Explain Hats in one sentence | Does the promise make sense? | Participant's own wording |
| Create the first real plan using sample details | Can they reach a useful day without help? | Time, completion, hesitation, help needed |
| Add a second role and find its plan in Today and Week | Does the role model make sense? | Navigation failures and mismatched views |
| Make tomorrow a day off | Can they predict and review the result? | Fixed plans retained, optional plans understood |
| Undo the change | Can they recover without fear? | Success or blocker |
| Confirm childcare for a sample date | Do they distinguish planned and confirmed? | Any false assumption |
| Assign and accept a shared sample task on two profiles | Do both know whose job it is? | Owner, acceptance and sync state |
| Correct a suggestion | Do they know its scope and how to reverse it? | Preference understood or misleading |

Ask: What did you expect? What felt confusing? What would you stop using another tool for? What did you still have to remember or organize outside Hats today?

## Seven-day follow-up

Ask for one specific thing Hats helped with and one thing it failed to carry. Ask whether they voluntarily returned, whether plans ever disappeared, whether a reminder was wrong, and whether shared ownership was clear. Let them withhold names, content and screenshots. A partner invitation is optional; the app must be useful alone.

## Measurement definitions

The app's private counters describe one profile; they do not calculate cohort retention or prove time saved. Counter history keeps up to 35 days; saved feedback keeps the latest 30 entries. No research text is automatically transmitted. Account sync includes it in the user's private profile if enabled. Household sharing excludes research fields.

| Measure | Definition | Collection |
| --- | --- | --- |
| First-plan activation | Created a real commitment and located it in the correct day | Observation and voluntary report; divide by all participants who began setup |
| Time to first value | Start of setup to locating that commitment | Observer stopwatch; report median and range, include failed attempts |
| Day-seven return | Returned on day seven after first useful plan | Follow-up, with explicit denominator; private active-day counts are supporting context only |
| Useful outcome | Participant names a concrete responsibility coordinated or effort avoided | Voluntary note; do not infer from clicks |
| Trust failure | Saved commitment missing, duplicate, wrong date/time, or false completion | Deidentified bug report; treat any lost data as a release blocker |
| Shared handoff | Owner assignment, acceptance and completion understood on both profiles | Pair session; count complete attempts and failures |
| Disruption recovery | Preview → apply → correct schedule → Undo works | Observation |

Provisional research goals: at least 8 of the first 10 participants reach a useful day unaided; no lost commitments; most can explain a day-change preview correctly. These are decision goals, not industry benchmarks or promised results. Report actual outcomes even if goals are missed.

## Participant log — fill only after consent

Use IDs P01–P15, not names or email addresses. Keep contact details separately in the owner's chosen private system. Record consent date, session date, platform, first plan success, help required, seven-day follow-up, concrete benefit, top friction, and severity. No participant records have been created here.

## Release gates

- All automated tests, lint, typecheck and web export pass on each target branch.
- Phone and unfolded screenshots show the selected day and action controls fully.
- Device tests: foreground/background reminders, Android widget refresh and actions, offline save/reopen, rejected permissions, date/time-zone boundaries, and restore from backup.
- Two real test accounts: assignment, acceptance, reassignment clearing acceptance, simultaneous edits and offline recovery. Do not equate pure wire tests with a verified deployed backend.
- Public build contains no personal profile, service or update-channel crossover.
- Read the current Google Play policies and verify the actual listing/build before store submission. This document does not confirm production availability.
- User reviews screenshots before a new OTA or public deployment.

## Proposed public positioning — review only

App promise: One realistic day across work, family and yourself.

First three screenshot messages:
1. See your real commitments together.
2. When the day changes, review what can wait.
3. Know whose job it is — and whether they accepted.

Keep the illustrated hats and warm identity. Use screenshots of sample data from the current tested build. Explain value before listing packs. Avoid unsupported claims of AI intelligence, guaranteed time savings, fully automatic family care, or chart placement.
