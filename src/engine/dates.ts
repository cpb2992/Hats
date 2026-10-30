/** Local-time date helpers. Dates are YYYY-MM-DD strings; times are HH:MM (24h). */

const pad = (n: number) => String(n).padStart(2, '0');

export function todayISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(iso: string): number {
  return fromISO(iso).getDay();
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((fromISO(toIso).getTime() - fromISO(fromIso).getTime()) / 86400000);
}

/** Monday of the week containing iso. */
export function weekStart(iso: string): string {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

/** The next date (after today) that falls on one of the given weekdays. */
export function nextWorkday(iso: string, workdays: number[]): string {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(iso, i);
    if (workdays.includes(weekday(d))) return d;
  }
  return addDays(iso, 1);
}

export function nextMonday(iso: string): string {
  return addDays(weekStart(iso), 7);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function timeOf(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function nowMinutes(d: Date = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "16:45" -> "4:45" (with " PM" when ampm is true) */
export function fmtTime(time: string, ampm = false): string {
  const [h, m] = time.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)}${ampm ? (h % 24 < 12 ? ' AM' : ' PM') : ''}`;
}

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const dayName = (iso: string) => DAY[weekday(iso)];
export const dayShort = (iso: string) => DAY[weekday(iso)].slice(0, 3);
export const monthShort = (iso: string) => MON[fromISO(iso).getMonth()];
export const monthName = (iso: string) => MONTH[fromISO(iso).getMonth()];

/** "Mon, Nov 2" */
export function fmtShort(iso: string): string {
  const d = fromISO(iso);
  return `${DAY[d.getDay()].slice(0, 3)}, ${MON[d.getMonth()]} ${d.getDate()}`;
}

/** "Thursday, October 22" */
export function fmtLong(iso: string): string {
  const d = fromISO(iso);
  return `${DAY[d.getDay()]}, ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

/** Relative label for a task date: Today, Tomorrow, Friday, or Mon, Nov 2. */
export function fmtRelative(iso: string, today: string): string {
  const n = daysBetween(today, iso);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return dayName(iso);
  return fmtShort(iso);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** School-year months, September to June. */
export function schoolMonths(today: string): string[] {
  const d = fromISO(today);
  const startYear = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  const out: string[] = [];
  for (let i = 0; i < 10; i++) {
    const m = (8 + i) % 12;
    const y = startYear + (8 + i >= 12 ? 1 : 0);
    out.push(`${y}-${pad(m + 1)}`);
  }
  return out;
}

export function greeting(minutes: number): string {
  if (minutes < 12 * 60) return 'Morning';
  if (minutes < 17 * 60) return 'Afternoon';
  return 'Evening';
}
