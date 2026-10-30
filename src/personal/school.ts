/**
 * The school day for the Teacher hat: the bell schedule, period by period.
 * Pure (no React Native imports) so it can be tested.
 */
import { weekday } from "../engine/dates";
import type { PersonalData, SchoolBlock } from "./model";
import { isWorkWeek } from "./workSchedule";
import { isWorkday } from "./routine";

const block = (
  start: string,
  end: string,
  title: string,
  kind: SchoolBlock["kind"],
  period?: number,
  section?: string,
  note?: string,
): SchoolBlock => ({
  start,
  end,
  title,
  kind,
  ...(period ? { period } : {}),
  ...(section ? { section } : {}),
  ...(note ? { note } : {}),
});

/** Students are at Specials (period 1) or RBR (period 4): Chris is off. */
const off = (start: string, end: string, period: number, note: string) =>
  block(start, end, "Off period", "off", period, undefined, note);

const cls = (start: string, end: string, period: number, section: string) =>
  block(start, end, `${section} Science`, "class", period, section);

/**
 * The standard week. Period 1 (Specials) is an off period. Period 5 is recess
 * or advisory, then lunch. `p4` is a Boost block for one section, or RBR (off).
 */
export function day(
  p2: string,
  p3: string,
  p4: string | null,
  p5: "Recess" | "Advisory",
  p6: string,
  p7: string,
): SchoolBlock[] {
  return [
    block("08:15", "08:35", "Homeroom", "homeroom"),
    off("08:35", "09:28", 1, "Specials"),
    cls("09:31", "10:24", 2, p2),
    cls("10:27", "11:20", 3, p3),
    p4
      ? block("11:23", "12:16", `${p4} Boost`, "boost", 4, p4)
      : off("11:23", "12:16", 4, "RBR"),
    block("12:19", "12:45", p5, p5 === "Advisory" ? "advisory" : "break", 5),
    block("12:45", "13:12", "Lunch", "break", 5),
    cls("13:15", "14:08", 6, p6),
    cls("14:11", "15:05", 7, p7),
    block("15:05", "15:10", "Dismissal", "break"),
  ];
}

/** Blocks by weekday: "1" is Monday ... "5" is Friday. */
export const STANDARD_WEEK: Record<string, SchoolBlock[]> = {
  "1": day("7A", "7C", null, "Recess", "7B", "7D"),
  "2": day("7B", "7D", "7B", "Advisory", "7A", "7C"),
  "3": day("7A", "7C", "7A", "Recess", "7B", "7D"),
  "4": day("7B", "7D", null, "Advisory", "7A", "7C"),
  "5": day("7A", "7C", "7C", "Recess", "7B", "7D"),
};

export const schoolOn = (data: PersonalData) =>
  data.preferences.school?.on !== false;

/** The school blocks for a date, in time order. None on days off, closures, or with the school day turned off. */
export function schoolBlocks(data: PersonalData, date: string): SchoolBlock[] {
  if (!schoolOn(data) || !isWorkday(data, date)) return [];
  const week = data.preferences.school?.week ?? STANDARD_WEEK;
  return [...(week[String(weekday(date))] ?? [])].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
}

/** Off periods while students are elsewhere: when a calendar meeting (like CPT) usually lands. */
export const isFree = (b: SchoolBlock) => b.kind === "off";

/** "Period 2", "Period 1 · Specials", or "" for blocks without a number. */
export const periodLabel = (b: SchoolBlock) =>
  [b.period ? `Period ${b.period}` : "", b.note ?? ""].filter(Boolean).join(" · ");

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** A school day's blocks in a few words: "7A, 7C, RBR, 7B, 7D". */
export function daySummary(blocks: SchoolBlock[]) {
  return blocks
    .filter((b) => b.kind === "class" || b.kind === "boost" || (b.kind === "off" && b.period !== 1))
    .map((b) => (b.kind === "class" ? b.section : (b.note ?? b.title)))
    .join(", ");
}

/** The editable parts of a standard day: the sections in periods 2, 3, 6 and 7,
 *  period 4 ("RBR" or "7B Boost") and period 5 ("Recess" or "Advisory"). */
export function dayFields(blocks: SchoolBlock[]) {
  const at = (start: string) => blocks.find((b) => b.start === start);
  const sec = (start: string) => at(start)?.section ?? "";
  const p4 = at("11:23");
  return {
    p2: sec("09:31"),
    p3: sec("10:27"),
    p4: p4?.kind === "boost" ? `${p4.section} Boost` : "RBR",
    p5: at("12:19")?.title === "Advisory" ? "Advisory" : "Recess",
    p6: sec("13:15"),
    p7: sec("14:11"),
  };
}

/** Builds a standard day from those fields. Throws a message to show if one doesn't fit. */
export function dayFrom(f: Record<"p2" | "p3" | "p4" | "p5" | "p6" | "p7", string>) {
  const section = (v: string, label: string) => {
    const x = v.trim().toUpperCase();
    if (!/^[0-9A-Z]{1,4}$/.test(x)) throw new Error(`${label}: use a class like 7A.`);
    return x;
  };
  const boost = f.p4.trim().match(/^([0-9A-Za-z]{1,4})\s+boost$/i);
  if (!boost && !/^rbr$/i.test(f.p4.trim())) throw new Error("Period 4: use RBR or a Boost like 7B Boost.");
  const p5 = /^adv/i.test(f.p5.trim()) ? "Advisory" : /^rec/i.test(f.p5.trim()) ? "Recess" : null;
  if (!p5) throw new Error("Period 5: use Recess or Advisory.");
  return day(
    section(f.p2, "Period 2"),
    section(f.p3, "Period 3"),
    boost ? boost[1].toUpperCase() : null,
    p5,
    section(f.p6, "Period 6"),
    section(f.p7, "Period 7"),
  );
}

/** A plain work day, the same hours on each chosen weekday ("Work 9–5", "School 8–3"). */
export function simpleWeek(days: number[], start: string, end: string, title: string) {
  const week: Record<string, SchoolBlock[]> = {};
  for (const d of days) week[String(d)] = [block(start, end, title, "homeroom")];
  return week;
}
/** Whether a schedule is plain hours (one block a day) rather than class periods. */
export const isSimpleWeek = isWorkWeek;
