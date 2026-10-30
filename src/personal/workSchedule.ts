import { parseClock } from "./clock";
import type { SchoolBlock } from "./model";

export const WORK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export type WorkWeek = Record<string, SchoolBlock[]>;
export interface WorkShift {
  days: number[];
  title: string;
  start: string;
  end: string;
}
export const newWorkShift = (): WorkShift => ({ days: [1, 2, 3, 4, 5], title: "Work", start: "9:00 AM", end: "5:00 PM" });

/** Split overnight shifts at midnight so every consumer sees same-day blocks. */
export function workWeek(shifts: WorkShift[]): WorkWeek {
  const week: WorkWeek = {};
  const add = (day: number, start: string, end: string, title: string) => {
    if (start === end) return;
    (week[String(day)] ??= []).push({ start, end, title, kind: "homeroom" });
  };
  for (const [i, shift] of shifts.entries()) {
    const title = shift.title.trim();
    const start = parseClock(shift.start);
    const end = shift.end.trim() === "24:00" ? "24:00" : parseClock(shift.end);
    if (!title || title.length > 60) throw new Error(`Shift ${i + 1}: give it a name of up to 60 characters.`);
    if (!start || !end || start === end) throw new Error(`Shift ${i + 1}: enter different start and end times, like 9 AM and 5 PM.`);
    if (!shift.days.length || shift.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6))
      throw new Error(`Shift ${i + 1}: choose at least one day.`);
    for (const day of new Set(shift.days)) {
      if (start < end) add(day, start, end, title);
      else {
        add(day, start, "24:00", title);
        add((day + 1) % 7, "00:00", end, title);
      }
    }
  }
  for (const [day, blocks] of Object.entries(week)) {
    blocks.sort((a, b) => a.start.localeCompare(b.start));
    if (blocks.some((b, i) => i > 0 && b.start < blocks[i - 1].end))
      throw new Error(`${WORK_DAYS[Number(day)]}: two shifts overlap. Adjust their hours.`);
  }
  return week;
}

/** Group identical hours across days; retain every block, including weekend shifts. */
export function shiftsFromWeek(week: WorkWeek): WorkShift[] {
  const groups = new Map<string, WorkShift>();
  for (const [day, blocks] of Object.entries(week)) {
    for (const b of blocks) {
      const key = JSON.stringify([b.start, b.end, b.title]);
      const shift = groups.get(key) ?? { days: [], start: b.start, end: b.end, title: b.title };
      shift.days.push(Number(day));
      groups.set(key, shift);
    }
  }
  return [...groups.values()];
}

export const isWorkWeek = (week: WorkWeek | undefined) =>
  !!week && Object.values(week).every((blocks) => blocks.every((b) => b.kind === "homeroom" && !b.period));
