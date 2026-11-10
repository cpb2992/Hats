/**
 * Things that repeat: "violin every Thursday", "trash Tuesdays", "the first Monday of every
 * month", "every other week", "weekdays", "monthly on the 15th". One rule shape for events and
 * to-dos, the words to describe it, and the parser that hears it. Pure, so it can be tested.
 */
import { addDays, daysBetween, weekStart, weekday } from "../engine/dates";
import type { PersonalData, PersonalEvent, PersonalTask, RepeatRule } from "./model";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const ymd = (iso: string) => iso.split("-").map(Number) as [number, number, number];

/** Is `date` the nth (1–4, or -1 for last) `day` of its month? */
function isNth(date: string, nth: { n: number; day: number }) {
  const [y, m, d] = ymd(date);
  if (weekday(date) !== nth.day) return false;
  if (nth.n === -1) return d + 7 > daysIn(y, m - 1);
  return Math.ceil(d / 7) === nth.n;
}

/** Whether a date has the right shape for the rule (weekday, day of month), ignoring "every other". */
function fits(rule: RepeatRule, start: string, date: string) {
  if (rule.freq === "day") return !rule.days || rule.days.includes(weekday(date));
  if (rule.freq === "week") return (rule.days ?? [weekday(start)]).includes(weekday(date));
  if (rule.freq === "month") {
    if (rule.nth) return isNth(date, rule.nth);
    const [y, m, d] = ymd(date);
    const want = rule.monthDay ?? ymd(start)[2];
    return d === Math.min(want, daysIn(y, m - 1));
  }
  // year
  const [, sm, sd] = ymd(start);
  const [y, m, d] = ymd(date);
  return m === sm && d === Math.min(sd, daysIn(y, m - 1));
}

/** Does the series that began on `start` happen on `date`? */
export function occursOn(rule: RepeatRule, start: string, date: string) {
  if (date < start) return false;
  if (rule.until && date > rule.until) return false;
  if (!fits(rule, start, date)) return false;
  const every = Math.max(1, rule.every || 1);
  if (every === 1) return true;
  if (rule.freq === "day") return daysBetween(start, date) % every === 0;
  if (rule.freq === "week")
    return Math.round(daysBetween(weekStart(start), weekStart(date)) / 7) % every === 0;
  const [sy, sm] = ymd(start);
  const [y, m] = ymd(date);
  if (rule.freq === "month") return ((y - sy) * 12 + (m - sm)) % every === 0;
  return (y - sy) % every === 0;
}

/** Spells out what a rule leaves implied by its start: "weekly" → that weekday, "monthly" → that day. */
export function settle(rule: RepeatRule, start: string): RepeatRule {
  if (rule.freq === "week" && !rule.days) return { ...rule, days: [weekday(start)] };
  if (rule.freq === "month" && !rule.nth && rule.monthDay === undefined)
    return { ...rule, monthDay: ymd(start)[2] };
  return rule;
}

/** The first date on or after `from` that has the rule's shape (where a new series starts). */
export function firstFrom(rule: RepeatRule, from: string): string {
  for (let i = 0; i < 400; i++) {
    const d = addDays(from, i);
    if (fits(rule, from, d)) return d;
  }
  return from;
}

/** The latest date in (after, upTo] the series happens, or null. */
export function lastBetween(rule: RepeatRule, start: string, after: string, upTo: string) {
  for (let d = upTo; d > after && d >= start; d = addDays(d, -1))
    if (occursOn(rule, start, d)) return d;
  return null;
}

const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
const ord = (n: number) =>
  n === -1 ? "last" : (["", "first", "second", "third", "fourth"][n] ?? `${n}th`);
const nthOf = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** "Every Thursday", "Every other Tuesday", "Weekdays", "The first Monday of every month". */
export function repeatLabel(rule: RepeatRule, start: string): string {
  const every = Math.max(1, rule.every || 1);
  const other = every === 2 ? "other " : every > 2 ? `${every} ` : "";
  let s: string;
  if (rule.freq === "day") {
    const d = [...(rule.days ?? [])].sort().join("");
    s = d === "12345" ? "Every weekday" : d === "06" ? "Weekends" : every === 1 ? "Every day" : `Every ${every} days`;
  } else if (rule.freq === "week") {
    const days = [...(rule.days ?? [weekday(start)])].sort((a, b) => a - b);
    const key = days.join("");
    if (key === "12345" && every === 1) s = "Every weekday";
    else if (key === "06" && every === 1) s = "Weekends";
    else if (every > 2) s = `Every ${every} weeks on ${list(days.map((d) => DAY_NAMES[d]))}`;
    else s = `Every ${other}${list(days.map((d) => DAY_NAMES[d]))}`;
  } else if (rule.freq === "month") {
    const which = rule.nth
      ? `the ${ord(rule.nth.n)} ${DAY_NAMES[rule.nth.day]}`
      : `the ${nthOf(rule.monthDay ?? ymd(start)[2])}`;
    s = every === 1 ? `Monthly on ${which}` : `Every ${other}month on ${which}`;
  } else {
    const [, m, d] = ymd(start);
    s = `Every year on ${MONTHS[m - 1]} ${d}`;
  }
  return rule.until ? `${s} until ${MONTHS[ymd(rule.until)[1] - 1]} ${ymd(rule.until)[2]}` : s;
}

// ── Hearing it ─────────────────────────────────────────────────────────────

const DAY_WORD =
  "(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|weds|wed|thurs|thur|thu|fri|sat)s?";
const dayIndex = (w: string) => {
  const k = w.toLowerCase().replace(/s$/, "").slice(0, 3);
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(k);
};
const daysIn_ = (s: string) =>
  [...s.matchAll(new RegExp(`\\b${DAY_WORD}\\b`, "gi"))].map((m) => dayIndex(m[1])).filter((n) => n >= 0);
const ORD: Record<string, number> = {
  first: 1, "1st": 1, second: 2, "2nd": 2, third: 3, "3rd": 3, fourth: 4, "4th": 4, last: -1,
};
const NUM: Record<string, number> = { other: 2, two: 2, three: 3, four: 4, "2": 2, "3": 3, "4": 4, second: 2 };
const DAY_LIST = `${DAY_WORD}(?:\\s*(?:,|and|&|\\+)\\s*${DAY_WORD})*`;

export interface HeardRepeat {
  rule: RepeatRule;
  /** The words that said it, e.g. "every Thursday". */
  said: string;
  /** The text with those words taken out. */
  rest: string;
}

/**
 * Finds a repeat in what was said. Returns null when nothing repeats.
 * The rule's start date comes later, from `firstFrom`, once the day it begins is known.
 */
export function hearRepeat(text: string): HeardRepeat | null {
  const tries: [RegExp, (m: RegExpMatchArray) => RepeatRule | null][] = [
    // "the first Monday of every month", "every last Friday", "first Tuesday of the month"
    [
      new RegExp(`\\b(?:on\\s+)?(?:the\\s+|every\\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|last)\\s+${DAY_WORD}(?:\\s+of\\s+(?:every|each|the)\\s+month|\\s+(?:every|each)\\s+month|\\s+monthly)\\b`, "i"),
      (m) => ({ freq: "month", every: 1, nth: { n: ORD[m[1].toLowerCase()], day: dayIndex(m[2]) } }),
    ],
    [
      new RegExp(`\\bevery\\s+(first|1st|second|2nd|third|3rd|fourth|4th|last)\\s+${DAY_WORD}\\b`, "i"),
      (m) => ({ freq: "month", every: 1, nth: { n: ORD[m[1].toLowerCase()], day: dayIndex(m[2]) } }),
    ],
    // "on the 15th of every month", "every month on the 1st", "monthly on the 15th", "every 15th"
    [
      /\b(?:on\s+)?the\s+(\d{1,2})(?:st|nd|rd|th)?\s+of\s+(?:every|each|the)\s+month\b/i,
      (m) => ({ freq: "month", every: 1, monthDay: Number(m[1]) }),
    ],
    [
      /\b(?:every|each)\s+month\s+on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b|\bmonthly\s+on\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
      (m) => ({ freq: "month", every: 1, monthDay: Number(m[1] ?? m[2]) }),
    ],
    [/\bevery\s+(\d{1,2})(?:st|nd|rd|th)\b/i, (m) => ({ freq: "month", every: 1, monthDay: Number(m[1]) })],
    // "every other month", "every 3 months"
    [
      /\bevery\s+(other|two|three|four|2|3|4|second)\s+months?\b/i,
      (m) => ({ freq: "month", every: NUM[m[1].toLowerCase()] }),
    ],
    [/\b(?:every|each|once\s+a)\s+month\b|\bmonthly\b/i, () => ({ freq: "month", every: 1 })],
    // "every year", "yearly", "annually"
    [/\b(?:every|each|once\s+a)\s+year\b|\byearly\b|\bannually\b/i, () => ({ freq: "year", every: 1 })],
    // "every weekday", "weekdays", "every school day", "Monday through Friday"
    [
      /\b(?:on\s+)?(?:every\s+)?(?:weekday|school\s+day)s?\b|\b(?:mon(?:day)?)\s*(?:-|–|to|through|thru)\s*(?:fri(?:day)?)\b/i,
      () => ({ freq: "week", every: 1, days: [1, 2, 3, 4, 5] }),
    ],
    [/\b(?:on\s+)?(?:every\s+)?weekends?\b/i, () => ({ freq: "week", every: 1, days: [0, 6] })],
    // "every other Thursday", "every 2 weeks on Tuesday", "every Monday and Wednesday"
    [
      new RegExp(`\\bevery\\s+(other|second|2nd)\\s+(${DAY_LIST})\\b`, "i"),
      (m) => ({ freq: "week", every: 2, days: daysIn_(m[2]) }),
    ],
    [
      new RegExp(`\\bevery\\s+(other|two|three|four|2|3|4)\\s+weeks?\\s+on\\s+(${DAY_LIST})\\b`, "i"),
      (m) => ({ freq: "week", every: NUM[m[1].toLowerCase()], days: daysIn_(m[2]) }),
    ],
    [
      new RegExp(`\\b(?:every|each)\\s+(${DAY_LIST})\\b`, "i"),
      (m) => ({ freq: "week", every: 1, days: daysIn_(m[1]) }),
    ],
    // "weekly on Tuesdays", "on Thursdays", "Mondays and Wednesdays" (plural means it repeats)
    [
      /\b(?:weekly\s+)?(?:on\s+)?((?:sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays)(?:\s*(?:,|and|&)\s*(?:sundays|mondays|tuesdays|wednesdays|thursdays|fridays|saturdays))*)\b/i,
      (m) => ({ freq: "week", every: 1, days: daysIn_(m[1]) }),
    ],
    // "every other week", "biweekly", "every 2 weeks", "fortnightly"
    [
      /\bevery\s+(other|two|three|four|2|3|4|second)\s+weeks?\b|\bbi-?weekly\b|\bfortnightly\b/i,
      (m) => ({ freq: "week", every: m[1] ? NUM[m[1].toLowerCase()] : 2 }),
    ],
    [/\b(?:every|each|once\s+a)\s+week\b|\bweekly\b/i, () => ({ freq: "week", every: 1 })],
    // "every 3 days", "every other day", "every day", "daily", "every night"
    [
      /\bevery\s+(other|two|three|four|2|3|4)\s+days?\b/i,
      (m) => ({ freq: "day", every: NUM[m[1].toLowerCase()] }),
    ],
    [
      /\b(?:every|each)\s+(?:day|morning|night|evening|afternoon)\b|\bdaily\b|\bnightly\b/i,
      () => ({ freq: "day", every: 1 }),
    ],
  ];
  for (const [re, make] of tries) {
    const m = text.match(re);
    if (!m) continue;
    const rule = make(m);
    if (!rule) continue;
    if (rule.days && !rule.days.length) continue;
    if (rule.nth && (rule.nth.day < 0 || !rule.nth.n)) continue;
    if (rule.monthDay !== undefined && (rule.monthDay < 1 || rule.monthDay > 31)) continue;
    const rest = (text.slice(0, m.index) + " " + text.slice((m.index ?? 0) + m[0].length))
      .replace(/\s+(?:on|at)\s*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    return { rule, said: m[0].trim(), rest };
  }
  return null;
}

// ── Where repeats show up ─────────────────────────────────────────────────

/** Does this event happen on `date` (once, or as part of its series)? */
export function eventOn(e: PersonalEvent, date: string) {
  if (e.date === date) return !(e.skip ?? []).includes(date);
  return !!e.repeat && occursOn(e.repeat, e.date, date) && !(e.skip ?? []).includes(date);
}
/** Every event happening on a date, repeats included. */
export const eventsOn = (data: PersonalData, date: string) =>
  data.events.filter((e) => eventOn(e, date));

/** A to-do's repeat as a rule (older saved to-dos used "daily"/"weekly"/"fortnightly"). */
export function taskRule(t: PersonalTask): RepeatRule | null {
  if (t.rule) return t.rule;
  if (t.repeat === "daily") return { freq: "day", every: 1 };
  if (t.repeat === "weekly") return { freq: "week", every: 1 };
  if (t.repeat === "fortnightly") return { freq: "week", every: 2 };
  return null;
}

/** Checks a saved rule so a bad backup can't crash the app. */
export function validRule(r: unknown): r is RepeatRule {
  if (!r || typeof r !== "object") return false;
  const x = r as RepeatRule;
  const int = (n: unknown, lo: number, hi: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
  return (
    ["day", "week", "month", "year"].includes(x.freq) &&
    int(x.every, 1, 12) &&
    (x.days === undefined || (Array.isArray(x.days) && x.days.length > 0 && x.days.every((d) => int(d, 0, 6)))) &&
    (x.monthDay === undefined || int(x.monthDay, 1, 31)) &&
    (x.nth === undefined || (!!x.nth && (int(x.nth.n, 1, 4) || x.nth.n === -1) && int(x.nth.day, 0, 6))) &&
    (x.until === undefined || /^\d{4}-\d{2}-\d{2}$/.test(x.until))
  );
}

