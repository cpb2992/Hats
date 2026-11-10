import { minutesOf } from "../engine/dates";
import type { PersonalData, PersonalTask } from "./model";
import { eventsOn } from "./repeat";
import { schoolBlocks } from "./school";
import { memoryPriority } from "./memory";

export const PREP_BUFFER = 5;
export interface PrepWindow {
  key: string;
  label: string;
  endsAt: number;
  usableMinutes: number;
  next: { title: string; time: string } | null;
  candidates: PersonalTask[];
  lowEnergy: boolean;
}
/** Suggestions only: never move a task, invent its duration, or claim a meeting is free. */
export function prepWindow(data: PersonalData, date: string, now: number): PrepWindow | null {
  if (data.preferences.hiddenHats?.includes("work")) return null;
  const blocks = schoolBlocks(data, date);
  const prep = blocks.find((b) => b.kind === "off" && minutesOf(b.start) <= now && now < minutesOf(b.end));
  if (!prep) return null;
  const clock = new Date(`${date}T00:00:00`);
  clock.setMinutes(now);
  if (data.protectedUntil && Date.parse(data.protectedUntil) > clock.getTime()) return null;
  const busy = [
    ...eventsOn(data, date).filter((e) => !e.allDay && !/^(work|school|work day|school day)$/i.test(e.title.trim()))
      .map((e) => ({ start: minutesOf(e.start), end: minutesOf(e.end), title: e.title })),
    ...data.tasks.filter((t) => t.fixed && !t.doneAt && t.date === date && t.time)
      .map((t) => ({ start: minutesOf(t.time!), end: minutesOf(t.time!) + t.minutes, title: t.title })),
    ...data.dates.filter((d) => d.date === date).map((d) => ({ start: minutesOf(d.time ?? "19:00") - 30, end: minutesOf(d.time ?? "19:00") + 150, title: d.title })),
  ];
  if (busy.some((b) => b.start <= now && now < b.end)) return null;
  const prepEnd = minutesOf(prep.end);
  const interruption = busy.filter((b) => b.start > now && b.start < prepEnd).sort((a, b) => a.start - b.start)[0];
  const end = interruption?.start ?? prepEnd;
  const usableMinutes = Math.max(0, end - now - PREP_BUFFER);
  const lowEnergy = data.lowEnergyDays.includes(date);
  const candidates = data.tasks.filter((t) => t.hat === "work" && !t.doneAt && !t.fixed && t.date <= date &&
    (!t.assignee || t.assignee === data.household?.me) &&
    (!t.time || t.date < date || minutesOf(t.time) <= now) &&
    Number.isFinite(t.minutes) && t.minutes > 0 && t.minutes <= usableMinutes)
    .sort((a, b) => Number(b.essential) - Number(a.essential) || a.date.localeCompare(b.date) ||
      memoryPriority(data, b, date) - memoryPriority(data, a, date) ||
      (lowEnergy ? a.minutes - b.minutes : 0) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const nextBlock = blocks.find((b) => minutesOf(b.start) >= prepEnd && b.kind !== "off");
  return {
    key: `${date}:${prep.start}:${end}`,
    label: prep.note ?? prep.title,
    endsAt: end,
    usableMinutes,
    next: interruption ? { title: interruption.title, time: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}` }
      : nextBlock ? { title: nextBlock.title, time: nextBlock.start } : null,
    candidates,
    lowEnergy,
  };
}
