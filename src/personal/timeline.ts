import { addDays, weekday } from "../engine/dates";
import { mealFor, planDay } from "./engine";
import { recipeById } from "./recipes";
import { eventOn, eventsOn, repeatLabel, taskRule } from "./repeat";
import type { HatArtId } from "./hatArt";
import { HATS, type PersonalData, type PersonalHat, hatDef } from "./model";
import { isBathNight, isWorkday, routinePrefs } from "./routine";
import { isFree, periodLabel, schoolBlocks } from "./school";

export { isBathNight, isWorkday, routinePrefs };

/** One row in a day's timeline. Times are "HH:MM", local. */
export interface TimelineItem {
  id: string;
  kind: "routine" | "event" | "task" | "work" | "date";
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
  /** School blocks: the class section ("7A") and period number. */
  section?: string;
  period?: number;
  /** School blocks: what kind of block (class, off period, lunch...). */
  block?: "class" | "boost" | "homeroom" | "advisory" | "off" | "break";
}

/** When a date night starts: its time, or 7:00 PM. */
export const dateTime = (plan: { time?: string }) => plan.time ?? "19:00";

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
  const outTonight = data.dates
    .filter((x) => x.date === date)
    .map((x) => ({ start: mins(dateTime(x)) - 30, end: mins(dateTime(x)) + 150 }));
  const TAGS: Record<string, PersonalHat> = {
    home: "home",
    partner: "husband",
    dinner: "home",
    slowcook: "home",
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
    // On date night, the kids' evening falls to childcare.
    const covered =
      ["dinner", "bath", "stories", "bedtime"].includes(key) &&
      outTonight.some((o) => mins(time) >= o.start && mins(time) < o.end);
    steps.push({
      id: `routine:${key}`,
      key,
      time,
      end,
      title,
      hat,
      detail: covered ? "Childcare has it tonight · date night" : detail,
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
  // A slow-cooker dinner needs starting hours ahead: before school on workdays, else late morning.
  const slow = chosen ? recipeById(meal?.id) : undefined;
  if (slow?.tags.includes("slow-cooker"))
    add(
      "slowcook",
      isWorkday(data, date)
        ? "07:00"
        : hhmm(Math.max(mins("09:00"), mins(r.dinnerTime) - 7 * 60)),
      `Start the slow cooker · ${slow.name}`,
      "chef",
      `${slow.minutes} min now, then ${slow.wait}`,
      slow.minutes,
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
  // The school day. A calendar meeting that falls in an off period (CPT during Specials)
  // takes that block's place instead of showing twice.
  const merged = new Set<string>();
  for (const b of schoolBlocks(data, date)) {
    const meeting = isFree(b)
      ? data.events.find(
          (e) =>
            eventOn(e, date) &&
            !e.allDay &&
            mins(e.start) >= mins(b.start) - 10 &&
            mins(e.start) < mins(b.end) - 10 &&
            !merged.has(e.id),
        )
      : undefined;
    if (meeting) merged.add(meeting.id);
    const period = periodLabel(b);
    items.push({
      id: `work:${b.start}`,
      kind: "work",
      time: meeting ? meeting.start : b.start,
      end: meeting ? meeting.end : b.end,
      title: meeting ? meeting.title : b.title,
      detail: meeting
        ? [b.period ? `Period ${b.period}` : "", `during ${b.note ?? b.title}`]
            .filter(Boolean)
            .join(" · ")
        : period || undefined,
      hat: HATS.work.art,
      tag: "work",
      section: b.section,
      period: b.period,
      block: b.kind,
      ...(meeting ? { source: meeting.source, eventId: meeting.id } : {}),
      done:
        date < today ||
        (isToday && mins(meeting ? meeting.end : b.end) <= nowMin),
    });
  }
  for (const e of eventsOn(data, date)) {
    if (merged.has(e.id)) continue;
    if (e.allDay) {
      allDay.push({
        id: e.id,
        title: e.repeat ? `${e.title} (${repeatLabel(e.repeat, e.date).toLowerCase()})` : e.title,
        hat: e.hat,
      });
      continue;
    }
    items.push({
      id: `event:${e.id}`,
      kind: "event",
      time: e.start,
      end: e.end,
      title: e.title,
      detail:
        [
          e.repeat ? repeatLabel(e.repeat, e.date) : "",
          e.location || (e.source === "google" ? "Google Calendar" : ""),
        ]
          .filter(Boolean)
          .join(" · ") || undefined,
      hat: e.hat ? hatDef(e.hat, data.customHats).art : "safari",
      tag: e.hat,
      source: e.source,
      eventId: e.id,
      done: isToday && mins(e.end) <= nowMin,
    });
  }
  // Date nights you planned in the Husband hat.
  for (const plan of data.dates.filter((x) => x.date === date)) {
    const time = dateTime(plan);
    const end = hhmm(mins(time) + 150);
    const left = plan.steps.filter((s) => !s.done);
    items.push({
      id: `date:${plan.id}`,
      kind: "date",
      time,
      end,
      title: /\bdate\b/i.test(plan.title) ? plan.title : `Date night · ${plan.title}`,
      detail: left.length
        ? `Still to do: ${left[0].title.charAt(0).toLowerCase()}${left[0].title.slice(1)}`
        : "All set · enjoy it",
      hat: "fedora",
      tag: "husband",
      done: isToday && mins(end) <= nowMin,
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
        : taskRule(x.task)
          ? repeatLabel(taskRule(x.task)!, x.task.date)
          : hatDef(x.task.hat, data.customHats).name,
      hat: hatDef(x.task.hat, data.customHats).art,
      tag: x.task.hat,
      done: false,
      taskId: x.task.id,
      fixed: x.task.fixed,
    });
  }
  items.sort(
    (a, b) => mins(a.time) - mins(b.time) || a.kind.localeCompare(b.kind),
  );
  // Birthdays: on the day, and a week ahead so there's time for a card or a gift.
  const md = date.slice(5);
  const weekOut = addDays(date, 7).slice(5);
  for (const person of data.people) {
    const b = /(\d{2})-(\d{2})$/.exec(person.birthday ?? "");
    if (!b) continue;
    const day = `${b[1]}-${b[2]}`;
    const hat: PersonalHat =
      person.role === "child" ? "dad" : person.role === "pet" ? "pets" : "friends";
    if (day === md)
      allDay.unshift({ id: `bday:${person.id}`, title: `${person.name}’s birthday 🎂`, hat });
    else if (day === weekOut)
      allDay.push({ id: `bday-soon:${person.id}`, title: `${person.name}’s birthday is in a week`, hat });
  }
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
  // While a date night is on, it's the big card (the evening routine is covered).
  const dating = open.find(
    (i) => i.kind === "date" && mins(i.time) <= nowMin && mins(i.end ?? i.time) >= nowMin,
  );
  const current =
    dating ??
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
