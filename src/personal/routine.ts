import { daysBetween, weekday } from "../engine/dates";
import { ROUTINE_DEFAULTS, type PersonalData } from "./model";
import { eventsOn } from "./repeat";

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function routinePrefs(data: PersonalData) {
  const p = data.preferences;
  return {
    partnerHome: p.partnerHome ?? ROUTINE_DEFAULTS.partnerHome,
    dinnerTime: p.dinnerTime ?? ROUTINE_DEFAULTS.dinnerTime,
    storyTime: p.storyTime ?? ROUTINE_DEFAULTS.storyTime,
    bedtime: p.bedtime ?? ROUTINE_DEFAULTS.bedtime,
    bathNights: p.bathNights ?? ROUTINE_DEFAULTS.bathNights,
    bathAnchor: p.bathAnchor ?? ROUTINE_DEFAULTS.bathAnchor,
  };
}

/** Bath nights alternate from an anchor date; "Not tonight" moves the anchor. */
export function isBathNight(data: PersonalData, date: string) {
  const r = routinePrefs(data);
  if (r.bathNights === "off") return false;
  if (r.bathNights === "nightly") return true;
  return Math.abs(daysBetween(r.bathAnchor, date)) % 2 === 0;
}

export function isWorkday(data: PersonalData, date: string) {
  const closure = eventsOn(data, date).some((e) => e.closure);
  return data.preferences.unavailableDays.includes(weekday(date)) && !closure;
}

/** Evening blocks the planner keeps free: dinner, bath (if tonight), stories, bedtime. */
export function routineBlocks(data: PersonalData, date: string) {
  const r = routinePrefs(data);
  const kids = data.preferences.kidsRoutine !== false;
  const blocks = [{ start: mins(r.dinnerTime), end: mins(r.dinnerTime) + 40 }];
  if (kids)
    blocks.push(
      { start: mins(r.storyTime), end: mins(r.storyTime) + 25 },
      { start: mins(r.bedtime), end: mins(r.bedtime) + 15 },
    );
  if (kids && isBathNight(data, date))
    blocks.push({ start: mins(r.storyTime) - 30, end: mins(r.storyTime) - 5 });
  return blocks;
}
