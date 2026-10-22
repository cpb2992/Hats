/** Works out which reminders to schedule for the coming week. Scheduling itself lives in services/notifications. */
import { addDays, fmtTime, fromISO, minutesOf, todayISO, weekday } from './dates';
import { HATS } from './hats';
import { blockMinutes, freeBlocks } from './schedule';
import type { AppData } from './types';

export interface Planned {
  id: string;
  title: string;
  body: string;
  at: Date;
  url: string;
}

export function atTime(date: string, time: string): Date {
  const d = fromISO(date);
  const m = minutesOf(time);
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

export function morningBody(dinner: string | undefined): string {
  if (!dinner) return 'Two minutes to pick today’s three.';
  if (/^leftovers?$/i.test(dinner.trim())) return 'Leftovers tonight, nothing to defrost. Pick today’s three.';
  return `Move the ${dinner.trim().toLowerCase()} to the fridge, then pick today’s three.`;
}

export function planNotifications(data: AppData, now: Date, days = 7): Planned[] {
  const s = data.settings;
  const today = todayISO(now);
  const out: Planned[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const work = s.workdays.includes(weekday(date));
    if (s.notify.morning && work) {
      const at = atTime(date, s.morning);
      if (at > now) out.push({ id: `sync-morning-${date}`, title: 'Plan your day', body: morningBody(data.dinners[date]), at, url: '/morning' });
    }
    if (s.notify.shutdown && work) {
      const at = atTime(date, s.shutdown);
      const friday = weekday(date) === 5;
      if (at > now) out.push({ id: `sync-shutdown-${date}`, title: friday ? 'Shutdown · end of the week' : 'Shutdown', body: friday ? 'Close the week and see your wins.' : 'Two minutes to close the school day.', at, url: '/shutdown' });
    }
    if (s.notify.blocks && work) {
      for (const blk of freeBlocks(s, date)) {
        const at = atTime(date, blk.start);
        if (at > now) out.push({ id: `sync-free-${date}-${blk.start}`, title: `${blk.label.split(' · ')[0]} · ${blockMinutes(blk)} free minutes`, body: 'Your Now is ready. One thing at a time.', at, url: '/' });
      }
    }
    if (s.notify.events) {
      for (const e of data.events) {
        if (e.date !== date) continue;
        // Timed events: 15 minutes before. All-day events: a heads-up with the morning plan time.
        const at = e.allDay || !e.start ? atTime(date, s.morning) : new Date(atTime(date, e.start).getTime() - 15 * 60000);
        const body = e.allDay || !e.start ? 'Today, all day' : `${fmtTime(e.start, true)}${e.location ? ` · ${e.location}` : ''}`;
        if (at > now) out.push({ id: `sync-event-${e.id}`, title: e.title, body, at, url: '/calendar' });
      }
    }
    if (s.notify.tasks) {
      for (const t of data.tasks) {
        if (t.done || !t.time) continue;
        const on = t.date ?? (i === 0 ? today : null);
        if (on !== date) continue;
        const at = atTime(date, t.time);
        if (at > now) out.push({ id: `sync-task-${t.id}-${date}`, title: t.title, body: `${HATS[t.hat]?.name ?? 'Hats'} · it’s time`, at, url: '/' });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 60);
}
