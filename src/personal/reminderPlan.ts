import { addDays, fmtTime, nowMinutes, todayISO } from "../engine/dates";
import { dinnerNudge, eveningDigest, morningDigest } from "./digest";
import { nextStep, planDay } from "./engine";
import type { PersonalData } from "./model";
import { dayTimeline, minutesOfDay, type TimelineItem } from "./timeline";

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
  // Finished windows, including old fixed tasks, must not masquerade as current.
  const open = items.filter((i) => !i.done && minutesOfDay(i.end ?? i.time) > now &&
    !(i.fixed && data.tasks.find((t) => t.id === i.taskId)?.date !== date));
  const rank = (i: TimelineItem) => i.kind === "date" ? 4 : i.kind === "event" || i.fixed ? 3 : i.kind === "work" ? 2 : 1;
  const active = open.filter((i) => minutesOfDay(i.time) <= now)
    .sort((a, b) => rank(b) - rank(a) || minutesOfDay(b.time) - minutesOfDay(a.time))[0];
  const item = active ?? open.filter((i) => minutesOfDay(i.time) > now)
    .sort((a, b) => minutesOfDay(a.time) - minutesOfDay(b.time))[0];
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
  for (const item of planDay(data, today, now)) {
    if (!item.time) continue;
    const when = at(item.date, item.time);
    if (when.getTime() <= clock.getTime() + 60000) continue;
    if (scheduled.filter((n) => n.taskId).length >= 12) break;
    scheduled.push({ identifier: `personal-task-${item.task.id}`, title: item.task.title,
      body: `${fmtTime(item.time, true)} · ${item.task.steps.length ? `Next: ${nextStep(item.task)} · ` : ""}${item.task.minutes} min`,
      url: "/", taskId: item.task.id, at: when.toISOString() });
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
