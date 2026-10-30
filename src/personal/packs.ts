/**
 * Packs: tools you can add to any hat. A team lead's Work hat gets 1:1s, a Side hustle hat gets
 * jobs and invoices, a Grad school hat gets deadlines, Friends & family can get a care list for a
 * parent. Each pack keeps a list; anything on it with a date becomes a to-do on that day, and
 * checking that to-do off moves the pack along (logs the 1:1 and books the next one, marks the
 * invoice paid, sets the refill's next date). Pure, so it can be tested.
 */
import { addDays, daysBetween, weekStart } from "../engine/dates";
import { libraryHat } from "./hatLibrary";
import { makeTask } from "./engine";
import { hatDef, id, isCustomHatId, type CustomHat, type PersonalData, type PersonalHat } from "./model";

export type PackKind = "people" | "issues" | "money" | "deadlines" | "care" | "commitments" | "schedule" | "projects";

export interface PackItem {
  id: string;
  hat: PersonalHat;
  kind: PackKind;
  title: string;
  /** Second line: a person's role, a client, a class, a place, a next step. */
  who: string;
  /** YYYY-MM-DD it's due or next happens; null = no date. */
  date: string | null;
  /** HH:MM or null. */
  time: string | null;
  /** 0 = once; otherwise it comes back this many days after it's done. */
  repeatDays: number;
  amount: number | null;
  doneAt: string | null;
  /** Last time you met (people). */
  last: string | null;
  /** Days you worked on it (projects). */
  sessions: string[];
  createdAt: string;
}

export interface PackDef {
  kind: PackKind;
  title: string;
  blurb: string;
  noun: string;
  titleHint: string;
  whoHint: string;
  doneLabel: string;
  /** Each item is someone you keep meeting: finishing logs it and keeps them. */
  people?: boolean;
  amount?: boolean;
  repeat?: boolean;
  defaultRepeat?: number;
  /** Counts work sessions instead of finishing. */
  sessions?: boolean;
  task: (p: PackItem) => string;
  minutes: number;
  empty: string;
  /** Words in a hat's name or library entry that suggest this pack. */
  words: string[];
}

export const PACKS: Record<PackKind, PackDef> = {
  people: {
    kind: "people", title: "1:1s and check-ins", blurb: "The people you lead or mentor, and when you’ll meet next",
    noun: "person", titleHint: "Name", whoHint: "Role or what you’re working on", doneLabel: "We met",
    people: true, repeat: true, defaultRepeat: 14, task: (p) => `Check in with ${p.title}`, minutes: 30,
    empty: "Add the people you lead or mentor. Each gets a rhythm, and the next check-in shows up on its day.",
    words: ["lead", "leader", "leadership", "boss", "manager", "manage", "team", "department", "head", "mentor", "mentee", "coaching", "supervisor"],
  },
  issues: {
    kind: "issues", title: "Issues and cases", blurb: "Who raised what, the next step and when",
    noun: "issue", titleHint: "What’s going on", whoHint: "Who raised it", doneLabel: "Closed",
    task: (p) => `Next step: ${p.title}${p.who ? ` (${p.who})` : ""}`, minutes: 15,
    empty: "Log issues as they come in. Give each a next-step date and it lands on that day.",
    words: ["union", "rep", "steward", "grievance", "case", "cases", "hr", "advocate", "advocacy", "member", "members"],
  },
  money: {
    kind: "money", title: "Jobs and invoices", blurb: "What you’re owed, what’s paid, the month’s total",
    noun: "job", titleHint: "Job or invoice", whoHint: "Client", doneLabel: "Paid", amount: true,
    task: (p) => `Follow up: ${p.title}${p.who ? ` · ${p.who}` : ""}`, minutes: 5,
    empty: "Add jobs and invoices with an amount. A date reminds you to follow up; Paid adds it to the month.",
    words: ["side", "hustle", "business", "client", "clients", "freelance", "llc", "invoice", "tutor", "tutoring", "etsy", "shop", "gig", "company"],
  },
  deadlines: {
    kind: "deadlines", title: "Deadlines", blurb: "Assignments, exams and anything due, with a countdown",
    noun: "deadline", titleHint: "Paper, exam or assignment", whoHint: "Class", doneLabel: "Turned in",
    task: (p) => `Due: ${p.title}${p.who ? ` · ${p.who}` : ""}`, minutes: 30,
    empty: "Add what’s due. The countdown keeps it in view, and it shows up on the day.",
    words: ["school", "college", "grad", "graduate", "class", "classes", "course", "study", "studying", "exam", "degree", "license", "licensure", "certification", "homework"],
  },
  care: {
    kind: "care", title: "Care list", blurb: "Appointments and refills that come back on their own",
    noun: "item", titleHint: "Refill, appointment or call", whoHint: "For", doneLabel: "Done", repeat: true,
    task: (p) => `${p.title}${p.who ? ` · ${p.who}` : ""}`, minutes: 15,
    empty: "Add refills and appointments. Set it to repeat and the next one is scheduled when you finish this one.",
    words: ["care", "caregiver", "caregiving", "mom", "dad", "mother", "father", "grandma", "grandpa", "parents", "health", "medical", "nurse", "doctor", "pharmacy"],
  },
  commitments: {
    kind: "commitments", title: "Commitments", blurb: "What you said yes to, and when it’s due",
    noun: "commitment", titleHint: "What you signed up for", whoHint: "Group", doneLabel: "Done", repeat: true,
    task: (p) => `${p.title}${p.who ? ` · ${p.who}` : ""}`, minutes: 20,
    empty: "Add what you’ve agreed to do. It lands on its date, so nothing slips.",
    words: ["volunteer", "volunteering", "church", "pta", "pto", "club", "board", "committee", "scouts", "charity", "community", "council"],
  },
  schedule: {
    kind: "schedule", title: "Games and practices", blurb: "The season’s schedule, weekly practices included",
    noun: "game or practice", titleHint: "Practice, or game vs. Tigers", whoHint: "Where", doneLabel: "Done", repeat: true, defaultRepeat: 7,
    task: (p) => `${p.title}${p.who ? ` @ ${p.who}` : ""}`, minutes: 60,
    empty: "Add practices and games. Weekly practices repeat on their own.",
    words: ["coach", "coaching", "sport", "sports", "soccer", "baseball", "softball", "basketball", "football", "hockey", "swim", "dance", "league", "practice", "team", "track"],
  },
  projects: {
    kind: "projects", title: "Projects", blurb: "Each project’s next step and your sessions this week",
    noun: "project", titleHint: "Project name", whoHint: "Next step", doneLabel: "Worked on it", sessions: true, repeat: true,
    task: (p) => `${p.title}${p.who ? `: ${p.who}` : ""}`, minutes: 30,
    empty: "Add a project and its next step. Tap “Worked on it” after a session; Hats counts your sessions this week (no streaks).",
    words: ["write", "writing", "writer", "author", "book", "books", "art", "artist", "paint", "music", "band", "song", "garden", "gardening", "diy", "build", "craft", "crafts", "project", "projects", "photo", "photography", "podcast", "renovation"],
  },
};
export const PACK_KINDS = Object.keys(PACKS) as PackKind[];

/* ------------------------------------------------------------ suggestions */

const wordsOf = (s: string) => s.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).filter(Boolean);

/** The packs that fit a hat best, by its name (and its library hat's words for one you added). */
export function suggestPacks(hat: PersonalHat, list: CustomHat[] = []): PackKind[] {
  const def = hatDef(hat, list);
  const mine = isCustomHatId(hat) ? list.find((h) => h.id === hat) : undefined;
  const nameWords = new Set(wordsOf(def.name));
  const libWords = new Set(mine ? libraryHat(mine.art).words : []);
  const builtIn: Partial<Record<PersonalHat, PackKind[]>> = {
    work: ["people", "deadlines", "issues"],
    friends: ["care", "commitments"],
    myself: ["projects", "deadlines"],
    dad: ["schedule", "care"],
    husband: ["projects"],
    home: ["projects", "money"],
    pets: ["care"],
  };
  const score = (k: PackKind) => {
    const w = PACKS[k].words;
    return w.filter((x) => nameWords.has(x)).length * 3 + w.filter((x) => libWords.has(x)).length;
  };
  const ranked = PACK_KINDS.map((k) => [k, score(k)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const order = [...ranked, ...(builtIn[hat] ?? [])];
  return [...new Set(order)];
}

/* ------------------------------------------------------------ items */

export const packsFor = (d: PersonalData, hat: PersonalHat): PackKind[] => d.packs?.[hat] ?? [];

export function addPack(d: PersonalData, hat: PersonalHat, kind: PackKind) {
  const now = packsFor(d, hat);
  if (now.includes(kind)) return;
  d.packs = { ...(d.packs ?? {}), [hat]: [...now, kind] };
}

/** Takes a pack off a hat. Its list is kept, so adding it back brings everything back. */
export function removePack(d: PersonalData, hat: PersonalHat, kind: PackKind) {
  d.packs = { ...(d.packs ?? {}), [hat]: packsFor(d, hat).filter((k) => k !== kind) };
  syncPacks(d);
}

export function addPackItem(
  d: PersonalData,
  fields: Partial<PackItem> & { hat: PersonalHat; kind: PackKind; title: string },
  nowIso = new Date().toISOString(),
): PackItem {
  const item: PackItem = {
    id: fields.id ?? id(),
    hat: fields.hat,
    kind: fields.kind,
    title: fields.title.trim(),
    who: (fields.who ?? "").trim(),
    date: fields.date ?? null,
    time: fields.time ?? null,
    repeatDays: fields.repeatDays ?? PACKS[fields.kind].defaultRepeat ?? 0,
    amount: fields.amount ?? null,
    doneAt: null,
    last: null,
    sessions: [],
    createdAt: nowIso,
  };
  d.packItems = [...(d.packItems ?? []), item];
  syncPacks(d);
  return item;
}

export function updatePackItem(d: PersonalData, itemId: string, patch: Partial<Omit<PackItem, "id" | "hat" | "kind" | "createdAt">>) {
  d.packItems = (d.packItems ?? []).map((p) => (p.id === itemId ? { ...p, ...patch } : p));
  syncPacks(d);
}

export function deletePackItem(d: PersonalData, itemId: string) {
  d.packItems = (d.packItems ?? []).filter((p) => p.id !== itemId);
  syncPacks(d);
}

/**
 * Finishing an item. People and projects log it and stay; repeating items move to their next
 * date; everything else is done.
 */
export function finishPackItem(d: PersonalData, itemId: string, today: string, nowIso = new Date().toISOString()) {
  const p = (d.packItems ?? []).find((x) => x.id === itemId);
  if (!p) return;
  const def = PACKS[p.kind];
  // The to-do for this date is done too (when it was checked off here instead of on Today).
  for (const t of d.tasks) if (!t.doneAt && t.source === sourceFor(p)) t.doneAt = nowIso;
  if (def.sessions) p.sessions = [...p.sessions, today];
  if (def.people) p.last = today;
  if (p.repeatDays > 0) {
    // On time: count from the planned date. Late: count from today.
    const base = p.date && p.date >= today ? p.date : today;
    p.date = addDays(base, p.repeatDays);
  } else if (def.people || def.sessions) {
    p.date = null;
  } else {
    p.doneAt = nowIso;
  }
  syncPacks(d);
}

export function reopenPackItem(d: PersonalData, itemId: string) {
  const p = (d.packItems ?? []).find((x) => x.id === itemId);
  if (p) p.doneAt = null;
  syncPacks(d);
}

/** Each dated item has one to-do, tagged with the item and its date. */
export const sourceFor = (p: Pick<PackItem, "id" | "date">) => `pack:${p.id}:${p.date}`;
const itemIdOf = (source: string | undefined) => (source?.startsWith("pack:") ? source.split(":")[1] : null);

/**
 * Keeps to-dos in step with pack lists: one open to-do per dated item on a pack the hat still
 * has, and a to-do checked off on Today moves its item along. Returns true when anything changed.
 */
export function syncPacks(d: PersonalData, nowIso = new Date().toISOString()): boolean {
  let changed = false;
  const items = d.packItems ?? [];
  // 1. To-dos finished elsewhere (Today, a widget) finish their item.
  for (const t of d.tasks) {
    const itemId = itemIdOf(t.source);
    if (!itemId || !t.doneAt) continue;
    const p = items.find((x) => x.id === itemId);
    if (p && !p.doneAt && p.date && t.source === sourceFor(p)) {
      finishPackItem(d, p.id, t.doneAt.slice(0, 10), t.doneAt);
      return true;
    }
  }
  // 2. One open to-do per dated, open item whose pack is on its hat.
  const wanted = new Map<string, PackItem>();
  for (const p of items) {
    if (p.doneAt || !p.date || !packsFor(d, p.hat).includes(p.kind)) continue;
    wanted.set(sourceFor(p), p);
  }
  const before = d.tasks.length;
  d.tasks = d.tasks.filter((t) => !(itemIdOf(t.source) && !t.doneAt && !wanted.has(t.source!)));
  if (d.tasks.length !== before) changed = true;
  for (const [source, p] of wanted) {
    const def = PACKS[p.kind];
    const title = def.task(p);
    const open = d.tasks.find((t) => t.source === source && !t.doneAt);
    if (open) {
      if (open.title !== title || open.time !== p.time || open.hat !== p.hat) {
        open.title = title;
        open.time = p.time;
        open.fixed = !!p.time;
        open.hat = p.hat;
        changed = true;
      }
      continue;
    }
    if (d.tasks.some((t) => t.source === source)) continue; // already done for this date
    d.tasks.push(makeTask(title, p.hat, p.date!, { source, time: p.time, fixed: !!p.time, minutes: def.minutes, createdAt: nowIso, reason: def.title }));
    changed = true;
  }
  return changed;
}

/* ------------------------------------------------------------ views */

export function packList(d: PersonalData, hat: PersonalHat, kind: PackKind) {
  const all = (d.packItems ?? []).filter((p) => p.hat === hat && p.kind === kind);
  const open = all.filter((p) => !p.doneAt).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.title.localeCompare(b.title));
  const done = all.filter((p) => p.doneAt).sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return { open, done };
}

/** "Today", "Tomorrow", "in 5 days", "3 days late". */
export function countdown(date: string | null, today: string): string {
  if (!date) return "No date";
  const n = daysBetween(today, date);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "1 day late";
  return n > 0 ? `in ${n} days` : `${-n} days late`;
}

export const money = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** The line under a pack: money for jobs, sessions for projects, what's coming for the rest. */
export function packSummary(d: PersonalData, hat: PersonalHat, kind: PackKind, today: string): string {
  const def = PACKS[kind];
  const { open, done } = packList(d, hat, kind);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  if (def.amount) {
    const month = today.slice(0, 7);
    const paid = sum(done.filter((p) => p.doneAt?.slice(0, 7) === month).map((p) => p.amount ?? 0));
    const owed = sum(open.map((p) => p.amount ?? 0));
    return `${money(paid)} paid this month · ${money(owed)} still owed`;
  }
  if (def.sessions) {
    const wk = weekStart(today);
    const n = sum(open.concat(done).map((p) => p.sessions.filter((s) => s >= wk && s <= today).length));
    return `${n} ${n === 1 ? "session" : "sessions"} this week`;
  }
  if (!open.length) return def.blurb;
  const soon = open.filter((p) => p.date && p.date <= addDays(today, 7)).length;
  return soon ? `${soon} coming up this week` : `${open.length} on the list`;
}
