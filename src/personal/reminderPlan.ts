import { addDays, fmtTime, nowMinutes, todayISO } from "../engine/dates";
import { dinnerNudge, eveningDigest, morningDigest } from "./digest";
import { nextStep } from "./engine";
import type { PersonalData } from "./model";
import { dayTimeline, minutesOfDay, nowAndNext } from "./timeline";

export interface Notice {
  identifier: string;
  title: string;
  body: string;
  url: string;
  taskId?: string;
  /** ISO timestamp for a scheduled alert; absent for the live Android card. */
  at?: string;
}
export const ownsNotice = (id: string) => id.startsWith("personal-") || id.startsWith("sync-");
export const noticeRevision = (n: Notice) => JSON.stringify([n.title, n.body, n.url, n.taskId ?? "", n.at ?? ""]);

/** A real item and its time, never an empty "ready when you are" placeholder. */
export function currentPlanNotice(data: PersonalData, date: string, now: number): Notice | null {
  const { items } = dayTimeline(data, date, now, date);
  const item = nowAndNext(items, now).now;
  const active = item && minutesOfDay(item.time) <= now;
  if (!item) return null;
  const task = data.tasks.find((t) => t.id === item.taskId);
  const flexibleReady = !!task && !task.fixed && minutesOfDay(item.time) <= now + 5;
  const when = active ? (item.end ? `Until ${fmtTime(item.end, true)}` : "Now") : fmtTime(item.time, true);
  // Flexible slots move with the clock. Avoid rewriting identical content each minute.
  const detail = task
    ? `${task.steps.length ? `Next: ${nextStep(task)} · ` : ""}${task.minutes} min`
    : item.detail;
  return {
    identifier: "personal-now",
    title: `Hats · ${flexibleReady ? "Next step" : active ? "Now" : "Up next"}: ${task?.title ?? item.title}`,
    body: [flexibleReady ? "Next available opening" : when, detail].filter(Boolean).join(" · "),
    url: "/",
    ...(task ? { taskId: task.id } : {}),
  };
}

/** Stable dates and actual task text keep data saves from creating repeat alerts. */
export function personalReminderPlan(data: PersonalData, clock = new Date()): { live: Notice | null; scheduled: Notice[] } {
  if (!data.preferences.notifications) return { live: null, scheduled: [] };
  const today = todayISO(clock), now = nowMinutes(clock);
  const scheduled: Notice[] = [];
  const at = (day: string, time: string) => new Date(`${day}T${time}:00`);
  const dinnerTime = minutesOfDay(data.preferences.dinnerTime ?? "17:45");
  const nudgeMin = Math.max(12 * 60, dinnerTime - 165);
  const nudgeTime = `${String(Math.floor(nudgeMin / 60)).padStart(2, "0")}:${String(nudgeMin % 60).padStart(2, "0")}`;
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(today, offset);
    const summaries = [
      { name: "morning", time: data.preferences.morningReminder, say: morningDigest(data, day) },
      { name: "evening", time: data.preferences.eveningReminder, say: eveningDigest(data, addDays(day, 1)) },
      { name: "dinner", time: nudgeTime, say: data.preferences.dinnerNudge === false ? null : dinnerNudge(data, day) },
    ];
    for (const { name, time, say } of summaries) {
      if (!say || at(day, time).getTime() <= clock.getTime()) continue;
      scheduled.push({ identifier: `personal-${name}-${day}`, title: say.title, body: say.body,
        url: "url" in say ? String(say.url) : name === "evening" ? `/?date=${addDays(day, 1)}` : "/", at: at(day, time).toISOString() });
    }
  }
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(today, offset);
    const timeline = dayTimeline(data, day, offset === 0 ? now : 0, today);
    for (const item of timeline.items) {
      if (!item.eventId && item.kind !== "date" && item.kind !== "event" && !(item.kind === "task" && (item.fixed || offset === 0))) continue;
      const when = at(day, item.time);
      if (when.getTime() <= clock.getTime() + 60000 || scheduled.length >= 60) continue;
      const task = data.tasks.find(t => t.id === item.taskId);
      scheduled.push({ identifier: `personal-plan-${day}-${item.id}`, title: item.title,
        body: `${fmtTime(item.time, true)}${task ? ` · ${task.steps.length ? `Next: ${nextStep(task)} · ` : ""}${task.minutes} min` : ""}${item.detail ? ` · ${item.detail}` : ""}`,
        url: `/?date=${day}`, ...(task ? { taskId: task.id } : {}), at: when.toISOString() });
    }
  }
  return { live: currentPlanNotice(data, today, now), scheduled };
}

export interface SavedNotice { identifier: string; revision?: unknown }
/** Pure reconciliation makes unchanged schedules a no-op, including after app restarts. */
export function reminderChanges(existing: SavedNotice[], desired: Notice[]) {
  const wanted = new Map(desired.map((n) => [n.identifier, n]));
  const previous = new Map(existing.map((n) => [n.identifier, n]));
  return {
    cancel: existing.filter((n) => ownsNotice(n.identifier) && (!wanted.has(n.identifier) || n.revision !== noticeRevision(wanted.get(n.identifier)!))).map((n) => n.identifier),
    schedule: desired.filter((n) => previous.get(n.identifier)?.revision !== noticeRevision(n)),
  };
}

export interface ReminderPort {
  scheduled: () => Promise<SavedNotice[]>;
  presented: () => Promise<SavedNotice[]>;
  cancel: (id: string) => Promise<unknown>;
  dismiss: (id: string) => Promise<unknown>;
  post: (notice: Notice, live: boolean) => Promise<unknown>;
}
export async function applyPersonalReminders(port: ReminderPort, plan: { scheduled: Notice[]; live: Notice | null }, enabled: boolean, android: boolean) {
  const existing = await port.scheduled();
  const changes = reminderChanges(existing, enabled ? plan.scheduled : []);
  for (const id of changes.cancel) await port.cancel(id);
  for (const notice of changes.schedule) await port.post(notice, false);
  const shown = await port.presented();
  // Retire generic notices from the old implementation; leave unrelated timers alone.
  for (const notice of shown)
    if (ownsNotice(notice.identifier) && notice.identifier !== "personal-now" && (!enabled || notice.revision === undefined))
      await port.dismiss(notice.identifier);
  const previous = shown.find((n) => n.identifier === "personal-now");
  if (!enabled || !android || !plan.live) {
    if (previous) await port.dismiss("personal-now");
  } else if (previous?.revision !== noticeRevision(plan.live)) {
    if (previous && previous.revision === undefined) await port.dismiss("personal-now");
    await port.post(plan.live, true);
  }
}
