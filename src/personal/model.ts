import { HAT_ART_IDS, type HatArtId } from "./hatArt";
import { libraryHat } from "./hatLibrary";
import { validRule } from "./repeat";
export type BuiltInHat =
  "husband" | "dad" | "pets" | "home" | "friends" | "myself" | "work";
/** A hat you added yourself: "my-" and a short slug. */
export type CustomHatId = `my-${string}`;
export type PersonalHat = BuiltInHat | CustomHatId;
export interface HatDef {
  art: HatArtId;
  tint: string;
  name: string;
  icon: string;
  color: string;
  subtitle: string;
}
export const HATS: Record<BuiltInHat, HatDef> = {
  husband: {
    art: "fedora" as HatArtId,
    tint: "#FCE1D8",
    name: "Husband",
    icon: "heart",
    color: "#B45C43",
    subtitle: "Notice. Connect. Follow through.",
  },
  dad: {
    art: "propeller" as HatArtId,
    tint: "#FFF0C2",
    name: "Dad",
    icon: "people",
    color: "#3D65A2",
    subtitle: "More little moments together.",
  },
  pets: {
    art: "catbeanie" as HatArtId,
    tint: "#FFE3CC",
    name: "Pets",
    icon: "star",
    color: "#95713C",
    subtitle: "Care that stays on your radar.",
  },
  home: {
    art: "cap" as HatArtId,
    tint: "#DCE9FA",
    name: "Home",
    icon: "home",
    color: "#56739B",
    subtitle: "From noticing to putting away.",
  },
  friends: {
    art: "party" as HatArtId,
    tint: "#EEE1FA",
    name: "Friends & family",
    icon: "groups",
    color: "#8C668C",
    subtitle: "Keep your people close.",
  },
  myself: {
    art: "pompom" as HatArtId,
    tint: "#D3F0E8",
    name: "Myself",
    icon: "gym",
    color: "#496A8B",
    subtitle: "Health, money, music, and rest.",
  },
  work: {
    art: "mortarboard" as HatArtId,
    tint: "#E3E8F6",
    name: "Teacher",
    icon: "doc",
    color: "#2C3E63",
    subtitle: "Your school day, period by period.",
  },
};
export const HAT_IDS = Object.keys(HATS) as BuiltInHat[];

/** A hat you added: your name for it and the hat you picked from the library. */
export interface CustomHat {
  id: CustomHatId;
  name: string;
  art: HatArtId;
  createdAt: string;
}
export const isBuiltInHat = (h: unknown): h is BuiltInHat =>
  typeof h === "string" && (HAT_IDS as string[]).includes(h);
export const isCustomHatId = (h: unknown): h is CustomHatId =>
  typeof h === "string" && /^my-[a-z0-9-]{1,48}$/.test(h);
export const isHatId = (h: unknown): h is PersonalHat =>
  isBuiltInHat(h) || isCustomHatId(h);

// The hats you added, kept in step with the saved data by the store, so any
// screen can look up a hat by id.
let custom: CustomHat[] = [];
export function setCustomHats(list: CustomHat[] | undefined) {
  custom = list ?? [];
}
export const customHats = () => custom;

export function customDef(h: Pick<CustomHat, "name" | "art">): HatDef {
  const lib = libraryHat(h.art);
  return {
    art: h.art,
    tint: lib.tint,
    name: h.name,
    icon: "star",
    color: lib.color,
    subtitle: `Your space for ${h.name.toLowerCase()}.`,
  };
}
/** Any hat by id: built in, one you added, or Home if it's been hung up. */
export function hatDef(id: PersonalHat, list: CustomHat[] = custom): HatDef {
  if (isBuiltInHat(id)) return HATS[id];
  const mine = list.find((h) => h.id === id);
  return mine ? customDef(mine) : HATS.home;
}
/** Every hat in order: the built-in ones, then yours. */
export const allHats = (list: CustomHat[] = custom): PersonalHat[] => [
  ...HAT_IDS,
  ...list.map((h) => h.id),
];
/** Hang up a hat you added: everything under it moves to Home. */
export function hangUpHat(d: PersonalData, id: CustomHatId) {
  const home = (x: { hat?: PersonalHat }) => {
    if (x.hat === id) x.hat = "home";
  };
  d.tasks.forEach(home);
  d.notes.forEach(home);
  d.events.forEach(home);
  d.moments?.forEach(home);
  d.habits?.forEach(home);
  d.log?.forEach(home);
  d.customHats = (d.customHats ?? []).filter((h) => h.id !== id);
}
/** The hat you added whose name is in `text` ("water the garden" → Garden). */
export function customHatFor(text: string, list: CustomHat[]): CustomHatId | undefined {
  for (const h of list) {
    const words = h.name
      .toLowerCase()
      .replace(/[’']/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !["the", "and", "for", "my"].includes(w));
    if (!words.length) continue;
    const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const all = words.every((w) =>
      new RegExp(`\\b${esc(w)}(?:s|es)?\\b`, "i").test(text.replace(/[’']/g, "")),
    );
    if (all) return h.id;
  }
  return undefined;
}
/** A new id for a hat named `name`, not already taken. */
export function customHatId(name: string, list: CustomHat[] = custom): CustomHatId {
  const base =
    name
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "hat";
  let id: CustomHatId = `my-${base}`;
  for (let n = 2; list.some((h) => h.id === id); n++) id = `my-${base}-${n}`;
  return id;
}
/**
 * How something repeats. `every` is the interval (every other week = 2). Weekly rules list
 * weekdays (0 = Sunday); monthly rules use a day of the month or the nth weekday (-1 = last).
 */
export interface RepeatRule {
  freq: "day" | "week" | "month" | "year";
  every: number;
  days?: number[];
  monthDay?: number;
  nth?: { n: number; day: number };
  /** Last date it happens, if it stops. */
  until?: string;
}
export interface Step {
  title: string;
  done: boolean;
}
export interface PersonalTask {
  id: string;
  title: string;
  hat: PersonalHat;
  date: string;
  time: string | null;
  minutes: number;
  essential: boolean;
  fixed: boolean;
  doneAt: string | null;
  steps: Step[];
  repeat: "none" | "daily" | "weekly" | "fortnightly";
  /** How it repeats, when it does (newer to-dos; older ones use `repeat`). */
  rule?: RepeatRule;
  createdAt: string;
  deferred: number;
  reason?: string;
  source?: string;
  note?: string;
}
export interface Person {
  id: string;
  name: string;
  role: "child" | "friend" | "pet";
  interests: string;
  detail: string;
  birthday?: string;
  lastContact?: string;
}
export interface Note {
  id: string;
  hat: PersonalHat;
  kind: "reflection" | "idea" | "gift" | "memory";
  text: string;
  createdAt: string;
  photo?: string;
}
export interface Meal {
  id: string;
  name: string;
  ingredients: string[];
  minutes: number;
  prep: string;
  favorite: boolean;
}
export interface PersonalEvent {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
  source: "hats" | "google";
  externalId?: string;
  location?: string;
  closure?: boolean;
  /** Which hat this belongs to (shown as a tag). */
  hat?: PersonalHat;
  /** Repeats from `date` on (violin every Thursday). */
  repeat?: RepeatRule;
  /** Dates in the series that were skipped. */
  skip?: string[];
}
export interface DatePlan {
  id: string;
  date: string;
  title: string;
  budget: number;
  childcare: number;
  transport: number;
  steps: Step[];
  note: string;
}
export interface Spending {
  id: string;
  amount: number;
  category: "takeout" | "dates" | "gifts" | "family" | "other";
  title: string;
  date: string;
}
export interface Wish {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
}
export interface Habit {
  id: string;
  title: string;
  hat: PersonalHat;
  taskSource?: string;
  frequency: "daily" | "weekly";
  target: number;
  checkins: string[];
}
/** One block of the school day, e.g. Period 2 · 7A. Times are "HH:MM". */
export interface SchoolBlock {
  start: string;
  end: string;
  title: string;
  kind: "class" | "boost" | "homeroom" | "advisory" | "off" | "break";
  period?: number;
  /** What's happening in an off period, e.g. "Specials" or "RBR". */
  note?: string;
  /** Class section for classes and Boost blocks, e.g. "7A". */
  section?: string;
}
export interface SchoolPrefs {
  /** Show the school day on Today (on unless turned off). */
  on: boolean;
  /** Blocks by weekday, "1" (Monday) to "5" (Friday). Missing = the standard bell schedule. */
  week?: Record<string, SchoolBlock[]>;
}
export interface Preferences {
  name: string;
  partner: string;
  city: string;
  travelMinutes: number;
  dateBudget: number;
  homeTime: string;
  endTime: string;
  weekendStart: string;
  weekendEnd: string;
  unavailableDays: number[];
  gymDays: number[];
  gymStart: string;
  gymMinutes: number;
  notifications: boolean;
  morningReminder: string;
  eveningReminder: string;
  budgets: {
    takeout: number;
    dates: number;
    gifts: number;
    family: number;
    savings: number;
  };
  onboarded: boolean;
  playful?: boolean;
  focusConsent?: boolean;
  distractingPackages?: string[];
  /** Evening rhythm (all optional; defaults in ROUTINE_DEFAULTS). */
  partnerHome?: string;
  dinnerTime?: string;
  storyTime?: string;
  bedtime?: string;
  /** "alternate" = every other night (swappable), "nightly", or "off". */
  bathNights?: "alternate" | "nightly" | "off";
  /** A date that was a bath night; alternate nights count from it. */
  bathAnchor?: string;
  /** The school day (Teacher hat). */
  school?: SchoolPrefs;
}
export const ROUTINE_DEFAULTS = {
  partnerHome: "18:00",
  dinnerTime: "17:45",
  storyTime: "19:15",
  bedtime: "19:45",
  bathNights: "alternate" as const,
  bathAnchor: "2026-01-01",
};
export interface PersonalData {
  version: 2;
  preferences: Preferences;
  tasks: PersonalTask[];
  people: Person[];
  notes: Note[];
  meals: Meal[];
  pantry: string[];
  groceries: string[];
  dinners: Record<string, string>;
  events: PersonalEvent[];
  dates: DatePlan[];
  spending: Spending[];
  wishes: Wish[];
  lowEnergyDays: string[];
  activities: Record<string, string>;
  finishedActivities: string[];
  protectedUntil: string | null;
  protectedLabel: string;
  updatedAt: string;
  moments?: {
    id: string;
    hat: PersonalHat;
    title: string;
    date: string;
    source: string;
  }[];
  habits?: Habit[];
  /** Hats you added yourself, in the order you added them. */
  customHats?: CustomHat[];
  /** Library recipes you said aren't for your family. */
  hiddenRecipes?: string[];
  /** Routine steps checked off, by day: { "2026-10-28": ["dinner", "bath"] }. */
  routineDone?: Record<string, string[]>;
  /** Routine steps that did NOT happen. Past steps count as done unless listed here. */
  routineSkipped?: Record<string, string[]>;
  /** "What Hats did": automatic changes, newest last, each undoable. */
  log?: LogEntry[];
  /** Automations you undid for a day, so Hats doesn't redo them: { "2026-10-29": ["lighter"] }. */
  autoDeclined?: Record<string, string[]>;
}
export type UndoOp =
  | { t: "removeTasks"; ids: string[] }
  | { t: "removeEvents"; ids: string[] }
  | { t: "notLighter"; date: string }
  | { t: "clearDinners"; dates: string[]; groceries: string[] };
export interface LogEntry {
  id: string;
  at: string;
  date: string;
  hat: PersonalHat;
  title: string;
  detail?: string;
  undo?: UndoOp;
  undone?: boolean;
}
export const id = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function freshPersonal(): PersonalData {
  return {
    version: 2,
    preferences: {
      name: "",
      partner: "",
      city: "",
      travelMinutes: 45,
      dateBudget: 150,
      homeTime: "16:45",
      endTime: "22:30",
      weekendStart: "09:00",
      weekendEnd: "22:00",
      unavailableDays: [1, 2, 3, 4, 5],
      gymDays: [],
      gymStart: "20:30",
      gymMinutes: 60,
      notifications: false,
      morningReminder: "06:35",
      eveningReminder: "16:45",
      budgets: { takeout: 0, dates: 0, gifts: 0, family: 0, savings: 0 },
      onboarded: false,
      playful: true,
    },
    tasks: [],
    people: [],
    notes: [],
    meals: [],
    pantry: [],
    groceries: [],
    dinners: {},
    events: [],
    dates: [],
    spending: [],
    wishes: [],
    lowEnergyDays: [],
    activities: {},
    finishedActivities: [],
    moments: [],
    habits: [],
    protectedUntil: null,
    protectedLabel: "",
    updatedAt: new Date().toISOString(),
  };
}
export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(value + "T12:00:00Z");
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
export function validData(value: unknown): value is PersonalData {
  if (!value || typeof value !== "object") return false;
  try {
    const v = value as PersonalData,
      p = v.preferences;
    const text = (x: unknown) => typeof x === "string";
    const time = (x: unknown) =>
      typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
    const money = (x: unknown) =>
      typeof x === "number" && Number.isFinite(x) && x >= 0;
    const steps = (x: unknown) =>
      Array.isArray(x) &&
      x.every((s) => s && text(s.title) && typeof s.done === "boolean");
    const strings = (x: unknown) => Array.isArray(x) && x.every(text);
    if (
      v.version !== 2 ||
      !p ||
      !text(p.name) ||
      !text(p.partner) ||
      !text(p.city) ||
      !money(p.dateBudget) ||
      !money(p.travelMinutes)
    )
      return false;
    if (
      ![
        p.homeTime,
        p.endTime,
        p.weekendStart,
        p.weekendEnd,
        p.gymStart,
        p.morningReminder,
        p.eveningReminder,
      ].every(time) ||
      p.homeTime >= p.endTime ||
      p.weekendStart >= p.weekendEnd
    )
      return false;
    if (
      ![p.unavailableDays, p.gymDays].every(
        (a) =>
          Array.isArray(a) &&
          a.every((n) => Number.isInteger(n) && n >= 0 && n <= 6),
      ) ||
      !p.budgets ||
      !Object.values(p.budgets).every(money)
    )
      return false;
    if (
      !["takeout", "dates", "gifts", "family", "savings"].every((k) =>
        money(p.budgets[k as keyof typeof p.budgets]),
      )
    )
      return false;
    if (
      ![
        "tasks",
        "people",
        "notes",
        "meals",
        "events",
        "dates",
        "spending",
        "wishes",
      ].every((k) =>
        Array.isArray((v as unknown as Record<string, unknown>)[k]),
      )
    )
      return false;
    if (
      ![v.pantry, v.groceries, v.finishedActivities].every(strings) ||
      !Array.isArray(v.lowEnergyDays) ||
      !v.lowEnergyDays.every(validDate)
    )
      return false;
    if (
      !v.dinners ||
      !v.activities ||
      !Object.values(v.dinners).every(text) ||
      !Object.values(v.activities).every(text)
    )
      return false;
    if (
      ![p.partnerHome, p.dinnerTime, p.storyTime, p.bedtime].every(
        (x) => x === undefined || time(x),
      ) ||
      (p.bathNights !== undefined &&
        !["alternate", "nightly", "off"].includes(p.bathNights)) ||
      (p.bathAnchor !== undefined && !validDate(p.bathAnchor))
    )
      return false;
    if (
      p.school !== undefined &&
      (!p.school ||
        typeof p.school.on !== "boolean" ||
        (p.school.week !== undefined &&
          (typeof p.school.week !== "object" ||
            p.school.week === null ||
            !Object.values(p.school.week).every(
              (list) =>
                Array.isArray(list) &&
                list.every(
                  (b) =>
                    b &&
                    time(b.start) &&
                    time(b.end) &&
                    b.start < b.end &&
                    text(b.title) &&
                    (b.note === undefined || text(b.note)),
                ),
            ))))
    )
      return false;
    if (
      v.hiddenRecipes !== undefined &&
      (!Array.isArray(v.hiddenRecipes) || !v.hiddenRecipes.every(text))
    )
      return false;
    if (
      v.customHats !== undefined &&
      (!Array.isArray(v.customHats) ||
        !v.customHats.every(
          (h) =>
            h &&
            isCustomHatId(h.id) &&
            text(h.name) &&
            h.name.trim().length > 0 &&
            h.name.length <= 40 &&
            HAT_ART_IDS.includes(h.art) &&
            h.art !== "stack" &&
            typeof h.createdAt === "string",
        ) ||
        new Set(v.customHats.map((h) => h.id)).size !== v.customHats.length)
    )
      return false;
    for (const map of [v.routineDone, v.routineSkipped, v.autoDeclined])
      if (
        map !== undefined &&
        (typeof map !== "object" ||
          map === null ||
          !Object.entries(map).every(
            ([day, keys]) => validDate(day) && strings(keys),
          ))
      )
        return false;
    if (
      v.log !== undefined &&
      (!Array.isArray(v.log) ||
        !v.log.every(
          (e) =>
            e &&
            text(e.id) &&
            text(e.title) &&
            validDate(e.date) &&
            isHatId(e.hat),
        ))
    )
      return false;
    if (
      !v.tasks.every(
        (t) =>
          t &&
          text(t.id) &&
          text(t.title) &&
          isHatId(t.hat) &&
          validDate(t.date) &&
          (t.time === null || time(t.time)) &&
          Number.isFinite(t.minutes) &&
          t.minutes >= 1 &&
          t.minutes <= 240 &&
          steps(t.steps) &&
          ["none", "daily", "weekly", "fortnightly"].includes(t.repeat) &&
          (t.rule === undefined || validRule(t.rule)) &&
          typeof t.fixed === "boolean" &&
          typeof t.essential === "boolean",
      )
    )
      return false;
    if (
      !v.people.every(
        (p) =>
          p &&
          text(p.id) &&
          text(p.name) &&
          text(p.interests) &&
          text(p.detail) &&
          ["child", "friend", "pet"].includes(p.role),
      )
    )
      return false;
    if (
      !v.notes.every(
        (n) =>
          n &&
          text(n.id) &&
          text(n.text) &&
          text(n.createdAt) &&
          isHatId(n.hat) &&
          ["reflection", "idea", "gift", "memory"].includes(n.kind),
      )
    )
      return false;
    if (
      !v.meals.every(
        (m) =>
          m &&
          text(m.id) &&
          text(m.name) &&
          strings(m.ingredients) &&
          text(m.prep) &&
          Number.isFinite(m.minutes) &&
          m.minutes > 0,
      )
    )
      return false;
    if (
      !v.events.every(
        (e) =>
          e &&
          text(e.id) &&
          text(e.title) &&
          validDate(e.date) &&
          time(e.start) &&
          time(e.end) &&
          typeof e.allDay === "boolean" &&
          ["hats", "google"].includes(e.source) &&
          (e.repeat === undefined || validRule(e.repeat)) &&
          (e.skip === undefined || (Array.isArray(e.skip) && e.skip.every(validDate))),
      )
    )
      return false;
    if (
      !v.dates.every(
        (d) =>
          d &&
          text(d.id) &&
          text(d.title) &&
          text(d.note) &&
          validDate(d.date) &&
          money(d.budget) &&
          money(d.childcare) &&
          money(d.transport) &&
          steps(d.steps),
      )
    )
      return false;
    if (
      !v.spending.every(
        (s) =>
          s &&
          text(s.id) &&
          text(s.title) &&
          money(s.amount) &&
          validDate(s.date) &&
          ["takeout", "dates", "gifts", "family", "other"].includes(s.category),
      )
    )
      return false;
    if (
      !v.wishes.every(
        (w) =>
          w &&
          text(w.id) &&
          text(w.title) &&
          money(w.amount) &&
          text(w.createdAt),
      )
    )
      return false;
    if (
      v.habits &&
      !v.habits.every(
        (h) =>
          h &&
          text(h.id) &&
          text(h.title) &&
          isHatId(h.hat) &&
          ["daily", "weekly"].includes(h.frequency) &&
          Number.isInteger(h.target) &&
          h.target >= 1 &&
          h.target <= 7 &&
          Array.isArray(h.checkins) &&
          h.checkins.every(validDate),
      )
    )
      return false;
    if (
      v.moments &&
      !v.moments.every(
        (m) =>
          m &&
          text(m.id) &&
          text(m.title) &&
          isHatId(m.hat) &&
          validDate(m.date) &&
          text(m.source),
      )
    )
      return false;
    return (
      typeof v.protectedLabel === "string" &&
      (v.protectedUntil === null || typeof v.protectedUntil === "string") &&
      typeof p.onboarded === "boolean"
    );
  } catch {
    return false;
  }
}
