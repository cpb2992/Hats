import { addDays, daysBetween, minutesOf } from "../engine/dates";
import { makeTask } from "./engine";
import { customHatId, HAT_IDS, id, isBuiltInHat, validDate, type PersonalData, type PersonalHat, type PersonalEvent } from "./model";
import { packageById } from "./packageCatalog";
import { eventsOn } from "./repeat";

export function packageFor(data: PersonalData, hat: PersonalHat) {
  const assigned = data.hatPackages?.[hat];
  if (assigned !== undefined) return packageById(assigned);
  // Existing teachers keep their school tools without an onboarding migration.
  if (hat === "work" && (!data.preferences.hatNames?.work || data.preferences.hatNames.work === "Teacher")) return packageById("teacher");
}
export function packageHat(data: PersonalData, packageId: string) {
  return [...HAT_IDS, ...(data.customHats ?? []).map((h) => h.id)].find((h) => packageFor(data, h)?.id === packageId);
}
export function attachPackage(data: PersonalData, packageId: string, target?: PersonalHat): PersonalHat {
  const pack = packageById(packageId);
  if (!pack) throw new Error("Choose an available package.");
  let hat = target ?? packageHat(data, pack.id);
  if (hat && !isBuiltInHat(hat) && !data.customHats?.some((h) => h.id === hat)) throw new Error("This hat is no longer available.");
  if (!hat) {
    // Reuse a hat with the same name rather than creating a duplicate.
    hat = HAT_IDS.find((h) => (data.preferences.hatNames?.[h] ?? (h === "work" ? "Teacher" : h)).toLowerCase() === pack.name.toLowerCase())
      ?? data.customHats?.find((h) => h.name.toLowerCase() === pack.name.toLowerCase())?.id;
  }
  if (!hat) {
    hat = customHatId(pack.name, data.customHats ?? []);
    (data.customHats ??= []).push({ id: hat, name: pack.name, art: pack.art, createdAt: new Date().toISOString() });
  }
  if (isBuiltInHat(hat)) data.preferences.hiddenHats = data.preferences.hiddenHats?.filter((h) => h !== hat);
  (data.hatPackages ??= {})[hat] = pack.id;
  return hat;
}
export function detachPackage(data: PersonalData, hat: PersonalHat) {
  (data.hatPackages ??= {})[hat] = "none";
}
const exists = (data: PersonalData, hat: PersonalHat) => isBuiltInHat(hat) || data.customHats?.some((h) => h.id === hat);
export function addPackageChecklist(data: PersonalData, hat: PersonalHat, input: { title: string; steps: string; minutes: string; date: string; template: number }) {
  const pack = packageFor(data, hat);
  if (!pack || !exists(data, hat)) throw new Error("Add a package to this hat first.");
  const title = input.title.trim();
  const steps = input.steps.split("\n").map((s) => s.trim()).filter(Boolean);
  const minutes = Number(input.minutes);
  if (!title || title.length > 120) throw new Error("Use a checklist title of 1–120 characters.");
  if (!steps.length || steps.length > 30 || steps.some((s) => s.length > 200)) throw new Error("Add 1–30 steps, up to 200 characters each.");
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error("Use a time estimate from 1 to 240 minutes.");
  if (!validDate(input.date)) throw new Error("Use a valid date in YYYY-MM-DD format.");
  const source = `package:${hat}:${pack.id}:${input.template}`;
  const existing = data.tasks.find((t) => t.source === source && t.date === input.date && !t.doneAt);
  if (existing) throw new Error("This checklist is already open on that date. Edit it under this hat’s commitments, or choose another date.");
  const task = makeTask(title, hat, input.date, { minutes, source, steps: steps.map((title) => ({ title, done: false })) });
  task.shared = false;
  data.tasks.push(task);
  return task.id;
}

/** Split overnight blocks at midnight so all existing daily planners reserve the time. */
export function makePackageBlock(hat: PersonalHat, input: { title: string; date: string; endDate: string; start: string; end: string; location: string }, group = id()): PersonalEvent[] {
  const clock = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  if (!validDate(input.date) || !validDate(input.endDate)) throw new Error("Use valid start and end dates in YYYY-MM-DD format.");
  if (!clock(input.start) || !clock(input.end)) throw new Error("Use a start and end time like 08:00 or 19:30.");
  const duration = daysBetween(input.date, input.endDate) * 1440 + minutesOf(input.end) - minutesOf(input.start);
  if (duration <= 0 || duration > 2880) throw new Error("The end must be after the start, within 48 hours. For a night shift, choose tomorrow as the end date.");
  if (!input.title.trim() || input.title.trim().length > 120 || input.location.trim().length > 160) throw new Error("Use a short title and location.");
  const blocks: PersonalEvent[] = [];
  for (let date = input.date; date <= input.endDate; date = addDays(date, 1)) {
    const start = date === input.date ? input.start : "00:00";
    const end = date === input.endDate ? input.end : "24:00";
    if (start === end) continue;
    blocks.push({ id: `pkg-${group}-${blocks.length}`, packageGroup: group, title: input.title.trim(), date, start, end, location: input.location.trim(), allDay: false, source: "hats", hat, shared: false });
  }
  return blocks;
}
export function addPackageBlock(data: PersonalData, hat: PersonalHat, input: Parameters<typeof makePackageBlock>[1]) {
  if (!packageFor(data, hat) || !exists(data, hat)) throw new Error("Add a package to this hat first.");
  const blocks = makePackageBlock(hat, input);
  for (const block of blocks) {
    const conflict = eventsOn(data, block.date).find((e) => !e.allDay && minutesOf(e.start) < minutesOf(block.end) && minutesOf(e.end) > minutesOf(block.start));
    if (conflict) throw new Error(`This overlaps “${conflict.title}” on ${block.date}. Adjust the block or the existing event.`);
  }
  data.events.push(...blocks);
  return blocks[0].id;
}
export function removePackageBlock(data: PersonalData, event: PersonalEvent) {
  data.events = data.events.filter((e) => event.packageGroup ? e.packageGroup !== event.packageGroup : e.id !== event.id);
}
