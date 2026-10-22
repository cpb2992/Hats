/**
 * The phone's calendar (Google Calendar, Samsung Calendar — whatever syncs to the device).
 * Hats reads every visible calendar for the day view and writes new events to the one Chris picks.
 */
import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { CalEvent } from '../engine/assistant';
import { addDays } from '../engine/dates';

export const calendarSupported = Platform.OS === 'android' || Platform.OS === 'ios';

export interface PhoneCalendar {
  id: string;
  title: string;
  account: string;
  color: string;
  primary: boolean;
  writable: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export async function hasCalendarAccess(): Promise<boolean> {
  if (!calendarSupported) return false;
  try { return (await Calendar.getCalendarPermissionsAsync()).granted; } catch { return false; }
}

export async function askCalendarAccess(): Promise<boolean> {
  if (!calendarSupported) return false;
  try { return (await Calendar.requestCalendarPermissionsAsync()).granted; } catch { return false; }
}

const WRITE_LEVELS = new Set(['owner', 'editor', 'contributor', 'root']);

function writable(c: Calendar.Calendar): boolean {
  if (!c.allowsModifications) return false;
  return !c.accessLevel || WRITE_LEVELS.has(String(c.accessLevel));
}

export async function listCalendars(): Promise<PhoneCalendar[]> {
  if (!(await hasCalendarAccess())) return [];
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return all
    .filter(c => c.isVisible !== false)
    .map(c => ({ id: c.id, title: c.title || c.name || 'Calendar', account: c.source?.name ?? c.ownerAccount ?? '', color: c.color ?? '#9AA39D', primary: !!c.isPrimary, writable: writable(c) }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || Number(b.writable) - Number(a.writable) || a.title.localeCompare(b.title));
}

/** The calendar new events go to when Chris hasn't picked one: the primary writable one. */
export async function defaultCalendar(): Promise<PhoneCalendar | null> {
  const cals = (await listCalendars()).filter(c => c.writable);
  return cals.find(c => c.primary && /@/.test(c.account)) ?? cals.find(c => c.primary) ?? cals[0] ?? null;
}

/** Events from every visible calendar, from today through `days` days ahead. */
export async function loadEvents(today: string, days = 14): Promise<CalEvent[]> {
  if (!(await hasCalendarAccess())) return [];
  const cals = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).filter(c => c.isVisible !== false);
  if (!cals.length) return [];
  const byId = new Map(cals.map(c => [c.id, c]));
  const start = new Date(`${today}T00:00:00`);
  const end = new Date(`${addDays(today, days)}T23:59:59`);
  const raw = await Calendar.getEventsAsync(cals.map(c => c.id), start, end);
  const out: CalEvent[] = [];
  for (const e of raw) {
    if ((e as { status?: string }).status === 'canceled') continue;
    const cal = byId.get(e.calendarId);
    const s = new Date(e.startDate);
    const f = new Date(e.endDate);
    if (Number.isNaN(s.getTime())) continue;
    // All-day events are stored at UTC midnight; their date is the UTC date.
    const date = e.allDay ? s.toISOString().slice(0, 10) : localDate(s);
    out.push({
      id: e.id,
      calendarId: e.calendarId,
      calendar: cal?.title ?? '',
      color: cal?.color ?? '#9AA39D',
      title: e.title || '(No title)',
      date,
      start: e.allDay ? null : localTime(s),
      end: e.allDay || Number.isNaN(f.getTime()) ? null : localTime(f),
      allDay: !!e.allDay,
      location: e.location ?? '',
      canEdit: !!cal && writable(cal) && !e.recurrenceRule,
    });
  }
  return out.sort((a, b) => (a.date + (a.start ?? '00:00')).localeCompare(b.date + (b.start ?? '00:00')));
}

interface EventTimes { date: string; start: string | null; end: string | null; allDay: boolean }

function times({ date, start, end, allDay }: EventTimes) {
  if (allDay || !start) {
    const [y, m, d] = date.split('-').map(Number);
    return { startDate: new Date(Date.UTC(y, m - 1, d)), endDate: new Date(Date.UTC(y, m - 1, d + 1)), allDay: true, timeZone: 'UTC' };
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { startDate: new Date(`${date}T${start}:00`), endDate: new Date(`${date}T${end ?? start}:00`), allDay: false, timeZone: tz };
}

export async function createEvent(calendarId: string, ev: EventTimes & { title: string; location?: string; note?: string }): Promise<string> {
  return Calendar.createEventAsync(calendarId, {
    title: ev.title,
    location: ev.location || undefined,
    notes: ev.note ? `${ev.note}\n\nAdded by Hats` : 'Added by Hats',
    ...times(ev),
  });
}

export async function moveEvent(id: string, ev: EventTimes): Promise<void> {
  await Calendar.updateEventAsync(id, times(ev));
}

export async function deleteEvent(id: string): Promise<void> {
  await Calendar.deleteEventAsync(id);
}
