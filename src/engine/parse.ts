/**
 * Turns what you type or say into tasks: picks the hat, date, time, length and student,
 * and splits a run-on thought ("send the list, the vet is Friday, and ask about coverage")
 * into separate tasks.
 */
import { addDays, nextMonday, timeOf, weekday } from './dates';
import { hatFromKeywords } from './hats';
import type { HatId } from './types';
import { capitalize } from './util';

export interface Parsed {
  title: string;
  hat: HatId | null;
  date: string | null;
  time: string | null;
  minutes: number | null;
  student: string | null;
  /** The phrases that set each field, for showing chips. */
  heard: { date?: string; time?: string; minutes?: string; student?: string };
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const kwRegex = (kw: string) => new RegExp(`(^|[^a-z0-9])${esc(kw)}(?=$|[^a-z0-9])`, 'i');

const KW = new Map<string, RegExp>();
const kw = (k: string) => { let r = KW.get(k); if (!r) { r = kwRegex(k); KW.set(k, r); } return r; };

/** Guesses the hat from keywords, among the hats this person wears. */
export function guessHat(text: string): HatId | null {
  return hatFromKeywords(text, k => kw(k).test(text));
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6 };
const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

function nextWeekday(today: string, wd: number, allowToday: boolean): string {
  for (let i = allowToday ? 0 : 1; i <= 7; i++) {
    const d = addDays(today, i);
    if (weekday(d) === wd) return d;
  }
  return today;
}

function monthDay(today: string, month: number, day: number): string | null {
  if (day < 1 || day > 31) return null;
  const year = Number(today.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, '0');
  let iso = `${year}-${pad(month + 1)}-${pad(day)}`;
  // A date more than two months back means next year ("Jan 5" said in October).
  if (iso < addDays(today, -60)) iso = `${year + 1}-${pad(month + 1)}-${pad(day)}`;
  return iso;
}

interface Hit { start: number; end: number; text: string }

function findDate(text: string, today: string): { date: string; hit: Hit } | null {
  const tries: [RegExp, (m: RegExpExecArray) => string | null][] = [
    [/\b(?:(?:due|by|on)\s+)?(today|tonight|this (?:morning|afternoon|evening))\b/i, () => today],
    [/\b(?:(?:due|by|on)\s+)?tomorrow\b/i, () => addDays(today, 1)],
    [/\b(?:due\s+|by\s+)?next week\b/i, () => nextMonday(today)],
    [/\bin (\d{1,2}) days?\b/i, m => addDays(today, Number(m[1]))],
    [/\b(?:(?:due|by|on)\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
      m => monthDay(today, MONTHS[m[1].toLowerCase()], Number(m[2]))],
    [/\b(?:due|by|on)\s+(\d{1,2})\/(\d{1,2})\b/i, m => (Number(m[1]) <= 12 ? monthDay(today, Number(m[1]) - 1, Number(m[2])) : null)],
    [/\b(?:(due|by|on|this|next)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      m => nextWeekday(today, DAYS.indexOf(m[2].toLowerCase()), m[1]?.toLowerCase() !== 'next')],
    [/\b(?:due|by|on)\s+(sun|mon|tues?|wed|thu(?:rs?)?|fri|sat)\b\.?/i, m => nextWeekday(today, SHORT_DAYS[m[1].toLowerCase()], true)],
  ];
  for (const [re, fn] of tries) {
    const m = re.exec(text);
    if (!m) continue;
    const date = fn(m);
    if (date) return { date, hit: { start: m.index, end: m.index + m[0].length, text: m[0] } };
  }
  return null;
}

/** Hours without am/pm follow the school day: 1–6 is afternoon, 7–11 is morning. */
function to24(h: number, ap: string | undefined): number {
  const a = ap?.toLowerCase().replace(/\./g, '');
  if (a === 'pm' && h < 12) return h + 12;
  if (a === 'am') return h === 12 ? 0 : h;
  if (!a && h >= 1 && h <= 6) return h + 12;
  return h;
}

function findTime(text: string): { time: string; hit: Hit } | null {
  const tries: [RegExp, (m: RegExpExecArray) => number | null][] = [
    [/\b(?:at\s+|@\s*)?(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?(?=$|[^a-z0-9])/i, m => (Number(m[1]) <= 23 && Number(m[2]) < 60 ? to24(Number(m[1]), m[3]) * 60 + Number(m[2]) : null)],
    [/\b(?:at\s+|@\s*)?(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)(?=$|[^a-z0-9])/i, m => (Number(m[1]) <= 12 ? to24(Number(m[1]), m[2]) * 60 : null)],
    [/\b(?:at\s+)noon\b/i, () => 12 * 60],
    [/\bat\s+(\d{1,2})\b(?!\s*(?:min|minutes?|hours?|of|students?|kids?|%))/i, m => (Number(m[1]) >= 1 && Number(m[1]) <= 12 ? to24(Number(m[1]), undefined) * 60 : null)],
  ];
  for (const [re, fn] of tries) {
    const m = re.exec(text);
    if (!m) continue;
    const mins = fn(m);
    if (mins != null) return { time: timeOf(mins), hit: { start: m.index, end: m.index + m[0].length, text: m[0] } };
  }
  return null;
}

function findMinutes(text: string): { minutes: number; hit: Hit } | null {
  const tries: [RegExp, (m: RegExpExecArray) => number][] = [
    [/\b(?:for\s+)?(?:about\s+)?(\d{1,3})\s*(?:min|mins|minutes?|m)\b/i, m => Number(m[1])],
    [/\b(?:for\s+)?(?:about\s+)?(\d)\s*(?:hours?|hrs?|h)\b/i, m => Number(m[1]) * 60],
    [/\b(?:for\s+)?(?:about\s+)?half an hour\b/i, () => 30],
    [/\b(?:for\s+)?(?:about\s+)?an hour\b/i, () => 60],
  ];
  for (const [re, fn] of tries) {
    const m = re.exec(text);
    if (m) return { minutes: Math.max(1, Math.min(240, fn(m))), hit: { start: m.index, end: m.index + m[0].length, text: m[0] } };
  }
  return null;
}

const initialsKey = (s: string) => s.replace(/[^a-z]/gi, '').toUpperCase();

function findStudent(text: string, known: string[]): { student: string; hit: Hit } | null {
  for (const k of known) {
    const letters = initialsKey(k).split('');
    if (letters.length < 2) continue;
    const re = new RegExp(`(^|[^a-z])(${letters.map(esc).join('\\.?\\s?')}\\.?)(?=$|[^a-z])`, 'i');
    const m = re.exec(text);
    if (m) {
      const start = m.index + m[1].length;
      return { student: k, hit: { start, end: start + m[2].length, text: m[2] } };
    }
  }
  const m = /(^|[^A-Za-z])([A-Z])\.\s?([A-Z])\.(?:\s?([A-Z])\.)?/.exec(text);
  if (m) {
    const start = m.index + m[1].length;
    const student = `${m[2]}.${m[3]}.${m[4] ? `${m[4]}.` : ''}`;
    return { student, hit: { start, end: start + m[0].length - m[1].length, text: m[0].slice(m[1].length) } };
  }
  return null;
}

function cut(text: string, hits: Hit[]): string {
  let out = text;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) out = out.slice(0, h.start) + ' ' + out.slice(h.end);
  return out
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/[\s,;:.\-–—]+$/g, '')
    .replace(/\s+(?:at|on|by|due|for|and|is|are)$/i, '')
    .replace(/^[\s,;:.\-–—]+/g, '')
    .trim();
}

export function parseCapture(raw: string, today: string, known: string[] = []): Parsed {
  const text = raw.trim();
  const heard: Parsed['heard'] = {};
  const hits: Hit[] = [];

  const d = findDate(text, today);
  if (d) { hits.push(d.hit); heard.date = d.hit.text.trim(); }
  const t = findTime(text);
  if (t && !hits.some(h => t.hit.start < h.end && t.hit.end > h.start)) { hits.push(t.hit); heard.time = t.hit.text.trim(); }
  const mm = findMinutes(text);
  if (mm && !hits.some(h => mm.hit.start < h.end && mm.hit.end > h.start)) { hits.push(mm.hit); heard.minutes = mm.hit.text.trim(); }
  const s = findStudent(text, known);
  if (s) heard.student = s.student;

  let title = cut(text, hits);
  if (/(^|[^A-Za-z])[A-Z]\.[A-Z]$/.test(title)) title += '.';
  if (s && known.length) {
    // Write recognised initials the same way every time ("AR" -> "A.R.").
    const st = findStudent(title, known);
    if (st) title = title.slice(0, st.hit.start) + st.student + title.slice(st.hit.end);
  }
  if (!title) title = text;

  let hat = guessHat(text);
  if (!hat && s) hat = 'sped';

  return {
    title: capitalize(title),
    hat,
    date: d?.date ?? null,
    time: t && heard.time ? t.time : null,
    minutes: mm && heard.minutes ? mm.minutes : null,
    student: s?.student ?? null,
    heard,
  };
}

const ACTION = 'ask|send|email|call|text|print|sign|order|book|schedule|remind|finish|make|buy|pick|check|grade|write|reply|answer|update|plan|prep|copy|review|submit|turn|get|set|draft|meet|follow|bring|return|fill|post|share|find|start|clean|pay|move|tell';
const AND_ACTION = new RegExp(`\\s+and\\s+(?:also\\s+|then\\s+)?(?=(?:${ACTION})\\b)`, 'i');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Splits one dictated thought into separate items. */
export function splitCapture(raw: string): string[] {
  const marked = raw
    .replace(/\r/g, '')
    .replace(/([A-Za-z0-9]{2})([.!?])\s+/g, '$1$2\u0001')
    .replace(/[;\n]+/g, '\u0001');
  const out: string[] = [];
  for (const sentence of marked.split('\u0001')) {
    const s = sentence.trim().replace(/[.!?]+$/, '').trim();
    if (!s) continue;
    const commaParts = s.split(/,\s*(?:and\s+)?(?:then\s+)?/i).map(p => p.trim()).filter(Boolean);
    const pieces = commaParts.length > 1 && commaParts.every(p => words(p) >= 3) ? commaParts : [s];
    for (const p of pieces) {
      for (const q of p.split(AND_ACTION)) {
        const item = q.trim().replace(/^(?:and|then|also)\s+/i, '').trim();
        if (item) out.push(capitalize(item));
      }
    }
  }
  return out;
}

export function parseMany(raw: string, today: string, known: string[] = []): Parsed[] {
  return splitCapture(raw).map(item => parseCapture(item, today, known));
}
