/**
 * The weekly rhythm (whose laundry day it is, baths, cleaners, ballet) becomes real Home tasks on the
 * right day, timed to fit around school: laundry after pickups, baths an hour before bedtime.
 */
import { minutesOf, timeOf, weekday } from './dates';
import type { AppData, Chore, Settings } from './types';

export const CHORE_PREFIX = 'ch-';
export const choreTaskId = (c: Chore, date: string) => `${CHORE_PREFIX}${c.id}-${date}`;
export const isChoreTask = (id: string) => id.startsWith(CHORE_PREFIX);

/** Monthly items (label says "monthly") only land on the first matching day of the month. */
export function choresOn(chores: Chore[], date: string): Chore[] {
  const wd = weekday(date);
  const dom = Number(date.slice(8, 10));
  return chores.filter(c => c.days.includes(wd) && (!/monthly/i.test(c.label) || dom <= 7));
}

const shift = (t: string, min: number) => timeOf(Math.max(0, Math.min(23 * 60 + 59, minutesOf(t) + min)));

/** When a rhythm item lands in the day. Its own time wins; otherwise it's placed around school and bedtime. */
export function choreTime(c: Chore, s: Settings, date: string): string | null {
  if (c.time && /^\d{2}:\d{2}$/.test(c.time)) return c.time;
  const school = s.workdays.includes(weekday(date));
  if (c.kind === 'bath') return shift(s.bedtime, -60);
  if (c.kind === 'laundry') return school ? shift(s.pickups, 60) : '10:00';
  return null;
}

const minutesFor = (c: Chore) => (c.kind === 'bath' ? 30 : 15);
const titleFor = (c: Chore) => c.label.replace(/\s*\(monthly\)\s*/i, ' ').trim();

/**
 * Makes today's rhythm tasks (once per item per day) and clears yesterday's undone ones, which would
 * otherwise pile up. Returns true when anything changed.
 */
export function materializeChores(d: AppData, today: string, nowIso: string): boolean {
  let changed = false;
  const before = d.tasks.length;
  d.tasks = d.tasks.filter(t => !(isChoreTask(t.id) && !t.done && t.date != null && t.date < today));
  if (d.tasks.length !== before) changed = true;

  const log = d.days[today] ?? { date: today, recovery: null, three: [], planned: false, shutdown: false };
  const made = new Set(log.chores ?? []);
  const order = d.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  let n = 0;
  for (const c of choresOn(d.chores, today)) {
    if (made.has(c.id)) continue;
    made.add(c.id);
    const id = choreTaskId(c, today);
    if (!d.tasks.some(t => t.id === id)) {
      d.tasks.push({ id, title: titleFor(c), hat: 'home', date: today, time: choreTime(c, d.settings, today), minutes: minutesFor(c), student: null, done: false, doneAt: null, created: nowIso, order: order + n++, deferredAt: null });
    }
    changed = true;
  }
  if (changed) d.days[today] = { ...log, chores: [...made] };
  return changed;
}
