/**
 * What the morning and evening reminders say, and the afternoon "what's for dinner?" nudge.
 * Pure, so it can be tested. Lock screens hide the text (private visibility).
 */
import { fmtTime } from "../engine/dates";
import { dinnerFor } from "./meals";
import type { PersonalData } from "./model";
import { recipeById } from "./recipes";
import { daySummary, schoolBlocks } from "./school";
import { dayTimeline } from "./timeline";

/** The day in one line: "School 8:15 · 4:30 Ami has violin · 7:00 Date night · Dinner: Taco night". */
export function dayLine(data: PersonalData, date: string) {
  const { items, allDay } = dayTimeline(data, date, 0, date);
  const school = schoolBlocks(data, date);
  const plans = items.filter(
    (i) => i.kind === "event" || i.kind === "date" || (i.kind === "task" && i.fixed) || i.key === "slowcook",
  );
  const bits: string[] = [];
  for (const a of allDay) bits.push(a.title);
  if (school.length)
    bits.push(
      `${school[0].title === "Work" ? "Work" : "School"} ${fmtTime(school[0].start, true)}${daySummary(school) ? ` (${daySummary(school)})` : ""}`,
    );
  for (const p of plans.slice(0, 4)) bits.push(`${fmtTime(p.time, true)} ${p.title}`);
  if (plans.length > 4) bits.push(`+${plans.length - 4} more`);
  const d = dinnerFor(data, date);
  bits.push(d.planned && d.meal ? `Dinner: ${d.meal.name}` : "Dinner: not planned yet");
  return { count: allDay.length + plans.length + (school.length ? 1 : 0), line: bits.join(" · ") };
}

export function morningDigest(data: PersonalData, date: string) {
  const { count, line } = dayLine(data, date);
  return {
    title: count ? `Today: ${count} ${count === 1 ? "thing" : "things"} on your hats` : "Today’s wide open",
    body: line,
  };
}

export function eveningDigest(data: PersonalData, tomorrow: string) {
  const { count, line } = dayLine(data, tomorrow);
  return {
    title: count ? `Tomorrow: ${count} ${count === 1 ? "thing" : "things"}` : "Tomorrow’s wide open",
    body: line,
  };
}

/** Only when dinner isn't planned: an idea that fits, one tap from planning it. */
export function dinnerNudge(data: PersonalData, date: string) {
  const d = dinnerFor(data, date);
  if (d.planned || !d.meal) return null;
  const r = recipeById(d.meal.id);
  return {
    title: "What’s for dinner?",
    body: `Idea: ${d.meal.name} · ${r ? `${r.minutes} min` : `${d.meal.minutes} min`}. Tap to plan it or flip through more.`,
    url: "/meals",
  };
}
