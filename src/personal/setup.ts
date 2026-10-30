/**
 * First-run setup: turns a few answers into hats, a work week, and evenings. Pure (apart from
 * the data it's given), so it can be tested.
 */
import { installRoutines } from "./engine";
import type { HatArtId } from "./hatArt";
import { HAT_IDS, id, type BuiltInHat, type PersonalData, type SchoolBlock } from "./model";
import { simpleWeek } from "./school";

export interface SetupAnswers {
  name: string;
  partner: string;
  partnerWord: string;
  kids: string[];
  parentWord: string;
  pets: string[];
  /** Built-in hats you wear. */
  hats: BuiltInHat[];
  work?: { name: string; art: HatArtId; title: string; days: number[]; start: string; end: string; week?: Record<string, SchoolBlock[]> };
  dinner: string;
  stories?: string;
  bedtime?: string;
  baths: "alternate" | "nightly" | "off";
}

export function applySetup(d: PersonalData, a: SetupAnswers, today: string) {
  const p = d.preferences;
  const kids = a.kids.length > 0;
  p.name = a.name.trim();
  p.partner = a.partner.trim();
  p.hatNames = {
    ...(p.partner ? { husband: a.partnerWord } : {}),
    ...(kids ? { dad: a.parentWord } : {}),
    ...(a.work ? { work: a.work.name } : {}),
  };
  p.hatArt = a.work ? { work: a.work.art } : {};
  p.hiddenHats = HAT_IDS.filter((h) => !a.hats.includes(h));
  p.kidsRoutine = kids;
  p.bathNights = kids ? a.baths : "off";
  p.dinnerTime = a.dinner;
  if (kids && a.stories) p.storyTime = a.stories;
  if (kids && a.bedtime) p.bedtime = a.bedtime;
  if (a.work && a.hats.includes("work")) {
    const week = a.work.week ?? simpleWeek(a.work.days, a.work.start, a.work.end, a.work.title);
    p.school = { on: Object.values(week).some((blocks) => blocks.length > 0), week };
    p.unavailableDays = Object.keys(week).filter((day) => week[day].length > 0).map(Number).sort();
  } else {
    p.school = { on: false };
    p.unavailableDays = [];
  }
  for (const n of a.kids) d.people.push({ id: id(), name: n, role: "child", interests: "", detail: "" });
  for (const n of a.pets) d.people.push({ id: id(), name: n, role: "pet", interests: "", detail: "" });
  p.onboarded = true;
  installRoutines(d, today);
}
