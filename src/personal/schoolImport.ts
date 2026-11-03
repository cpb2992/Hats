import type { PersonalData, SchoolBlock } from "./model";

export interface SchoolScheduleFile {
  format: "hats-school-schedule";
  version: 1;
  week: Record<string, SchoolBlock[]>;
}
/** Targeted import: never interpret a full backup as a schedule or replace unrelated data. */
export function parseSchoolSchedule(text: string): SchoolScheduleFile {
  const file = JSON.parse(text) as SchoolScheduleFile;
  if (!file || file.format !== "hats-school-schedule" || file.version !== 1 ||
      !file.week || typeof file.week !== "object" || Array.isArray(file.week))
    throw new Error("Choose a Hats class schedule file.");
  const week: Record<string, SchoolBlock[]> = {};
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  for (const [day, blocks] of Object.entries(file.week)) {
    if (!/^[0-6]$/.test(day) || !Array.isArray(blocks) || blocks.length > 30)
      throw new Error("The schedule has an invalid day.");
    week[day] = blocks.map((b) => {
      if (!b || !clock.test(b.start) || !clock.test(b.end) || b.start >= b.end ||
          typeof b.title !== "string" || !b.title.trim() || b.title.length > 120 ||
          !["class", "boost", "homeroom", "advisory", "off", "break", "meeting"].includes(b.kind) ||
          (b.section !== undefined && (typeof b.section !== "string" || !b.section.trim() || b.section.length > 30)) ||
          (b.note !== undefined && (typeof b.note !== "string" || b.note.length > 200)) ||
          (b.period !== undefined && (!Number.isInteger(b.period) || b.period < 1 || b.period > 20)))
        throw new Error("Each period needs a name and valid start and end times.");
      return { start: b.start, end: b.end, title: b.title.trim(), kind: b.kind,
        ...(b.period !== undefined ? { period: b.period } : {}),
        ...(b.section ? { section: b.section.trim() } : {}), ...(b.note ? { note: b.note } : {}) };
    }).sort((a, b) => a.start.localeCompare(b.start));
    if (week[day].some((b, i, all) => i > 0 && b.start < all[i - 1].end))
      throw new Error("Two periods overlap. Check their start and end times.");
  }
  if (!Object.values(week).some((b) => b.length)) throw new Error("The schedule is empty.");
  return { format: "hats-school-schedule", version: 1, week };
}
export function applySchoolSchedule(data: PersonalData, file: SchoolScheduleFile) {
  // Validate even programmatic callers, then copy so external edits can't mutate the plan.
  const checked = parseSchoolSchedule(JSON.stringify(file));
  data.preferences.school = { on: true, week: checked.week };
  data.preferences.unavailableDays = Object.keys(checked.week).filter((day) => checked.week[day].length > 0).map(Number).sort();
}
