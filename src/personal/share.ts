/**
 * Family sharing: which parts of your plan the household shares, and how changes from the
 * other phone merge in. Pure (no network), so it can be tested.
 *
 * Shared: the grocery list, what's in the kitchen, the dinner plan, date nights (unless it's a
 * surprise), family events (Partner, Parent, Home and Pets hats, or any event you share), and
 * to-dos you choose to share. Private: Work, Myself, Friends, your own hats, Google events,
 * notes, money, habits and everything else.
 *
 * Each shared thing has a stable id ("grocery:milk", "event:<id>"). The phone remembers a
 * fingerprint of each one as last synced; a different fingerprint means it changed here and
 * gets sent, and a remote change only lands if the thing hasn't also changed here since.
 */
import { addDays } from "../engine/dates";
import {
  isBuiltInHat,
  validDate,
  type BuiltInHat,
  type DatePlan,
  type Meal,
  type PersonalData,
  type PersonalEvent,
  type PersonalHat,
  type PersonalTask,
  type Step,
} from "./model";
import { findMeal } from "./meals";
import { validRule } from "./repeat";

export type SharedKind = "grocery" | "pantry" | "dinner" | "event" | "task" | "date";
export interface SharedItem {
  id: string;
  kind: SharedKind;
  payload: Record<string, unknown>;
}
/** A row as the server returns it. Its payload came from another phone: check it before use. */
export interface RemoteRow {
  id: string;
  kind: string;
  payload: unknown;
  deleted: boolean;
  updated_at: string;
  updated_by: string | null;
}
export interface OutRow {
  id: string;
  kind: SharedKind;
  payload: Record<string, unknown>;
  deleted: boolean;
}
export interface ShareState {
  householdId: string;
  /** Newest server time seen; the next pull asks for changes since a little before it. */
  lastPull: string;
  /** Fingerprint of each shared thing as this phone had it when last in step ("x" = removed). */
  synced: Record<string, string>;
  /** Fingerprint of the server's version last dealt with, so a re-read row is skipped. */
  seen?: Record<string, string>;
}
export interface Member {
  id: string;
  name: string;
}

/** Hats whose events the family sees without asking. */
export const FAMILY_HATS: BuiltInHat[] = ["husband", "dad", "home", "pets"];
const GONE = "x";

export const groceryKey = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();

/** Does the family see this event? Yours to change; Google events never leave the phone. */
export function eventShared(e: PersonalEvent) {
  if (e.source !== "hats" || e.closure) return false;
  if (e.shared !== undefined) return e.shared;
  return !!e.hat && (FAMILY_HATS as PersonalHat[]).includes(e.hat);
}
/** A built-in hat travels; your own hats don't exist on the other phone. */
const wireHat = (h: PersonalHat | undefined) => (isBuiltInHat(h) ? h : undefined);
const clean = (o: Record<string, unknown>) => {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
};

/** Everything this phone shares, by id. */
export function sharedFromLocal(d: PersonalData): Map<string, SharedItem> {
  const out = new Map<string, SharedItem>();
  const put = (id: string, kind: SharedKind, payload: Record<string, unknown>) =>
    out.set(id, { id, kind, payload: clean(payload) });
  for (const g of d.groceries) {
    const k = groceryKey(g);
    if (k && !out.has(`grocery:${k}`)) put(`grocery:${k}`, "grocery", { name: g.trim() });
  }
  for (const p of d.pantry) {
    const k = groceryKey(p);
    if (k && !out.has(`pantry:${k}`)) put(`pantry:${k}`, "pantry", { name: p.trim() });
  }
  for (const [date, mealId] of Object.entries(d.dinners)) {
    if (!validDate(date) || !mealId) continue;
    const saved = d.meals.find((m) => m.id === mealId);
    put(`dinner:${date}`, "dinner", {
      date,
      mealId,
      meal: saved
        ? { id: saved.id, name: saved.name, ingredients: saved.ingredients, minutes: saved.minutes, prep: saved.prep }
        : undefined,
    });
  }
  for (const e of d.events)
    if (eventShared(e))
      put(`event:${e.id}`, "event", {
        id: e.id,
        title: e.title,
        date: e.date,
        start: e.start,
        end: e.end,
        allDay: e.allDay,
        location: e.location || undefined,
        hat: wireHat(e.hat),
        repeat: e.repeat,
        skip: e.skip?.length ? e.skip : undefined,
      });
  for (const t of d.tasks)
    if (t.shared)
      put(`task:${t.id}`, "task", {
        id: t.id,
        title: t.title,
        hat: wireHat(t.hat),
        date: t.date,
        time: t.time,
        minutes: t.minutes,
        doneAt: t.doneAt,
        steps: t.steps.map((s) => ({ title: s.title, done: s.done })),
        note: t.note || undefined,
        assignee: t.assignee,
      });
  for (const p of d.dates)
    if (!p.surprise)
      put(`date:${p.id}`, "date", {
        id: p.id,
        date: p.date,
        time: p.time,
        title: p.title,
        budget: p.budget,
        childcare: p.childcare,
        transport: p.transport,
        steps: p.steps.map((s) => ({ title: s.title, done: s.done })),
        note: p.note,
      });
  return out;
}

/** A short fingerprint of a payload; key order doesn't matter. */
export function fingerprint(payload: unknown): string {
  const stable = (v: unknown): string =>
    Array.isArray(v)
      ? `[${v.map(stable).join(",")}]`
      : v && typeof v === "object"
        ? `{${Object.keys(v as object)
            .sort()
            .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
            .join(",")}}`
        : JSON.stringify(v ?? null);
  const s = stable(payload);
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = (Math.imul(b, 33) + c) | 0;
  }
  return `${(a >>> 0).toString(36)}${(b >>> 0).toString(36)}`;
}

/**
 * Worth sending the first time? Old history stays home; anything already shared keeps
 * syncing however old it gets.
 */
export function inWindow(item: SharedItem, today: string) {
  const p = item.payload;
  switch (item.kind) {
    case "dinner":
      return String(p.date) >= addDays(today, -3);
    case "event": {
      const r = p.repeat as PersonalEvent["repeat"];
      return String(p.date) >= addDays(today, -30) || (!!r && (!r.until || r.until >= today));
    }
    case "task":
      return !p.doneAt || String(p.doneAt).slice(0, 10) >= addDays(today, -7);
    case "date":
      return String(p.date) >= addDays(today, -7);
    default:
      return true;
  }
}

const kindOf = (id: string) => id.slice(0, id.indexOf(":")) as SharedKind;

/** What this phone needs to send: new or changed things, and things removed here. */
export function changesToSend(d: PersonalData, state: ShareState, today: string): OutRow[] {
  const local = sharedFromLocal(d);
  const out: OutRow[] = [];
  for (const item of local.values()) {
    const was = state.synced[item.id];
    if (was === fingerprint(item.payload)) continue;
    if (was === undefined && !inWindow(item, today)) continue;
    out.push({ ...item, deleted: false });
  }
  for (const [id, was] of Object.entries(state.synced))
    if (was !== GONE && !local.has(id)) out.push({ id, kind: kindOf(id), payload: {}, deleted: true });
  return out;
}

/** After the server took them, remember what was sent. */
export function markSent(state: ShareState, rows: OutRow[]) {
  state.seen ??= {};
  for (const r of rows) state.synced[r.id] = state.seen[r.id] = r.deleted ? GONE : fingerprint(r.payload);
}

// ── Checking what came from the other phone ────────────────────────────────

const str = (x: unknown, max = 200): x is string => typeof x === "string" && x.length <= max;
const time = (x: unknown): x is string => typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const money = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0 && x < 1e6;
const steps = (x: unknown): x is Step[] =>
  Array.isArray(x) && x.length <= 40 && x.every((s) => s && str(s.title) && typeof s.done === "boolean");
type P = Record<string, unknown>;
const okName = (p: P) => str(p.name, 80) && p.name.trim().length > 0;
const okDinner = (p: P) =>
  validDate(p.date) &&
  str(p.mealId, 120) &&
  p.mealId.length > 0 &&
  (p.meal === undefined ||
    (!!p.meal &&
      typeof p.meal === "object" &&
      str((p.meal as P).name, 80) &&
      Array.isArray((p.meal as P).ingredients) &&
      ((p.meal as P).ingredients as unknown[]).every((i) => str(i, 80))));
const okEvent = (p: P) =>
  str(p.id, 100) &&
  str(p.title) &&
  validDate(p.date) &&
  time(p.start) &&
  time(p.end) &&
  typeof p.allDay === "boolean" &&
  (p.location === undefined || str(p.location)) &&
  (p.hat === undefined || isBuiltInHat(p.hat)) &&
  (p.repeat === undefined || validRule(p.repeat)) &&
  (p.skip === undefined || (Array.isArray(p.skip) && p.skip.length < 400 && p.skip.every(validDate)));
const okTask = (p: P) =>
  str(p.id, 100) &&
  str(p.title) &&
  (p.hat === undefined || isBuiltInHat(p.hat)) &&
  validDate(p.date) &&
  (p.time === null || time(p.time)) &&
  typeof p.minutes === "number" &&
  p.minutes >= 1 &&
  p.minutes <= 240 &&
  (p.doneAt === null || str(p.doneAt, 40)) &&
  steps(p.steps) &&
  (p.note === undefined || str(p.note, 2000)) &&
  (p.assignee === undefined || str(p.assignee, 60));
const okDate = (p: P) =>
  str(p.id, 100) &&
  validDate(p.date) &&
  (p.time === undefined || time(p.time)) &&
  str(p.title) &&
  money(p.budget) &&
  money(p.childcare) &&
  money(p.transport) &&
  steps(p.steps) &&
  str(p.note, 2000);
const CHECK: Record<SharedKind, (p: P) => boolean> = {
  grocery: okName,
  pantry: okName,
  dinner: okDinner,
  event: okEvent,
  task: okTask,
  date: okDate,
};
/** A row we can trust the shape of (another phone, an older version, or a bad actor). */
export function validRow(r: RemoteRow): r is RemoteRow & { kind: SharedKind; payload: P } {
  if (!r || !str(r.id, 120) || !(r.kind in CHECK) || !r.id.startsWith(`${r.kind}:`)) return false;
  if (r.deleted) return true;
  return !!r.payload && typeof r.payload === "object" && CHECK[r.kind as SharedKind](r.payload as P);
}

// ── Merging it in ──────────────────────────────────────────────────────────

const removeWhere = <T>(list: T[], gone: (x: T) => boolean) => {
  for (let i = list.length - 1; i >= 0; i--) if (gone(list[i])) list.splice(i, 1);
};

/**
 * Where something from the other phone is filed here. Their Work, Myself or Friends things are
 * about them, so they go under the partner hat; family hats mean the same on both phones.
 * Once filed, the hat is this phone's to change.
 */
const landHat = (h: unknown): BuiltInHat =>
  !isBuiltInHat(h) ? "home" : (["myself", "work", "friends"] as BuiltInHat[]).includes(h) ? "husband" : h;

function applyOne(d: PersonalData, r: RemoteRow & { kind: SharedKind; payload: P }, by: string | undefined) {
  const p = r.payload;
  const key = r.id.slice(r.kind.length + 1);
  switch (r.kind) {
    case "grocery":
    case "pantry": {
      const list = r.kind === "grocery" ? d.groceries : d.pantry;
      if (r.deleted) removeWhere(list, (g) => groceryKey(g) === key);
      else if (!list.some((g) => groceryKey(g) === key)) list.push((p.name as string).trim());
      return;
    }
    case "dinner": {
      if (r.deleted) {
        delete d.dinners[key];
        return;
      }
      const mealId = p.mealId as string;
      const meal = p.meal as Partial<Meal> | undefined;
      if (meal && !findMeal(d, mealId))
        d.meals.push({
          id: mealId,
          name: String(meal.name),
          ingredients: (meal.ingredients ?? []).map(String),
          minutes: typeof meal.minutes === "number" && meal.minutes > 0 ? meal.minutes : 30,
          prep: typeof meal.prep === "string" ? meal.prep : "",
          favorite: false,
        });
      d.dinners[p.date as string] = mealId;
      return;
    }
    case "event": {
      if (r.deleted) {
        removeWhere(d.events, (e) => e.id === key && e.source === "hats");
        return;
      }
      const fields: Partial<PersonalEvent> = {
        title: p.title as string,
        date: p.date as string,
        start: p.start as string,
        end: p.end as string,
        allDay: p.allDay as boolean,
        location: (p.location as string) ?? "",
        repeat: p.repeat as PersonalEvent["repeat"],
        skip: p.skip as string[] | undefined,
      };
      const mine = d.events.find((e) => e.id === key);
      if (mine) {
        if (mine.source !== "hats") return;
        Object.assign(mine, fields);
        if (!mine.repeat) delete mine.repeat;
        if (!mine.skip) delete mine.skip;
      } else
        d.events.push(
          clean({
            id: key,
            source: "hats",
            ...fields,
            hat: landHat(p.hat),
            shared: true,
            sharedBy: by,
          }) as unknown as PersonalEvent,
        );
      return;
    }
    case "task": {
      if (r.deleted) {
        removeWhere(d.tasks, (t) => t.id === key);
        return;
      }
      const fields = {
        title: p.title as string,
        date: p.date as string,
        time: p.time as string | null,
        minutes: p.minutes as number,
        doneAt: p.doneAt as string | null,
        steps: (p.steps as Step[]).map((s) => ({ title: s.title, done: s.done })),
      };
      const mine = d.tasks.find((t) => t.id === key);
      if (mine) {
        Object.assign(mine, fields);
        if (p.note !== undefined) mine.note = p.note as string;
        else delete mine.note;
        if (p.assignee !== undefined) mine.assignee = p.assignee as string;
        else delete mine.assignee;
      } else {
        const task: PersonalTask = {
          id: key,
          ...fields,
          hat: landHat(p.hat),
          essential: false,
          fixed: !!fields.time,
          repeat: "none",
          createdAt: new Date().toISOString(),
          deferred: 0,
          shared: true,
        };
        if (by) task.sharedBy = by;
        if (p.note !== undefined) task.note = p.note as string;
        if (p.assignee !== undefined) task.assignee = p.assignee as string;
        d.tasks.push(task);
      }
      return;
    }
    case "date": {
      if (r.deleted) {
        removeWhere(d.dates, (x) => x.id === key);
        return;
      }
      const fields: Partial<DatePlan> = {
        date: p.date as string,
        title: p.title as string,
        budget: p.budget as number,
        childcare: p.childcare as number,
        transport: p.transport as number,
        steps: (p.steps as Step[]).map((s) => ({ title: s.title, done: s.done })),
        note: p.note as string,
      };
      const mine = d.dates.find((x) => x.id === key);
      if (mine) {
        Object.assign(mine, fields);
        if (p.time) mine.time = p.time as string;
        else delete mine.time;
      } else d.dates.push({ id: key, ...fields, ...(p.time ? { time: p.time as string } : {}), ...(by ? { sharedBy: by } : {}) } as DatePlan);
      return;
    }
  }
}

/**
 * Merges rows from the server into `d` (changing it in place) and the sync memory. Your own
 * rows only update the memory. Something changed both here and there keeps this phone's
 * version, which is sent next. The first time two phones meet, the household's copy wins.
 * Returns how many things changed here.
 */
export function mergeRemote(
  d: PersonalData,
  rows: RemoteRow[],
  state: ShareState,
  me: string,
  members: Member[],
): number {
  const local = sharedFromLocal(d);
  const applied = new Set<string>();
  const seen = (state.seen ??= {});
  for (const r of rows) {
    if (!validRow(r)) continue;
    const theirs = r.deleted ? GONE : fingerprint(r.payload);
    if (seen[r.id] === theirs) continue;
    seen[r.id] = theirs;
    // What this phone sent (if it changed here since, the next send catches it). After a
    // reinstall the memory is empty, and your own things come back like anyone's.
    if (r.updated_by === me && state.synced[r.id] !== undefined) continue;
    const was = state.synced[r.id];
    if (was === theirs) continue;
    const item = local.get(r.id);
    const here = item ? fingerprint(item.payload) : GONE;
    if (here === theirs) {
      state.synced[r.id] = theirs;
      continue;
    }
    // Changed here too: this phone's version wins and goes out next.
    if (was !== undefined && here !== was) continue;
    // Removed there before this phone ever had it: nothing to do.
    if (was === undefined && r.deleted) {
      state.synced[r.id] = theirs;
      continue;
    }
    const by = r.updated_by === me ? undefined : members.find((m) => m.id === r.updated_by)?.name || "Family";
    applyOne(d, r, by);
    state.synced[r.id] = theirs;
    applied.add(r.id);
  }
  // What landed here can look slightly different (a hat filed this phone's way); remember it
  // as this phone sees it, or it would bounce straight back.
  if (applied.size) {
    const after = sharedFromLocal(d);
    for (const id of applied) {
      const item = after.get(id);
      if (item) state.synced[id] = fingerprint(item.payload);
    }
  }
  return applied.size;
}

/** Newest server time in a batch. */
export const newest = (rows: RemoteRow[], since: string) =>
  rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), since);

/** Who did it, for "Added by Jess". */
export const memberName = (members: Member[], id: string | undefined) =>
  members.find((m) => m.id === id)?.name;
