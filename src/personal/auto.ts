import { addDays } from "../engine/dates";
import {
  id,
  type LogEntry,
  type PersonalData,
  type PersonalEvent,
  type PersonalHat,
  type UndoOp,
} from "./model";
import { shoppingFor } from "./engine";
import { routineSteps } from "./timeline";

/**
 * Automation: the things Hats does on its own, each written to a log
 * ("What Hats did") with a one-tap Undo. Hats only reads and plans — it never
 * sends, books, pays, or writes to Google.
 */

const KEEP_DAYS = 14;

/** Record something Hats did. */
export function logIt(
  d: PersonalData,
  today: string,
  entry: { hat: PersonalHat; title: string; detail?: string; undo?: UndoOp },
) {
  d.log ??= [];
  d.log.push({
    id: id(),
    at: new Date().toISOString(),
    date: today,
    ...entry,
  });
  const cutoff = addDays(today, -KEEP_DAYS);
  d.log = d.log.filter((e) => e.date >= cutoff).slice(-80);
}

const decline = (d: PersonalData, date: string, what: string) => {
  d.autoDeclined ??= {};
  const list = d.autoDeclined[date] ?? [];
  if (!list.includes(what)) d.autoDeclined[date] = [...list, what];
};
export const declined = (d: PersonalData, date: string, what: string) =>
  !!d.autoDeclined?.[date]?.includes(what);

/** Reverse one logged action. Returns false if it was already undone or can't be. */
export function undoEntry(d: PersonalData, entryId: string): boolean {
  const entry = d.log?.find((e) => e.id === entryId);
  if (!entry || entry.undone || !entry.undo) return false;
  const op = entry.undo;
  if (op.t === "removeTasks")
    d.tasks = d.tasks.filter((t) => !op.ids.includes(t.id));
  else if (op.t === "removeEvents")
    d.events = d.events.filter((e) => !op.ids.includes(e.id));
  else if (op.t === "clearDinners") {
    for (const date of op.dates) delete d.dinners[date];
    d.groceries = d.groceries.filter((g) => !op.groceries.includes(g));
    for (const date of op.dates) decline(d, date, "dinner");
  } else if (op.t === "notLighter") {
    d.lowEnergyDays = d.lowEnergyDays.filter((x) => x !== op.date);
    decline(d, op.date, "lighter");
  }
  entry.undone = true;
  return true;
}

/** Mark a routine step as skipped (it didn't happen) or put it back. */
export function setSkipped(
  d: PersonalData,
  date: string,
  key: string,
  skipped: boolean,
) {
  d.routineSkipped ??= {};
  const list = d.routineSkipped[date] ?? [];
  d.routineSkipped[date] = skipped
    ? [...new Set([...list, key])]
    : list.filter((k) => k !== key);
  if (skipped && d.routineDone?.[date])
    d.routineDone[date] = d.routineDone[date].filter((k) => k !== key);
  if (!d.routineSkipped[date].length) delete d.routineSkipped[date];
  const cutoff = addDays(date, -21);
  for (const day of Object.keys(d.routineSkipped))
    if (day < cutoff) delete d.routineSkipped[day];
}

/**
 * Routine steps Hats counted as done on its own, for the log. Derived, not
 * stored: undoing one is the same as tapping "Skipped?".
 */
export function autoRoutineEntries(
  data: PersonalData,
  today: string,
  nowMin: number,
): (LogEntry & { keys: string[] })[] {
  const out: (LogEntry & { keys: string[] })[] = [];
  for (const date of [today, addDays(today, -1)]) {
    const steps = routineSteps(data, date, { today, nowMin }).filter(
      (s) => s.auto,
    );
    if (!steps.length) continue;
    const names = steps.map((s) =>
      s.key === "partner"
        ? s.title
        : s.title.replace(/^Dinner · .*/, "dinner").toLowerCase(),
    );
    out.push({
      id: `routines:${date}`,
      at: `${date}T23:59:00`,
      date,
      hat: "dad",
      title: `Counted ${list(names)} as done`,
      detail: "Routines count unless you tap Skipped",
      keys: steps.map((s) => s.key!),
    });
  }
  return out;
}

const list = (xs: string[]) =>
  xs.length <= 1
    ? (xs[0] ?? "")
    : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

/**
 * Low WHOOP recovery → make today lighter (fewer optional to-dos, easier
 * dinner, rest instead of gym, shorter kid activity). Once per day; never
 * again for a day you undid it.
 */
export function applyEnergy(
  d: PersonalData,
  today: string,
  recovery: number | null,
): boolean {
  if (recovery == null || recovery >= 34) return false;
  if (d.lowEnergyDays.includes(today) || declined(d, today, "lighter"))
    return false;
  d.lowEnergyDays.push(today);
  logIt(d, today, {
    hat: "myself",
    title: "Made today lighter",
    detail: `Recovery ${Math.round(recovery)}% · fewer to-dos, easier dinner, rest instead of gym`,
    undo: { t: "notLighter", date: today },
  });
  return true;
}

/**
 * Bring in a fresh read of Google events. Logs only what's new to Hats, so a
 * quiet refresh stays quiet. Google itself is never changed.
 */
export function mergeGoogle(
  d: PersonalData,
  today: string,
  events: PersonalEvent[],
): number {
  const before = new Set(
    d.events.filter((e) => e.source === "google").map((e) => e.id),
  );
  d.events = [...d.events.filter((e) => e.source !== "google"), ...events];
  const fresh = events.filter((e) => !before.has(e.id));
  if (fresh.length)
    logIt(d, today, {
      hat: "home",
      title: `Added ${fresh.length} ${fresh.length === 1 ? "event" : "events"} from Google`,
      detail: fresh
        .slice(0, 3)
        .map((e) => e.title)
        .join(" · "),
    });
  return fresh.length;
}

/** The log for display: newest first, with routine auto-checks folded in. */
export function logView(data: PersonalData, today: string, nowMin: number) {
  const stored = (data.log ?? []).map((e) => ({ ...e, keys: [] as string[] }));
  return [...stored, ...autoRoutineEntries(data, today, nowMin)].sort((a, b) =>
    b.at.localeCompare(a.at),
  );
}

/** How many things Hats did today (for the header pill). */
export function didToday(data: PersonalData, today: string, nowMin: number) {
  const stored = (data.log ?? []).filter(
    (e) => e.date === today && !e.undone,
  ).length;
  const auto =
    autoRoutineEntries(data, today, nowMin).find((e) => e.date === today)?.keys
      .length ?? 0;
  return stored + auto;
}

/**
 * Plan the coming week's dinners: any day in the next 7 without a dinner gets
 * one, rotating so nothing repeats too soon, favorites a little more often,
 * quicker meals on lighter days. Missing ingredients go on the grocery list.
 */
export function planWeek(d: PersonalData, today: string): number {
  if (!d.meals.length) return 0;
  const dates: string[] = [];
  const added: string[] = [];
  const recent: string[] = [];
  for (let i = -6; i < 7; i++) {
    const date = addDays(today, i);
    const chosen = d.dinners[date];
    if (chosen) {
      recent.push(chosen);
      continue;
    }
    if (i < 0 || declined(d, date, "dinner")) continue;
    const low = d.lowEnergyDays.includes(date);
    const pool = d.meals
      .map((m, n) => ({
        m,
        score:
          (m.favorite ? 3 : 0) -
          // The more recently it was eaten, the less likely again.
          Math.max(0, 6 - (recent.length - recent.lastIndexOf(m.id))) *
            (recent.includes(m.id) ? 4 : 0) -
          (low ? m.minutes / 10 : 0) -
          // Spread ties across the week.
          ((n + i) % d.meals.length) * 0.01,
      }))
      .sort((a, b) => b.score - a.score);
    const meal = pool[0].m;
    d.dinners[date] = meal.id;
    recent.push(meal.id);
    dates.push(date);
    for (const item of shoppingFor(d, meal.id))
      if (!d.groceries.includes(item)) {
        d.groceries.push(item);
        added.push(item);
      }
  }
  if (dates.length)
    logIt(d, today, {
      hat: "home",
      title: `Planned ${dates.length} ${dates.length === 1 ? "dinner" : "dinners"}`,
      detail: added.length
        ? `${added.length} ${added.length === 1 ? "item" : "items"} added to groceries`
        : "Everything’s already in the pantry",
      undo: { t: "clearDinners", dates, groceries: added },
    });
  return dates.length;
}
