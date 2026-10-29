import { routineBlocks } from "./routine";
import {
  addDays,
  daysBetween,
  fromISO,
  minutesOf,
  timeOf,
  weekday,
} from "../engine/dates";
import {
  HAT_IDS,
  customHatFor,
  customHats,
  type BuiltInHat,
  id,
  type PersonalData,
  type PersonalHat,
  type PersonalTask,
} from "./model";

export function makeTask(
  title: string,
  hat: PersonalHat,
  date: string,
  extra: Partial<PersonalTask> = {},
): PersonalTask {
  return {
    id: id(),
    title,
    hat,
    date,
    time: null,
    minutes: 15,
    essential: false,
    fixed: false,
    doneAt: null,
    steps: [],
    repeat: "none",
    createdAt: new Date().toISOString(),
    deferred: 0,
    ...extra,
  };
}
export function finishStep(task: PersonalTask, now = new Date().toISOString()) {
  if (task.doneAt) return;
  const step = task.steps.find((s) => !s.done);
  if (step) step.done = true;
  if (task.steps.every((s) => s.done)) task.doneAt = now;
}
export const nextStep = (t: PersonalTask) =>
  t.steps.find((s) => !s.done)?.title ?? t.title;

export function materialize(data: PersonalData, today: string): boolean {
  let changed = false;
  const originals = [...data.tasks];
  for (const task of originals) {
    if (task.repeat === "none" || task.date >= today) continue;
    const period =
      task.repeat === "daily" ? 1 : task.repeat === "fortnightly" ? 14 : 7;
    if (task.repeat !== "daily" && daysBetween(task.date, today) % period !== 0)
      continue;
    // One current instance per series; unfinished steps stay visible instead of creating a backlog.
    const source = task.source ?? task.id;
    if (data.tasks.some((t) => !t.doneAt && (t.source ?? t.id) === source))
      continue;
    if (data.tasks.some((t) => t.date === today && t.source === source))
      continue;
    if (daysBetween(task.date, today) < period) continue;
    data.tasks.push({
      ...task,
      id: id(),
      source,
      date: today,
      time: task.time,
      doneAt: null,
      steps: task.steps.map((s) => ({ title: s.title, done: false })),
      deferred: 0,
      createdAt: new Date().toISOString(),
    });
    changed = true;
  }
  return changed;
}

export interface PlannedTask {
  task: PersonalTask;
  date: string;
  time: string | null;
  reason: string;
}
export function dayWindows(
  data: PersonalData,
  date: string,
): { start: number; end: number }[] {
  const p = data.preferences;
  const dayOff = data.events.some((e) => e.date === date && e.closure);
  const weekdayBusy = p.unavailableDays.includes(weekday(date)) && !dayOff;
  const start = minutesOf(weekdayBusy ? p.homeTime : p.weekendStart);
  const end = minutesOf(weekdayBusy ? p.endTime : p.weekendEnd);
  let windows = end > start ? [{ start, end }] : [];
  const blocked = data.events
    .filter((e) => e.date === date && !e.allDay)
    .map((e) => ({ start: minutesOf(e.start), end: minutesOf(e.end) }));
  // Keep the family's evening rhythm free (dinner, bath night, stories, bedtime).
  blocked.push(...routineBlocks(data, date));
  if (p.gymDays.includes(weekday(date)))
    blocked.push({
      start: minutesOf(p.gymStart),
      end: minutesOf(p.gymStart) + p.gymMinutes,
    });
  for (const b of blocked) {
    windows = windows.flatMap((w) =>
      b.end <= w.start || b.start >= w.end
        ? [w]
        : [
            ...(b.start > w.start ? [{ start: w.start, end: b.start }] : []),
            ...(b.end < w.end ? [{ start: b.end, end: w.end }] : []),
          ],
    );
  }
  return windows;
}
export function planDay(
  data: PersonalData,
  date: string,
  nowMin = 0,
  excludeId?: string,
): PlannedTask[] {
  const candidates = data.tasks.filter(
    (t) => !t.doneAt && t.date <= date && t.id !== excludeId,
  );
  const low = data.lowEnergyDays.includes(date);
  const sorted = [...candidates].sort(
    (a, b) =>
      Number(b.fixed) - Number(a.fixed) ||
      Number(b.essential) - Number(a.essential) ||
      a.date.localeCompare(b.date) ||
      a.deferred - b.deferred ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const used: { start: number; end: number }[] = [];
  for (const task of sorted.filter((t) => t.fixed && t.time))
    used.push({
      start: minutesOf(task.time!),
      end: minutesOf(task.time!) + task.minutes,
    });
  const windows = dayWindows(data, date);
  const output: PlannedTask[] = [];
  let optional = 0;
  for (const task of sorted) {
    if (task.fixed) {
      output.push({
        task,
        date: task.date,
        time: task.time,
        reason: "Fixed commitment · stays where you put it",
      });
      continue;
    }
    if (!task.essential && optional >= (low ? 1 : 3)) {
      output.push({
        task,
        date,
        time: null,
        reason: "Waiting for room · not added to today’s load",
      });
      continue;
    }
    let placed: number | null = null;
    for (const w of windows) {
      let start = Math.max(
        w.start,
        nowMin,
        task.date === date && task.time ? minutesOf(task.time) : 0,
      );
      start = Math.ceil(start / 5) * 5;
      while (start + task.minutes <= w.end) {
        const overlap = used.find(
          (b) => start < b.end && start + task.minutes > b.start,
        );
        if (!overlap) {
          placed = start;
          break;
        }
        start = overlap.end + 5;
      }
      if (placed != null) break;
    }
    if (placed != null) {
      used.push({ start: placed, end: placed + task.minutes + 5 });
      if (!task.essential) optional++;
    }
    output.push({
      task,
      date,
      time: placed == null ? null : timeOf(placed),
      reason:
        placed == null
          ? "Needs another opening"
          : task.essential
            ? "Essential care first"
            : low
              ? "A smaller plan for a low-energy day"
              : "Fits around your commitments",
    });
  }
  return output.sort(
    (a, b) =>
      (a.time == null ? 9999 : minutesOf(a.time)) -
      (b.time == null ? 9999 : minutesOf(b.time)),
  );
}
export function nextOpening(
  data: PersonalData,
  task: PersonalTask,
  today: string,
  nowMin: number,
): { date: string; time: string } | null {
  if (task.fixed) return null;
  for (let offset = 0; offset < 14; offset++) {
    const date = addDays(today, offset);
    const copy = JSON.parse(JSON.stringify(data)) as PersonalData;
    const candidate = copy.tasks.find((t) => t.id === task.id);
    if (!candidate) return null;
    candidate.date = date;
    candidate.time = null;
    const plan = planDay(copy, date, offset === 0 ? nowMin + 20 : 0);
    const hit = plan.find((x) => x.task.id === task.id && x.time);
    if (hit?.time) return { date, time: hit.time };
  }
  return null;
}
export function reschedule(
  data: PersonalData,
  taskId: string,
  today: string,
  nowMin: number,
): boolean {
  const t = data.tasks.find((x) => x.id === taskId);
  if (!t || t.fixed) return false;
  const slot = nextOpening(data, t, today, nowMin);
  if (!slot) return false;
  t.date = slot.date;
  t.time = slot.time;
  t.deferred++;
  t.reason = "Moved to your next available opening";
  return true;
}
export function installRoutines(data: PersonalData, today: string) {
  if (data.tasks.some((t) => t.source === "starter-kitchen")) return;
  const presets: [string, PersonalHat, string[], boolean, string][] = [
    [
      "Kitchen reset",
      "home",
      [
        "Wash or load the dishes",
        "Wipe the counters",
        "Sweep what needs it",
        "Put the last things away",
      ],
      true,
      "starter-kitchen",
    ],
    [
      "Laundry, all the way through",
      "home",
      ["Wash", "Dry", "Fold", "Put away"],
      false,
      "starter-laundry",
    ],
    [
      "Food, water, and litter check",
      "pets",
      ["Refresh food and water", "Scoop litter and clean up", "Check supplies"],
      true,
      "starter-pets",
    ],
    [
      "Plan time for the two of you",
      "husband",
      [
        "Pick a date idea",
        "Check availability and childcare",
        "Confirm the plan",
      ],
      false,
      "starter-date",
    ],
  ];
  for (const [title, hat, steps, essential, source] of presets)
    data.tasks.push(
      makeTask(title, hat, today, {
        steps: steps.map((title) => ({ title, done: false })),
        essential,
        source,
        repeat:
          source === "starter-date"
            ? "fortnightly"
            : source === "starter-laundry"
              ? "weekly"
              : "daily",
      }),
    );
}

const ACTIVITIES = [
  [
    "dance",
    "A three-song dance party",
    "Let everyone choose a song. Little ones can dance with you.",
  ],
  [
    "art",
    "Make a family picture",
    "Draw together; give the youngest large, age-appropriate materials with close supervision.",
  ],
  [
    "puzzle",
    "Puzzle and picture time",
    "Build a puzzle while someone draws a picture of it.",
  ],
  [
    "story",
    "Act out a favorite story",
    "Read a short book and let everyone take a part.",
  ],
  [
    "pretend",
    "Open a pretend restaurant",
    "Make paper menus and take turns ordering.",
  ],
  [
    "movie",
    "An intentional movie afternoon",
    "Choose together, make a snack, and put the phones away.",
  ],
  [
    "music",
    "Make your own band",
    "Play a familiar guitar song and let the kids join in.",
  ],
  [
    "treasure",
    "A color treasure hunt",
    "Find safe household objects in a few colors together.",
  ],
  [
    "blanket",
    "Build a cozy reading corner",
    "A few cushions, a blanket, and a book chosen together.",
  ],
  [
    "gallery",
    "Create a tiny art gallery",
    "Display drawings and give each artist a chance to explain.",
  ],
  [
    "walk",
    "A little neighborhood adventure",
    "Choose a short, stroller-friendly route when conditions suit.",
  ],
  [
    "cards",
    "Make someone a card",
    "Draw, scribble, and dictate a kind message together.",
  ],
] as const;
export function activityFor(data: PersonalData, date: string) {
  const saved = data.activities[date];
  const pool = ACTIVITIES.filter(
    (a) => !data.finishedActivities.slice(-5).includes(a[0]),
  );
  const options = pool.length ? pool : ACTIVITIES;
  const index = Math.abs(daysBetween("2026-01-01", date)) % options.length;
  return ACTIVITIES.find((a) => a[0] === saved) ?? options[index];
}
export function rotateActivity(data: PersonalData, date: string) {
  const current = activityFor(data, date);
  data.finishedActivities.push(current[0]);
  delete data.activities[date];
  data.activities[date] = activityFor(data, date)[0];
}
export function mealFor(data: PersonalData, date: string) {
  const saved = data.meals.find((m) => m.id === data.dinners[date]);
  if (saved) return saved;
  return (
    [...data.meals].sort((a, b) => {
      const score = (m: typeof a) =>
        m.ingredients.filter((i) =>
          data.pantry.some((p) => p.toLowerCase() === i.toLowerCase()),
        ).length *
          4 +
        (m.favorite ? 2 : 0) -
        (data.lowEnergyDays.includes(date) ? m.minutes : 0);
      return score(b) - score(a);
    })[0] ?? null
  );
}
export function shoppingFor(data: PersonalData, mealId: string): string[] {
  const meal = data.meals.find((m) => m.id === mealId);
  if (!meal) return [];
  return meal.ingredients.filter(
    (i) => !data.pantry.some((p) => p.toLowerCase() === i.toLowerCase()),
  );
}
export function budgetSummary(
  data: PersonalData,
  category: keyof PersonalData["preferences"]["budgets"],
  month: string,
) {
  const limit = data.preferences.budgets[category];
  const spent = data.spending
    .filter((s) => s.category === category && s.date.startsWith(month))
    .reduce((n, s) => n + s.amount, 0);
  return { limit, spent, left: limit > 0 ? limit - spent : null };
}
export function captureTask(
  text: string,
  defaultHat: PersonalHat,
  today: string,
): PersonalTask {
  let hat = defaultHat;
  const words: Record<BuiltInHat, RegExp> = {
    husband: /\b(wife|partner|date night|flowers|anniversary|makeup)\b/i,
    dad: /\b(kids?|child|daughter|son|daycare|school pickup|story)\b/i,
    pets: /\b(dog|cat|kitten|vet|litter|groom|walk the dog)\b/i,
    home: /\b(dinner|laundry|dish|grocer|sweep|clean|repair)\b/i,
    friends: /\b(friend|call|catch up|birthday)\b/i,
    myself: /\b(gym|guitar|sleep|workout|save|budget)\b/i,
    work: /\b(lesson|grade|grading|students?|IEP|504|CPT|homeroom|report cards?|progress reports?|copies)\b/i,
  };
  hat =
    customHatFor(text, customHats()) ??
    HAT_IDS.find((h) => words[h].test(text)) ??
    hat;
  const date = /\btomorrow\b/i.test(text) ? addDays(today, 1) : today;
  const timed = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  let time: string | null = null;
  if (timed) {
    let h = Number(timed[1]) % 12;
    if (timed[3].toLowerCase() === "pm") h += 12;
    const m = Number(timed[2] || 0);
    if (m < 60) time = timeOf(h * 60 + m);
  }
  return makeTask(text.trim(), hat, date, {
    time,
    steps: /\blaundry\b/i.test(text)
      ? ["Wash", "Dry", "Fold", "Put away"].map((title) => ({
          title,
          done: false,
        }))
      : [],
  });
}
export function monthDates(date: string) {
  const start = fromISO(date);
  return Array.from({ length: 7 }, (_, i) =>
    addDays(
      `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      i,
    ),
  );
}
