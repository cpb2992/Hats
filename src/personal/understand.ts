/**
 * Turns what Chris types or says into the right things on the right days:
 * "Selah's dance class Thursday at 4:30" → an event on Thursday 4:30–5:30;
 * "buy flowers Friday" → a to-do on Friday; several thoughts → several items.
 * Built on the original Hats parser (dates, times, durations, splitting).
 */
import { addDays } from "../engine/dates";
import { parseCapture, splitCapture } from "../engine/parse";
import { makeTask } from "./engine";
import {
  HAT_IDS,
  customHatFor,
  type BuiltInHat,
  id,
  type PersonalData,
  type PersonalEvent,
  type PersonalHat,
  type PersonalTask,
} from "./model";

export interface Understood {
  kind: "event" | "task";
  title: string;
  hat: PersonalHat;
  date: string;
  /** "HH:MM" or null (all-day event / flexible task) */
  time: string | null;
  minutes: number;
  /** What Hats heard, for the preview chips. */
  heard: { date?: string; time?: string; minutes?: string };
}

const EVENT_WORDS =
  /\b(event|appointment|appt|dentist|doctor|pediatrician|checkup|check-up|class|lesson|practice|game|match|recital|concert|show|party|meeting|conference|visit|playdate|play date|sleepover|reservation|flight|haircut|vet appointment|school event|open house|field trip|movie|dinner with|lunch with|brunch|birthday party|wedding|funeral|game night|date night|tickets?)\b/i;
const TASK_VERBS =
  /^(buy|get|order|pay|call|text|email|clean|wash|fold|put away|sweep|fix|book|schedule|remember to|remind me to|make|cook|prep|pick up groceries|return|send|sign|renew|cancel|plan)\b/i;
const EVENING =
  /\b(dinner|supper|date|movie|show|concert|party|game night|tonight|drinks|bedtime|recital)\b/i;
const FILLER =
  /^(?:(?:please\s+)?(?:add|put|create|schedule|save)\s+(?:an?\s+)?(?:event|appointment|to-?do|task|reminder)?\s*(?:for|called|named)?\s*|(?:i|we)\s+(?:have|'ve got|got)\s+(?:an?\s+)?|there(?:'s| is)\s+(?:an?\s+)?|remind me to\s+|remember to\s+)/i;

const HAT_WORDS: Record<BuiltInHat, RegExp> = {
  husband:
    /\b(wife|partner|date night|flowers|anniversary|makeup|gift for (?:her|my wife))\b/i,
  dad: /\b(kids?|child|daughter|son|daycare|school|pickup|pick up the kids|story|recital|dance class|playdate|field trip|pediatrician)\b/i,
  pets: /\b(dog|cat|kitten|puppy|vet|litter|groom|walker|walk the dog)\b/i,
  home: /\b(dinner|laundry|dish|grocer|sweep|clean|repair|plumber|trash|recycling)\b/i,
  friends:
    /\b(friend|call mom|call dad|catch up|birthday|family visit|visit)\b/i,
  myself:
    /\b(gym|guitar|sleep|workout|run|doctor|dentist|haircut|budget|save)\b/i,
  work: /\b(lesson|lesson plans?|grade|grading|papers|my class|students?|IEP|504|CPT|PD|staff meeting|homeroom|report cards?|progress reports?|exit tickets?|parent conference|copies|principal|caseload|BTU|evaluation)\b/i,
};

function hatFor(
  text: string,
  data: PersonalData,
  fallback: PersonalHat,
): PersonalHat {
  for (const p of data.people) {
    if (!p.name || p.name.length < 2) continue;
    const re = new RegExp(
      `\\b${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}('s)?\\b`,
      "i",
    );
    if (re.test(text))
      return p.role === "child" ? "dad" : p.role === "pet" ? "pets" : "friends";
  }
  if (
    data.preferences.partner &&
    new RegExp(`\\b${data.preferences.partner}\\b`, "i").test(text)
  )
    return "husband";
  const mine = customHatFor(text, data.customHats ?? []);
  if (mine) return mine;
  return HAT_IDS.find((h) => HAT_WORDS[h].test(text)) ?? fallback;
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

function tidy(title: string) {
  const t = title
    .replace(FILLER, "")
    .replace(/^(?:on|at|for)\s+/i, "")
    .trim();
  if (!t || /^(event|appointment|task|to-?do|reminder)$/i.test(t))
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Event";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Understand one capture (may hold several items). */
export function understand(
  raw: string,
  data: PersonalData,
  today: string,
  fallbackHat: PersonalHat,
  nowMin = 0,
): Understood[] {
  if (!raw.trim()) return [];
  const items = splitCapture(raw).map((piece) => {
    const p = parseCapture(piece, today);
    // Home life: a bare "at 7" for dinner, a date, a show, or tonight means evening.
    if (
      p.time &&
      p.heard.time &&
      !/(am|pm|a\.m\.|p\.m\.|noon)/i.test(p.heard.time) &&
      Number(p.time.slice(0, 2)) >= 7 &&
      Number(p.time.slice(0, 2)) <= 11 &&
      EVENING.test(piece)
    )
      p.time = `${String(Number(p.time.slice(0, 2)) + 12).padStart(2, "0")}${p.time.slice(2)}`;
    const eventish = EVENT_WORDS.test(piece);
    const chore = TASK_VERBS.test(piece.trim());
    const kind: Understood["kind"] =
      eventish || (p.time && !chore) ? "event" : "task";
    return {
      kind,
      title: tidy(p.title),
      hat: hatFor(piece, data, fallbackHat),
      // A time that already passed today, with no day said, means tomorrow.
      date:
        p.date ?? (p.time && mins(p.time) < nowMin ? addDays(today, 1) : today),
      time: p.time,
      minutes: p.minutes ?? (kind === "event" ? 60 : 20),
      heard: {
        date: p.heard.date,
        time: p.heard.time,
        minutes: p.heard.minutes,
      },
      piece,
    };
  });
  // Said on a Wednesday, "Wednesday" means next week ("today" means today).
  for (const u of items)
    if (
      u.date === today &&
      u.heard.date &&
      /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i.test(u.heard.date)
    )
      u.date = addDays(today, 7);
  // "Field trip Friday. Pack lunch." — a follow-up with no day of its own that
  // points back at the thing before it belongs on that day.
  for (let i = 1; i < items.length; i++) {
    const u = items[i];
    const prev = items[i - 1];
    if (u.heard.date || !prev.heard.date) continue;
    if (
      /\b(that (?:morning|day|night|evening|afternoon)|for it|before it|lunch|pack|bring|wear)\b/i.test(
        u.piece,
      )
    ) {
      u.date = prev.date;
      u.heard.date = prev.heard.date;
      u.title = tidy(
        u.title.replace(
          /\s*\b(that (?:morning|day|night|evening|afternoon))\b/i,
          "",
        ),
      );
    }
  }
  return items.map(({ piece: _piece, ...u }) => u);
}

const hhmm = (n: number) =>
  `${String(Math.min(23, Math.floor(n / 60))).padStart(2, "0")}:${String(n >= 24 * 60 ? 59 : n % 60).padStart(2, "0")}`;

/** Write understood items into the plan. Returns what was added, for the toast. */
export function addUnderstood(d: PersonalData, items: Understood[]) {
  const added: {
    kind: Understood["kind"];
    date: string;
    time: string | null;
    title: string;
  }[] = [];
  for (const u of items) {
    if (u.kind === "event") {
      const ev: PersonalEvent = {
        id: id(),
        title: u.title,
        date: u.date,
        start: u.time ?? "00:00",
        end: u.time ? hhmm(mins(u.time) + u.minutes) : "23:59",
        allDay: !u.time,
        source: "hats",
        hat: u.hat,
      };
      d.events.push(ev);
    } else {
      const t: PersonalTask = makeTask(u.title, u.hat, u.date, {
        time: u.time,
        minutes: Math.max(5, Math.min(240, u.minutes)),
        steps: /\blaundry\b/i.test(u.title)
          ? ["Wash", "Dry", "Fold", "Put away"].map((title) => ({
              title,
              done: false,
            }))
          : [],
      });
      d.tasks.push(t);
    }
    added.push({ kind: u.kind, date: u.date, time: u.time, title: u.title });
  }
  return added;
}
