/** Decides what's Now, what's next, and what the day looks like. */
import { addDays, minutesOf, nextMonday, nextWorkday, weekday, weekStart } from './dates';
import { ALL_HATS } from './hats';
import { blocksFor } from './schedule';
import type { AppData, Block, CalEvent, DayLog, HatId, Settings, Task } from './types';

export const SCHOOL_HATS: HatId[] = ['teacher', 'sped', 'dept', 'btu', 'mentor'];

export function dayLog(data: AppData, date: string): DayLog {
  return data.days[date] ?? { date, recovery: null, three: [], planned: false, shutdown: false };
}

export const doneOn = (t: Task, date: string) => t.done && !!t.doneAt && t.doneAt.slice(0, 10) === date;

/** Open tasks that belong to today: undated ones and anything dated today or earlier (quietly rolled forward). */
export function openToday(data: AppData, today: string): Task[] {
  const on = new Set(data.hats.filter(h => h.on).map(h => h.id));
  return data.tasks.filter(t => !t.done && (t.date == null || t.date <= today) && (on.has(t.hat) || !ALL_HATS.includes(t.hat)));
}

const deferredToday = (t: Task, today: string) => !!t.deferredAt && t.deferredAt.slice(0, 10) === today;

/** School hats during the school day; home and personal hats before and after it. Days off: everything fits. */
export function fitsNow(t: Task, s: Settings, today: string, nowMin: number): boolean {
  if (!s.workdays.includes(weekday(today))) return true;
  const atSchool = nowMin >= minutesOf(s.schoolStart) && nowMin < minutesOf(s.shutdown);
  return SCHOOL_HATS.includes(t.hat) === atSchool;
}

/**
 * Today's open tasks in the order Hats will hand them to you. The first one is Now.
 * 1. timed tasks whose time has come, 2. today's three, 3. everything else in your order,
 * 4. timed tasks later today. "Not now" pushes a task behind all of these for the day.
 */
export function queue(data: AppData, today: string, nowMin: number): Task[] {
  const three = dayLog(data, today).three;
  const rank = (t: Task): [number, number, number, number, number] => {
    const deferred = deferredToday(t, today) ? 1 : 0;
    const timeMin = t.time && (t.date === today || t.date == null) ? minutesOf(t.time) : null;
    const pick = three.indexOf(t.id);
    let group: number;
    let sub: number;
    if (timeMin != null && timeMin <= nowMin + 5) { group = 0; sub = timeMin; }
    else if (pick !== -1) { group = 1; sub = pick; }
    else if (timeMin == null) { group = 2; sub = t.order; }
    else { group = 3; sub = timeMin; }
    const defOrder = deferred && t.deferredAt ? Date.parse(t.deferredAt) : 0;
    // A timed task whose time has come always surfaces; otherwise work that fits this part of the day comes first.
    const fit = group === 0 || fitsNow(t, data.settings, today, nowMin) ? 0 : 1;
    return [deferred, group, sub, defOrder, fit];
  };
  return openToday(data, today)
    .map(t => ({ t, r: rank(t) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[3] - b.r[3] || a.r[4] - b.r[4] || a.r[1] - b.r[1] || a.r[2] - b.r[2] || a.t.created.localeCompare(b.t.created))
    .map(x => x.t);
}

export function nowTask(data: AppData, today: string, nowMin: number): Task | null {
  return queue(data, today, nowMin)[0] ?? null;
}

export interface Anchor {
  time: string;
  title: string;
  kind: 'school' | 'shutdown' | 'pickups' | 'bedtime' | 'gym';
}

export function anchors(s: Settings, date: string): Anchor[] {
  const work = s.workdays.includes(weekday(date));
  const out: Anchor[] = [];
  if (work) {
    if (!blocksFor(s, date).length) out.push({ time: s.schoolStart, title: 'School day', kind: 'school' });
    out.push({ time: s.shutdown, title: 'Shutdown', kind: 'shutdown' });
    out.push({ time: s.pickups, title: 'Pickups', kind: 'pickups' });
  }
  out.push({ time: s.bedtime, title: 'Bedtime', kind: 'bedtime' });
  out.push({ time: s.gym, title: 'Gym window', kind: 'gym' });
  return out.sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}

export type DayItem =
  | { kind: 'anchor'; time: string; anchor: Anchor; past: boolean }
  | { kind: 'block'; time: string; block: Block; past: boolean; current: boolean }
  | { kind: 'task'; time: string; task: Task; past: boolean }
  | { kind: 'event'; time: string; event: CalEvent; past: boolean };

/** Bell-schedule blocks, anchors and timed tasks for the day, in clock order. */
export function dayTimeline(data: AppData, today: string, nowMin: number, excludeId?: string | null, events: CalEvent[] = []): DayItem[] {
  const items: DayItem[] = anchors(data.settings, today).map(a => ({ kind: 'anchor', time: a.time, anchor: a, past: minutesOf(a.time) < nowMin }));
  for (const blk of blocksFor(data.settings, today)) {
    const start = minutesOf(blk.start);
    const end = minutesOf(blk.end);
    items.push({ kind: 'block', time: blk.start, block: blk, past: end <= nowMin, current: start <= nowMin && nowMin < end });
  }
  for (const t of data.tasks) {
    if (!t.time || t.id === excludeId) continue;
    const isToday = t.date === today || (t.date == null && !t.done) || doneOn(t, today);
    if (!isToday) continue;
    if (t.done && !doneOn(t, today)) continue;
    items.push({ kind: 'task', time: t.time, task: t, past: minutesOf(t.time) < nowMin });
  }
  // Calendar events for today; all-day ones sit at the top.
  for (const e of events) {
    if (e.date !== today) continue;
    const time = e.allDay || !e.start ? '00:00' : e.start;
    const past = e.allDay ? false : minutesOf(e.end ?? e.start ?? '00:00') <= nowMin;
    items.push({ kind: 'event', time, event: e, past });
  }
  return items.sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}

export function winsOn(data: AppData, date: string): Task[] {
  return data.tasks.filter(t => doneOn(t, date)).sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? ''));
}

/** School tasks still open at shutdown: dated today or earlier, or picked as one of today's three. */
export function openAtShutdown(data: AppData, today: string): Task[] {
  const three = new Set(dayLog(data, today).three);
  return openToday(data, today).filter(t => SCHOOL_HATS.includes(t.hat) && (t.date != null || three.has(t.id)));
}

export type Move = 'tomorrow' | 'nextweek';

export function moveDate(move: Move, today: string, workdays: number[]): string {
  return move === 'tomorrow' ? nextWorkday(today, workdays) : nextMonday(today);
}

/** Candidates for today's three: today's open tasks, deep work first on a green day, quick wins first on a low day. */
export function threeCandidates(data: AppData, today: string, recovery: number | null): Task[] {
  const list = openToday(data, today);
  const low = recovery != null && recovery < 34;
  return [...list].sort((a, b) => {
    const da = a.minutes >= 15 ? 1 : 0;
    const db = b.minutes >= 15 ? 1 : 0;
    if (da !== db) return low ? da - db : db - da;
    return a.order - b.order;
  });
}

export const isDeep = (t: Task) => t.minutes >= 15;

export interface WeekStats {
  start: string;
  wins: number;
  byHat: { hat: HatId; count: number }[];
  points: number;
  cycles: number;
  focusMinutes: number;
  focusSessions: number;
}

export function weekStats(data: AppData, today: string): WeekStats {
  const start = weekStart(today);
  const end = addDays(start, 7);
  const inWeek = (iso: string | null | undefined) => !!iso && iso.slice(0, 10) >= start && iso.slice(0, 10) < end;
  const done = data.tasks.filter(t => t.done && inWeek(t.doneAt));
  const counts = new Map<HatId, number>();
  for (const t of done) counts.set(t.hat, (counts.get(t.hat) ?? 0) + 1);
  const byHat = ALL_HATS.map(hat => ({ hat, count: counts.get(hat) ?? 0 })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  let points = 0;
  for (const s of data.students) for (const p of s.points) if (inWeek(p.date)) points += 1;
  const sessions = data.focus.filter(f => inWeek(f.start));
  return {
    start,
    wins: done.length,
    byHat,
    points,
    cycles: data.cycles.filter(c => inWeek(c.date)).length,
    focusMinutes: sessions.reduce((a, f) => a + f.minutes, 0),
    focusSessions: sessions.length,
  };
}
