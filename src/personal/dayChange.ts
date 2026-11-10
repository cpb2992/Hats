import { planDay } from "./engine";
import { validDate, type PersonalData } from "./model";
import { eventsOn } from "./repeat";
import { schoolBlocks } from "./school";

export type DayChange = "regular" | "off" | "late" | "essentials" | "kids" | "partner";
export const DAY_CHANGES: { id: DayChange; title: string; detail: string }[] = [
  { id: "off", title: "Day off work", detail: "Remove work blocks for this date and open daytime. Appointments stay." },
  { id: "late", title: "Running late", detail: "Start flexible tasks after the time you choose. Fixed commitments stay." },
  { id: "essentials", title: "Only the essentials", detail: "Keep essential care and fixed commitments; optional tasks wait." },
  { id: "kids", title: "Kids home", detail: "Pause optional tasks to leave room for care. Work and appointments stay until you change them." },
  { id: "partner", title: "Partner unavailable", detail: "Remove the partner-home reminder for this date. Care and appointments stay." },
  { id: "regular", title: "Regular day", detail: "Clear this date’s adjustments and lighter-day setting. Keep all saved commitments." },
];
/** Changes availability, never deletes or silently moves a fixed commitment. */
export function applyDayChange(data: PersonalData, date: string, change: DayChange, after?: string) {
  if (!validDate(date) || !DAY_CHANGES.some(x => x.id === change)) throw new Error("Choose a valid day and change.");
  if (change === "late" && (!after || !/^([01]\d|2[0-3]):[0-5]\d$/.test(after))) throw new Error("Choose when you will be available.");
  data.dayAdjustments ??= {};
  if (change === "regular") {
    delete data.dayAdjustments[date];
    data.workDaysOff = data.workDaysOff?.filter(d => d !== date);
    data.lowEnergyDays = data.lowEnergyDays.filter(d => d !== date);
    return;
  }
  if (change === "off") data.workDaysOff = [...new Set([...(data.workDaysOff ?? []), date])];
  else {
    const adjustment = { ...data.dayAdjustments[date] };
    if (change === "late") adjustment.availableAfter = after;
    if (change === "essentials") adjustment.essentialsOnly = true;
    if (change === "kids") adjustment.kidsHome = true;
    if (change === "partner") adjustment.partnerAway = true;
    data.dayAdjustments[date] = adjustment;
  }
}
export function previewDayChange(data: PersonalData, date: string, change: DayChange, after?: string, now = 0) {
  const copy = JSON.parse(JSON.stringify(data)) as PersonalData;
  applyDayChange(copy, date, change, after);
  const before = planDay(data, date, now), next = planDay(copy, date, now);
  const changes = next.flatMap(p => {
    const previous = before.find(b => b.task.id === p.task.id);
    return p.task.fixed || previous?.time === p.time ? [] : [{ id: p.task.id, title: p.task.title, before: previous?.time ?? null, after: p.time }];
  });
  const kept = eventsOn(data, date).length + data.dates.filter(d => d.date === date).length + data.tasks.filter(t => t.fixed && t.date === date).length;
  const schoolRemoved = schoolBlocks(data, date).length - schoolBlocks(copy, date).length;
  return { changes, kept, schoolRemoved, data: copy };
}
