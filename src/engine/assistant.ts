/**
 * Say anything: turns what Chris says into things that happen — calendar events, tasks, data points,
 * finished tasks, moved or cancelled events — using what's going on right now (the class in front of
 * him, his free blocks, his calendar, his caseload).
 *
 * Claude does the understanding when a key is set; a rule-based reader does it otherwise. Either way
 * the result is the same list of actions, checked here before anything is applied.
 */
import { addDays, dayShort, fmtTime, minutesOf, timeOf, weekday } from './dates';
import { ALL_HATS, HATS } from './hats';
import { guessHat, parseMany, type Parsed } from './parse';
import { blocksFor, currentBlock, freeBlocks, nextFree, sectionNow } from './schedule';
import type { AppData, HatId, HatsEvent, Student } from './types';
import { normalizeInitials } from './util';

/* --------------------------------------------------------------- types */

export type { HatsEvent } from './types';

export type Action =
  | { kind: 'event'; title: string; date: string; start: string | null; end: string | null; allDay: boolean; location: string; note: string; hat: HatId }
  | { kind: 'task'; title: string; hat: HatId; date: string | null; time: string | null; minutes: number; student: string | null }
  | { kind: 'log'; studentId: string; initials: string; goalId: string; goalKind: 'tally' | 'trials'; value: number; outOf: number }
  | { kind: 'done'; taskId: string; title: string }
  | { kind: 'move'; eventId: string; title: string; date: string; start: string | null; end: string | null; allDay: boolean; from: HatsEvent }
  | { kind: 'cancel'; eventId: string; title: string; from: HatsEvent };

/** What the model returns for each action. Every field is present; "" or 0 means "not given". */
export interface RawAction {
  kind: 'event' | 'task' | 'log' | 'done' | 'move' | 'cancel';
  title: string;
  hat: string;
  date: string;
  start: string;
  end: string;
  allDay: boolean;
  minutes: number;
  location: string;
  note: string;
  student: string;
  studentClass: string;
  value: number;
  ref: string;
}

export interface RawReply {
  reply: string;
  actions: RawAction[];
}

/** One line per thing Hats just did, so "move that to Friday" knows what "that" is. */
export interface Recent {
  kind: Action['kind'];
  title: string;
  ref: string;
  when: string;
}

export interface Situation {
  data: AppData;
  today: string;
  nowMin: number;
  recent: Recent[];
}

/* ------------------------------------------------------------ helpers */

const pad = (n: number) => String(n).padStart(2, '0');
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function cleanTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return `${pad(h)}:${pad(mi)}`;
}

export function cleanDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(`${raw.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime()) || d.getMonth() + 1 !== Number(m[2])) return null;
  return raw.trim();
}

const cleanHat = (raw: string | null | undefined, title: string): HatId =>
  (ALL_HATS as string[]).includes(raw ?? '') ? (raw as HatId) : guessHat(title) ?? 'teacher';

const addMin = (time: string, min: number) => timeOf(Math.min(23 * 60 + 59, minutesOf(time) + min));

/** Meetings and appointments go on the calendar; to-dos stay in Hats. */
const EVENT_WORDS = /\b(meeting|mtg|appointment|appt|conference|iep (?:meeting|mtg)|504 (?:meeting|mtg)|annual review|re-?eval(?:uation)? meeting|call with|zoom|interview|observation|pd|training|workshop|assembly|open house|field trip|practice|game|recital|rehearsal|party|dinner with|lunch with|coffee with|doctor|dentist|vet|haircut|flight|concert|ceremony|parent night|curriculum night|back to school night|sub plans? for|out of school|day off|half day|early release)\b/i;
export const looksLikeEvent = (title: string) => EVENT_WORDS.test(title);

function defaultLength(title: string): number {
  if (/\b(iep|504|annual review|re-?eval|conference|appointment|appt|doctor|dentist|interview|pd|training|workshop|observation)\b/i.test(title)) return 60;
  return 30;
}

/** The student he means: initials, then the class he's in right now, then the class named. */
export function findStudent(s: Situation, initials: string, cls = ''): Student | null {
  const ini = normalizeInitials(initials);
  if (!ini) return null;
  const same = s.data.students.filter(st => st.initials.toUpperCase() === ini.toUpperCase());
  if (same.length <= 1) return same[0] ?? null;
  const want = cls.trim().toUpperCase();
  if (want) { const hit = same.find(st => st.period.toUpperCase() === want); if (hit) return hit; }
  const here = sectionNow(s.data.settings, s.today, s.nowMin);
  if (here) { const hit = same.find(st => st.period.toUpperCase() === here.toUpperCase()); if (hit) return hit; }
  return same[0];
}

/** "tomorrow at 3:10 PM", "Thu 10/29 9:30–10:30 AM", "today". */
export function describeWhen(date: string | null, start: string | null, today: string, end?: string | null): string {
  const day = !date || date === today ? 'today' : date === addDays(today, 1) ? 'tomorrow' : `${dayShort(date)} ${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
  if (!start) return date ? day : 'anytime';
  if (end) {
    const samePart = (minutesOf(start) < 720) === (minutesOf(end) < 720);
    return `${day} ${samePart ? fmtTime(start) : fmtTime(start, true)}–${fmtTime(end, true)}`;
  }
  return `${day} at ${fmtTime(start, true)}`;
}

/* ------------------------------------------------------------- context */

function blockLine(s: Situation, date: string): string {
  return blocksFor(s.data.settings, date).map(b => `${b.start}-${b.end} ${b.label}${b.kind === 'free' ? ' (free)' : b.kind === 'meeting' ? ' (meeting)' : ''}`).join('; ');
}

function rightNow(s: Situation): string {
  const { data, today, nowMin } = s;
  const work = data.settings.workdays.includes(weekday(today));
  const blocks = blocksFor(data.settings, today);
  if (!work || !blocks.length) return 'Not a school day.';
  const blk = currentBlock(data.settings, today, nowMin);
  if (blk) return `${blk.kind === 'free' ? 'Free block' : blk.kind === 'class' || blk.kind === 'boost' ? 'Teaching' : 'In'}: ${blk.label} until ${blk.end}.`;
  if (nowMin < minutesOf(blocks[0].start)) return `Before school. First bell ${blocks[0].start}.`;
  if (nowMin >= minutesOf(blocks[blocks.length - 1].end)) return `After school (dismissal ended ${blocks[blocks.length - 1].end}).`;
  return 'Passing time.';
}

/** Everything the model needs to know about Chris's day, as plain text. */
export function buildContext(s: Situation): string {
  const { data, today, nowMin } = s;
  const lines: string[] = [];
  lines.push(`NOW: ${DAY_FULL[weekday(today)]} ${today}, ${timeOf(nowMin)}.`);
  lines.push(`RIGHT NOW: ${rightNow(s)}`);
  const free = nextFree(data.settings, today, nowMin);
  if (free) lines.push(`NEXT FREE BLOCK TODAY: ${free.label} ${free.start}-${free.end}.`);
  lines.push(`DAY SHAPE: morning ${data.settings.morning}, school ${data.settings.schoolStart}, shutdown ${data.settings.shutdown}, pickups ${data.settings.pickups}, kids' bedtime ${data.settings.bedtime}.`);

  lines.push('', 'BELL SCHEDULE (school days, next 8 days):');
  for (let i = 0; i < 8; i++) {
    const d = addDays(today, i);
    if (!data.settings.workdays.includes(weekday(d))) continue;
    const line = blockLine(s, d);
    if (line) lines.push(`- ${dayShort(d)} ${d}: ${line}`);
  }

  lines.push('', 'HATS CALENDAR (today through the next 14 days):');
  const until = addDays(today, 14);
  const evs = data.events.filter(e => e.date >= today && e.date <= until).sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? ''))).slice(0, 60);
  if (!evs.length) lines.push('- none');
  for (const e of evs) lines.push(`- ref=${e.id} | ${dayShort(e.date)} ${e.date} ${e.allDay ? 'all day' : `${e.start}-${e.end}`} | ${e.title}${e.location ? ` @ ${e.location}` : ''}`);
  const keyDates = data.students.flatMap(st => st.dates.filter(k => k.date >= today && k.date <= until).map(k => `- ${dayShort(k.date)} ${k.date} | ${k.label} · ${st.initials}`));
  if (keyDates.length) lines.push('', 'CASELOAD DATES (already on the calendar):', ...keyDates);

  lines.push('', 'OPEN TASKS:');
  const open = data.tasks.filter(t => !t.done).slice(0, 40);
  if (!open.length) lines.push('- none');
  for (const t of open) lines.push(`- ref=${t.id} | ${t.title} | ${t.hat}${t.date ? ` | ${t.date}` : ''}${t.time ? ` ${t.time}` : ''}`);

  lines.push('', 'STUDENTS (initials, class, plan, first goal):');
  if (!data.students.length) lines.push('- none');
  for (const st of data.students) {
    const g = st.goals[0];
    lines.push(`- ${st.initials} ${st.period || '-'} ${st.plan}${g ? ` | goal logged ${g.kind === 'trials' ? `as x of ${g.outOf}` : 'as +1'}` : ' | no goal'}`);
  }

  lines.push('', `HATS: ${ALL_HATS.filter(h => data.hats.find(x => x.id === h)?.on !== false).map(h => `${h}=${HATS[h].name} (${HATS[h].meaning})`).join('; ')}.`);

  if (s.recent.length) {
    lines.push('', 'JUST DONE FROM THE LAST CAPTURE ("that", "it" usually means these):');
    for (const r of s.recent) lines.push(`- ${r.kind}: ${r.title} | ${r.when}${r.ref ? ` | ref=${r.ref}` : ''}`);
  }
  return lines.join('\n');
}

export const SYSTEM_PROMPT = `You are the assistant inside Hats, the personal app of Chris, a 7th grade science and special education teacher in Boston who is also science department head, union building rep, mentor, children's book author and a dad of three. He has ADHD and talks to Hats in quick, messy bursts. Turn what he says into actions, using the context about his day.

Actions:
- event: something he attends at a time (meetings, IEP/504 meetings, appointments, calls with people, PD, field trips, kids' games, dinners). Goes on the Hats calendar. Give date, start and end (HH:MM, 24h). Without a stated length: 30 min for calls and quick meetings, 60 min for IEP/504 meetings, conferences, appointments and PD. With no time at all and a whole-day thing (field trip, day off), set allDay true.
- task: a to-do (send, email, print, grade, sign, buy, write, ask, remind me to). Give a time only when he says one or says "remind me at"; then it becomes a reminder.
- log: a data point for a student's IEP goal ("J.S. got 4 out of 5", "plus one for A.R.", "log one for D.W."). student = initials exactly as listed. value = successes for "x of n" goals, or the number of +1s for tally goals (usually 1). If two students share initials, set studentClass, preferring the class he is teaching right now.
- done: he finished an open task ("I sent the lab list"). ref = that task's ref.
- move: change the date or time of a Hats calendar event. ref = the event's ref. Keep its length unless he gives a new one.
- cancel: remove a Hats calendar event he says is cancelled or off. ref = the event's ref.

Use the situation:
- "after school" = when dismissal ends. "before school" = before the first bell. "during my prep" / "free period" / "RBR" = his next free block on that day. "after this class" / "after class" = the end of the current block. "at lunch" = the lunch block. "tomorrow morning" = before school tomorrow on a school day.
- Weekday names mean the next one coming. Dates are YYYY-MM-DD. Never schedule a school meeting over a class he teaches unless he says so; if the time he gives is during a class, still use his time.
- Pick the hat: teacher (science teaching), sped (IEPs, 504s, caseload), dept (science department), btu (union), mentor (coaching teachers), author (his books), home (family and personal).
- Titles: short and plain, like he'd write them ("IEP meeting · J.M.", "Email Sadie the lab list"). Keep student initials, never full names.
- One utterance can hold several actions. If something is unclear, make the most reasonable choice and say what you chose in the reply.
- If nothing should happen (he's just thinking out loud), return no actions and say so.

reply: one short, friendly sentence telling Chris what you did, in plain words (for example "Added the IEP meeting for J.M. to your calendar Thursday at 9:30, and a reminder to print the agenda."). No emoji.

Fill every field of every action; use "" for text you don't need, 0 for numbers you don't need, and false for allDay when it doesn't apply.`;

/** JSON schema for structured output. Every field is required so the schema stays simple. */
export const REPLY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'actions'],
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'hat', 'date', 'start', 'end', 'allDay', 'minutes', 'location', 'note', 'student', 'studentClass', 'value', 'ref'],
        properties: {
          kind: { type: 'string', enum: ['event', 'task', 'log', 'done', 'move', 'cancel'] },
          title: { type: 'string' },
          hat: { type: 'string', enum: [...ALL_HATS] },
          date: { type: 'string', description: 'YYYY-MM-DD or ""' },
          start: { type: 'string', description: 'HH:MM 24h or ""' },
          end: { type: 'string', description: 'HH:MM 24h or ""' },
          allDay: { type: 'boolean' },
          minutes: { type: 'integer', description: 'task length in minutes, 0 if not given' },
          location: { type: 'string' },
          note: { type: 'string' },
          student: { type: 'string', description: 'initials as listed, or ""' },
          studentClass: { type: 'string', description: 'class like 7A when initials are shared, or ""' },
          value: { type: 'integer' },
          ref: { type: 'string', description: 'ref of the task or event for done, move and cancel, or ""' },
        },
      },
    },
  },
} as const;

/* ------------------------------------------------------- checking output */

/** Turns the model's (or the fallback's) raw actions into checked ones. Anything that can't be done safely is dropped and noted. */
export function checkActions(raw: RawAction[], s: Situation): { actions: Action[]; notes: string[] } {
  const actions: Action[] = [];
  const notes: string[] = [];
  for (const r of raw) {
    const title = (r.title ?? '').trim().slice(0, 140);
    const kind = String(r.kind ?? '').toLowerCase();
    if (kind === 'event') {
      const date = cleanDate(r.date) ?? s.today;
      let start = cleanTime(r.start);
      let end = cleanTime(r.end);
      const allDay = !start && (r.allDay || !r.start);
      if (allDay) { start = null; end = null; }
      else if (start && (!end || minutesOf(end) <= minutesOf(start))) end = addMin(start, r.minutes > 0 ? Math.min(r.minutes, 600) : defaultLength(title));
      if (!title) continue;
      actions.push({ kind: 'event', title, date, start, end, allDay, location: (r.location ?? '').trim(), note: (r.note ?? '').trim(), hat: cleanHat(r.hat, title) });
    } else if (kind === 'task') {
      if (!title) continue;
      const st = r.student ? findStudent(s, r.student, r.studentClass) : null;
      actions.push({ kind: 'task', title, hat: cleanHat(r.hat, title), date: cleanDate(r.date), time: cleanTime(r.start), minutes: r.minutes > 0 ? Math.min(r.minutes, 240) : 10, student: st?.initials ?? null });
    } else if (kind === 'log') {
      const st = findStudent(s, r.student, r.studentClass);
      if (!st) { notes.push(`No student ${r.student || 'named'} on your caseload, so nothing was logged.`); continue; }
      const g = st.goals[0];
      if (!g) { notes.push(`${st.initials} has no goal to log yet.`); continue; }
      const value = g.kind === 'trials' ? Math.max(0, Math.min(g.outOf, Math.round(r.value))) : Math.max(1, Math.min(10, Math.round(r.value) || 1));
      actions.push({ kind: 'log', studentId: st.id, initials: st.initials, goalId: g.id, goalKind: g.kind, value, outOf: g.outOf });
    } else if (kind === 'done') {
      const t = s.data.tasks.find(x => x.id === r.ref && !x.done) ?? matchTask(s, title);
      if (!t) { if (title) notes.push(`Couldn't find an open task for "${title}".`); continue; }
      actions.push({ kind: 'done', taskId: t.id, title: t.title });
    } else if (kind === 'move' || kind === 'cancel') {
      const ev = s.data.events.find(e => e.id === r.ref) ?? matchEvent(s, title);
      if (!ev) { notes.push(`Couldn't find "${title || 'that event'}" on your calendar.`); continue; }
      if (kind === 'cancel') { actions.push({ kind: 'cancel', eventId: ev.id, title: ev.title, from: ev }); continue; }
      const date = cleanDate(r.date) ?? ev.date;
      let start = cleanTime(r.start) ?? ev.start;
      let end = cleanTime(r.end);
      const allDay = r.allDay && !cleanTime(r.start) ? true : !start;
      if (allDay) { start = null; end = null; }
      else if (start && (!end || minutesOf(end) <= minutesOf(start))) {
        const len = ev.start && ev.end ? minutesOf(ev.end) - minutesOf(ev.start) : defaultLength(ev.title);
        end = addMin(start, len > 0 ? len : 30);
      }
      actions.push({ kind: 'move', eventId: ev.id, title: ev.title, date, start, end, allDay, from: ev });
    }
  }
  return { actions, notes };
}

const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2);
function overlap(a: string, b: string): number {
  const wa = new Set(words(a));
  const wb = words(b);
  if (!wa.size || !wb.length) return 0;
  return wb.filter(w => wa.has(w)).length / Math.max(wa.size, wb.length);
}
function matchTask(s: Situation, title: string) {
  if (!title) return undefined;
  const best = s.data.tasks.filter(t => !t.done).map(t => ({ t, score: overlap(t.title, title) })).sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 0.5 ? best.t : undefined;
}
function matchEvent(s: Situation, title: string) {
  if (!title) return undefined;
  const best = s.data.events.filter(e => e.date >= s.today).map(e => ({ e, score: overlap(e.title, title) })).sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 0.5 ? best.e : undefined;
}

/* ---------------------------------------------- reading without Claude */

/** School-day phrases the rule-based reader understands. */
function situationalTime(text: string, s: Situation, date: string): string | null {
  const blocks = blocksFor(s.data.settings, date);
  if (!blocks.length) return null;
  if (/\bafter school\b/i.test(text)) return blocks[blocks.length - 1].end;
  if (/\bbefore school\b/i.test(text)) return addMin(blocks[0].start, -30);
  if (/\b(during|in|at) (my )?(prep|free (period|block)|rbr|planning)\b/i.test(text)) {
    const free = date === s.today ? nextFree(s.data.settings, date, s.nowMin) : freeBlocks(s.data.settings, date)[0];
    return free?.start ?? null;
  }
  if (/\b(at|during) lunch\b/i.test(text)) return blocks.find(b => /lunch/i.test(b.label))?.start ?? null;
  if (/\bafter (this |my )?(class|period)\b/i.test(text) && date === s.today) return currentBlock(s.data.settings, date, s.nowMin)?.end ?? null;
  return null;
}

const blankRaw = (kind: RawAction['kind']): RawAction => ({ kind, title: '', hat: '', date: '', start: '', end: '', allDay: false, minutes: 0, location: '', note: '', student: '', studentClass: '', value: 0, ref: '' });

/** The rule-based reader: events for meetings and appointments, data points, finished tasks, and tasks for the rest. */
export function readWithoutClaude(text: string, s: Situation): RawReply {
  const known = s.data.students.map(st => st.initials);
  const items: Parsed[] = parseMany(text, s.today, known);
  const actions: RawAction[] = [];
  for (const p of items) {
    const whole = p.title;
    const logMatch = /\b(?:log|tally|plus one|\+1)\b/i.test(whole) || /\b\d+\s*(?:out of|of|\/)\s*\d+\b/.test(whole);
    if (p.student && logMatch) {
      const m = /\b(\d+)\s*(?:out of|of|\/)\s*(\d+)\b/.exec(whole);
      actions.push({ ...blankRaw('log'), student: p.student, value: m ? Number(m[1]) : 1 });
      continue;
    }
    const doneMatch = /^(?:i\s+)?(?:finished|done with|completed|already)\s+(.+)$/i.exec(whole);
    if (doneMatch) {
      const t = matchTask(s, doneMatch[1]);
      if (t) { actions.push({ ...blankRaw('done'), title: t.title, ref: t.id }); continue; }
    }
    const date = p.date ?? (p.time || situationalTime(whole, s, s.today) ? s.today : null);
    const time = p.time ?? (date ? situationalTime(whole, s, date) : null);
    if (looksLikeEvent(whole) && (date || time)) {
      actions.push({ ...blankRaw('event'), title: whole, hat: p.hat ?? '', date: date ?? s.today, start: time ?? '', allDay: !time, minutes: p.minutes ?? 0 });
      continue;
    }
    actions.push({ ...blankRaw('task'), title: whole, hat: p.hat ?? '', date: date ?? '', start: time ?? '', minutes: p.minutes ?? 0, student: p.student ?? '' });
  }
  const n = actions.length;
  return { reply: n ? '' : 'Nothing to add from that.', actions };
}

/** A plain summary when the rule-based reader did the work. */
export function summarize(actions: Action[], today: string): string {
  if (!actions.length) return 'Nothing to add from that.';
  const bits = actions.map(a => {
    switch (a.kind) {
      case 'event': return `added "${a.title}" to your calendar ${a.allDay ? describeWhen(a.date, null, today) : describeWhen(a.date, a.start, today)}`;
      case 'task': return `added "${a.title}"${a.time ? ` with a reminder ${describeWhen(a.date, a.time, today)}` : ''}`;
      case 'log': return `logged ${a.goalKind === 'trials' ? `${a.value} of ${a.outOf}` : `+${a.value}`} for ${a.initials}`;
      case 'done': return `checked off "${a.title}"`;
      case 'move': return `moved "${a.title}" to ${describeWhen(a.date, a.start, today)}`;
      case 'cancel': return `took "${a.title}" off your calendar`;
    }
  });
  const text = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}` : bits[0];
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
