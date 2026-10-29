import { weekday } from "../engine/dates";
import { mealFor, planDay } from "./engine";
import type { HatArtId } from "./hatArt";
import { HATS, type PersonalData, type PersonalHat } from "./model";
import { isBathNight, isWorkday, routinePrefs } from "./routine";

export { isBathNight, isWorkday, routinePrefs };

/** One row in a day's timeline. Times are "HH:MM", local. */
export interface TimelineItem {
  id: string;
  kind: "routine" | "event" | "task";
  time: string;
  end?: string;
  title: string;
  detail?: string;
  hat: HatArtId;
  done: boolean;
  /** routine step key, e.g. "dinner" */
  key?: string;
  taskId?: string;
  fixed?: boolean;
  /** The hat this belongs to, shown as a tag. */
  tag?: PersonalHat;
  /** Counted as done because its time passed (tap "Skipped?" if it didn't happen). */
  auto?: boolean;
  skipped?: boolean;
  /** For events: where it came from. */
  source?: "hats" | "google";
  eventId?: string;
}

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const hhmm = (n: number) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/**
 * The family's evening rhythm for a date (no tasks, no events).
 * Routines run themselves: once a step's time has passed it counts as done,
 * unless you said it was skipped. Pass `clock` to apply that.
 */
export function routineSteps(
  data: PersonalData,
  date: string,
  clock?: { today: string; nowMin: number },
) {
  const p = data.preferences;
  const r = routinePrefs(data);
  const done = new Set(data.routineDone?.[date] ?? []);
  const skipped = new Set(data.routineSkipped?.[date] ?? []);
  const low = data.lowEnergyDays.includes(date);
  const kids = data.people.filter((x) => x.role === "child");
  const meal = mealFor(data, date);
  const chosen = !!data.dinners[date];
  const steps: Omit<TimelineItem, "kind">[] = [];
  const TAGS: Record<string, PersonalHat> = {
    home: "home",
    partner: "husband",
    dinner: "home",
    bath: "dad",
    stories: "dad",
    bedtime: "dad",
    gym: "myself",
    rest: "myself",
  };
  const add = (
    key: string,
    time: string,
    title: string,
    hat: HatArtId,
    detail?: string,
    minutes = 30,
  ) => {
    const end = hhmm(mins(time) + minutes);
    const passed =
      !!clock &&
      (date < clock.today ||
        (date === clock.today && mins(end) <= clock.nowMin));
    const isSkipped = skipped.has(key);
    const auto = passed && !done.has(key) && !isSkipped;
    steps.push({
      id: `routine:${key}`,
      key,
      time,
      end,
      title,
      hat,
      detail,
      done: !isSkipped && (done.has(key) || auto),
      auto,
      skipped: isSkipped,
      tag: TAGS[key],
    });
  };
  if (isWorkday(data, date))
    add(
      "home",
      p.homeTime,
      "Home together",
      "cap",
      "Pickups done · settle in",
      15,
    );
  if (p.partner)
    add(
      "partner",
      r.partnerHome,
      `${p.partner} home`,
      "fedora",
      "Hello, hug, a minute to connect",
      10,
    );
  add(
    "dinner",
    r.dinnerTime,
    chosen && meal ? `Dinner · ${meal.name}` : "Dinner",
    "chef",
    chosen
      ? undefined
      : meal
        ? `Easy pick: ${meal.name}`
        : "Pick something easy",
    40,
  );
  if (isBathNight(data, date))
    add(
      "bath",
      hhmm(mins(r.storyTime) - 30),
      "Bath night",
      "pompom",
      kids.length ? "Every other night" : undefined,
      25,
    );
  add(
    "stories",
    r.storyTime,
    "Stories",
    "wizard",
    kids.length ? `${kids.map((k) => k.name).join(", ")}` : undefined,
    25,
  );
  add("bedtime", r.bedtime, "Bedtime", "nightcap", undefined, 15);
  if (p.gymDays.includes(weekday(date)))
    if (low)
      add(
        "rest",
        p.gymStart,
        "Rest instead of gym",
        "nightcap",
        "Lighter day · gym waits for a stronger one",
        30,
      );
    else add("gym", p.gymStart, "Gym", "pompom", "Your time", p.gymMinutes);
  return steps;
}

/** Everything for a day, in time order: routine, calendar events, planned tasks. */
export function dayTimeline(
  data: PersonalData,
  date: string,
  nowMin: number,
  today: string,
): {
  items: TimelineItem[];
  allDay: { id: string; title: string; hat?: PersonalHat }[];
} {
  const isToday = date === today;
  const items: TimelineItem[] = routineSteps(data, date, {
    today,
    nowMin,
  }).map((s) => ({
    ...s,
    kind: "routine" as const,
  }));
  const allDay: { id: string; title: string; hat?: PersonalHat }[] = [];
  for (const e of data.events.filter((e) => e.date === date)) {
    if (e.allDay) {
      allDay.push({ id: e.id, title: e.title, hat: e.hat });
      continue;
    }
    items.push({
      id: `event:${e.id}`,
      kind: "event",
      time: e.start,
      end: e.end,
      title: e.title,
      detail:
        e.location || (e.source === "google" ? "Google Calendar" : undefined),
      hat: e.hat ? HATS[e.hat].art : "safari",
      tag: e.hat,
      source: e.source,
      eventId: e.id,
      done: isToday && mins(e.end) <= nowMin,
    });
  }
  for (const x of planDay(data, date, isToday ? nowMin : 0)) {
    if (!x.time) continue;
    items.push({
      id: `task:${x.task.id}`,
      kind: "task",
      time: x.time,
      end: hhmm(mins(x.time) + x.task.minutes),
      title: x.task.title,
      detail: x.task.steps.length
        ? `${x.task.steps.filter((s) => s.done).length}/${x.task.steps.length} · next: ${x.task.steps.find((s) => !s.done)?.title ?? ""}`
        : HATS[x.task.hat].name,
      hat: HATS[x.task.hat].art,
      tag: x.task.hat,
      done: false,
      taskId: x.task.id,
      fixed: x.task.fixed,
    });
  }
  items.sort(
    (a, b) => mins(a.time) - mins(b.time) || a.kind.localeCompare(b.kind),
  );
  return { items, allDay };
}

/**
 * The one thing to look at now: the earliest unfinished item that has started
 * (routine or task), otherwise the next one coming up. Past events never count.
 */
export function nowAndNext(items: TimelineItem[], nowMin: number) {
  const open = items.filter((i) => !i.done && i.kind !== "event");
  // Of the steps that have started and are still in their window (+30 min grace),
  // the most recent one is "now". Older unfinished steps quietly fade instead.
  const current =
    [...open]
      .filter(
        (i) =>
          mins(i.time) <= nowMin &&
          (i.kind === "task" || mins(i.end ?? i.time) + 30 >= nowMin),
      )
      .sort((a, b) => mins(b.time) - mins(a.time))[0] ?? null;
  const upcoming = items.filter(
    (i) =>
      !i.done &&
      i.kind !== "event" &&
      mins(i.time) > nowMin &&
      i.id !== current?.id,
  );
  return {
    now: current ?? upcoming[0] ?? null,
    next: current ? (upcoming[0] ?? null) : (upcoming[1] ?? null),
  };
}

/** A routine step whose window (+30 min) has passed without a check. */
export function isFaded(item: TimelineItem, nowMin: number) {
  return (
    !item.done &&
    (item.kind === "routine" || item.kind === "event") &&
    mins(item.end ?? item.time) + 30 < nowMin
  );
}

export const minutesOfDay = mins;
