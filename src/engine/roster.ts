/**
 * Turns a pasted caseload into students. Two shapes work:
 *
 *   Blocks, one per student:            Rows pasted from a spreadsheet (tab-separated):
 *     J.S. 7A IEP                         Student  Class  Plan  Accommodations          Annual review
 *     goal: CER paragraph, 4 of 5         J.S.     7A     IEP   Graphic organizer; Breaks  3/12/27
 *     - graphic organizer
 *     annual review 3/12
 *
 * Full names become initials before anything is kept, so the caseload stays initials-only.
 */
import type { AppData, Goal, KeyDate, Student } from './types';
import { uid } from './util';

export type Plan = Student['plan'];

export interface RosterStudent {
  initials: string;
  period: string;
  plan: Plan;
  planGiven: boolean;
  accommodations: string[];
  goals: Goal[];
  dates: KeyDate[];
  /** Things worth a second look in the preview. */
  notes: string[];
}

export interface RosterParse {
  students: RosterStudent[];
  /** Lines that came before any student, so they had nowhere to go. */
  skipped: string[];
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5,
  jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
const FILLER = new Set(['plan', 'class', 'period', 'pd', 'pd.', 'section', 'student', 'grade', 'sec', 'sec.', 'hr', 'homeroom']);
const DATE_WORDS = /\b(review|annual|re-?eval|reevaluation|evaluation|triennial|meeting|due|deadline|report|progress|expires?|renewal|amend\w*|eligibility|start|ends?)\b/i;
const GOAL_PREFIX = /^(?:goals?|objective|benchmark|g\d+)\s*\d*\s*[:.)\-–]\s*/i;
const ACC_PREFIX = /^(?:acc(?:ommodations?)?|accoms?|mods?|modifications?|supports?|504)\s*[:\-–]\s*/i;
const BULLET = /^\s*(?:[-–—•*·▪◦●○]|\d+[.)])\s+/;

const isPlan = (t: string): Plan | null => {
  const x = t.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return x === 'IEP' ? 'IEP' : x === '504' || x === '504PLAN' ? '504' : null;
};
const isSection = (t: string) => /^\d{1,2}[a-h]$/i.test(t.replace(/[^a-z0-9]/gi, ''));
const isFiller = (t: string) => FILLER.has(t.toLowerCase());

/** "J.S.", "JS", "J.S", "JSM" → letters; null for anything that isn't initials. */
function initialsLetters(tok: string, lenient = false): string | null {
  const t = tok.replace(/^[([{"']+|[)\]}"',;:]+$/g, '');
  const letters = t.replace(/[^a-z]/gi, '');
  if (letters.length < 1 || letters.length > 3 || /[^a-z.]/i.test(t)) return null;
  if (t.includes('.')) return letters.toUpperCase();
  if (letters.length < 2) return null;
  if (letters === letters.toUpperCase() || (lenient && letters === letters.toLowerCase())) return letters.toUpperCase();
  return null;
}
const isNameWord = (t: string) => /^[A-Z][a-z'’-]+$/.test(t);
const dotted = (letters: string) => `${letters.slice(0, 3).split('').join('.')}.`;

/* ------------------------------------------------------------------ dates */

interface FoundDate { iso: string; start: number; end: number; strong: boolean }

function isoFrom(today: string, month: number, day: number, year?: number): string | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = year ?? Number(today.slice(0, 4));
  let iso = `${y}-${pad(month + 1)}-${pad(day)}`;
  const check = new Date(`${iso}T12:00:00`);
  if (check.getMonth() !== month) return null;
  // No year given: the next one coming, since these are dates to get ready for.
  if (year == null && iso < today) iso = `${y + 1}-${pad(month + 1)}-${pad(day)}`;
  return iso;
}
const fullYear = (y: string | undefined) => (y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : undefined);

function findDate(text: string, today: string): FoundDate | null {
  let m = /\b(20\d\d)-(\d{1,2})-(\d{1,2})\b/.exec(text);
  if (m) {
    const iso = isoFrom(today, Number(m[2]) - 1, Number(m[3]), Number(m[1]));
    if (iso) return { iso, start: m.index, end: m.index + m[0].length, strong: true };
  }
  m = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i.exec(text);
  if (m) {
    const iso = isoFrom(today, MONTHS[m[1].toLowerCase().replace('.', '')], Number(m[2]), fullYear(m[3]));
    if (iso) return { iso, start: m.index, end: m.index + m[0].length, strong: true };
  }
  m = /(^|[^\d/.])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/.exec(text) ?? /(^|[^\d/.-])(\d{1,2})-(\d{1,2})-(\d{4}|\d{2})(?![\d-])/.exec(text);
  if (m) {
    const start = m.index + m[1].length;
    const iso = isoFrom(today, Number(m[2]) - 1, Number(m[3]), fullYear(m[4]));
    if (iso) return { iso, start, end: m.index + m[0].length, strong: !!m[4] };
  }
  return null;
}

function dateLabel(text: string, found: FoundDate, plan: Plan, column?: string): string {
  const rest = (text.slice(0, found.start) + ' ' + text.slice(found.end))
    .replace(/\b(on|by|due|is|was|date)\b/gi, ' ')
    .replace(/[:,()]+/g, ' ')
    .replace(/(^|\s)[-–—]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const label = rest || column || (plan === '504' ? '504 review' : 'Annual IEP review');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/* ------------------------------------------------------------------ goals */

const MEASURE = [
  /\b\d+\s*(?:out of|of)\s*\d+\b/i,
  /\b\d+\s*\/\s*\d+\s*(?:trials?|tries|attempts?|opportunities|probes|times|checks|occasions)\b/i,
  /\b\d{1,3}\s*%/,
  /\b\d+\s*(?:times|x)\s*(?:a|per|each)\s*(?:day|class|period|week)\b/i,
  /\b(?:trials?|tries|opportunities|probes|accuracy)\b/i,
];
const looksMeasured = (t: string) => MEASURE.some(re => re.test(t));

export function goalFrom(raw: string): Goal {
  const text = raw.replace(GOAL_PREFIX, '').replace(BULLET, '').trim();
  const goal: Goal = { id: uid('g'), text, kind: 'trials', outOf: 5, target: 4 };
  const tally = /\b(\d+)\s*(?:times|x)\s*(?:a|per|each)\s*(?:day|class|period)\b/i.exec(text);
  const trials = /\b(\d+)\s*(?:out of|of|\/)\s*(\d+)\b/i.exec(text);
  const pct = /\b(\d{1,3})\s*%/.exec(text);
  if (trials && Number(trials[2]) >= 2 && Number(trials[1]) <= Number(trials[2])) {
    let target = Number(trials[1]);
    let outOf = Number(trials[2]);
    if (outOf > 10) { target = Math.round((target / outOf) * 10); outOf = 10; }
    goal.outOf = outOf;
    goal.target = Math.max(1, target);
  } else if (tally) {
    goal.kind = 'tally';
    goal.target = Math.min(20, Math.max(1, Number(tally[1])));
  } else if (pct) {
    goal.outOf = 10;
    goal.target = Math.min(10, Math.max(1, Math.round(Number(pct[1]) / 10)));
  }
  return goal;
}

/* -------------------------------------------------------------- the parse */

function splitList(text: string): string[] {
  const bySemi = text.split(/\s*[;•|]\s*/).map(s => s.trim()).filter(Boolean);
  return bySemi.flatMap(part => {
    const byComma = part.split(/\s*,\s*/).filter(Boolean);
    // Commas split a list of short items, not a sentence that happens to have one.
    return byComma.length > 1 && byComma.every(p => p.split(/\s+/).length <= 5) ? byComma : [part];
  });
}

type Mode = 'goal' | 'accommodation' | 'date' | null;

function addDetail(st: RosterStudent, raw: string, today: string, column?: string, mode: Mode = null) {
  const line = raw.trim();
  if (!line) return;
  if (GOAL_PREFIX.test(line)) { const g = goalFrom(line); if (g.text) st.goals.push(g); return; }
  if (ACC_PREFIX.test(line)) { st.accommodations.push(...splitList(line.replace(ACC_PREFIX, ''))); return; }
  const text = line.replace(BULLET, '').trim();
  if (!text) return;
  const col = column?.toLowerCase() ?? '';
  if (/goal|objective/.test(col)) { splitList(text).forEach(g => st.goals.push(goalFrom(g))); return; }
  if (/accom|modif|support/.test(col)) { st.accommodations.push(...splitList(text)); return; }
  const found = findDate(text, today);
  if (mode === 'goal' && !(found && DATE_WORDS.test(text) && !looksMeasured(text))) { st.goals.push(goalFrom(text)); return; }
  if (found) {
    const words = (text.slice(0, found.start) + ' ' + text.slice(found.end)).trim().split(/\s+/).filter(Boolean).length;
    if (found.strong || DATE_WORDS.test(text) || words === 0 || /date|review|eval|meeting|due/.test(col)) {
      st.dates.push({ id: uid('d'), label: dateLabel(text, found, st.plan, column ? titleCase(column) : undefined), date: found.iso });
      return;
    }
  }
  if (mode === 'accommodation' || mode === 'date') { st.accommodations.push(...splitList(text)); return; }
  // A measured line is a goal, unless this is a 504 (504s carry accommodations, not goals).
  if (looksMeasured(text) && !(st.planGiven && st.plan === '504')) { st.goals.push(goalFrom(text)); return; }
  st.accommodations.push(...splitList(text));
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

interface Header { initials: string; period: string; plan: Plan | null; fromName: boolean; rest: string[] }

/** Reads "J.S. 7A IEP: extended time" or "John Smith, 7A, 504" into its parts. */
function readHeader(line: string): Header | null {
  const segs = line.split(/\s*(?:\t|;|:|,|\s[-–—|]\s)\s*/).map(s => s.trim()).filter(Boolean);
  const h: Header = { initials: '', period: '', plan: null, fromName: false, rest: [] };
  for (const seg of segs) {
    const toks = seg.split(/\s+/).filter(Boolean);
    if (h.initials) {
      if (toks.every(t => isPlan(t) || isSection(t) || isFiller(t))) {
        for (const t of toks) { if (!h.plan && isPlan(t)) h.plan = isPlan(t); else if (!h.period && isSection(t)) h.period = t.replace(/[^a-z0-9]/gi, '').toUpperCase(); }
      } else h.rest.push(seg);
      continue;
    }
    // The segment with the name in it. Class and plan can sit anywhere around it.
    let letters = '';
    let nameDone = false;
    const rest: string[] = [];
    toks.forEach((t, i) => {
      const p = isPlan(t);
      if (p && !h.plan) { h.plan = p; if (letters) nameDone = true; return; }
      if (isSection(t) && !h.period) { h.period = t.replace(/[^a-z0-9]/gi, '').toUpperCase(); if (letters) nameDone = true; return; }
      if (isFiller(t) && !letters) return;
      if (!nameDone && letters.length < 3) {
        const ini = initialsLetters(t, !letters && i <= 1 && toks.some(x => isPlan(x) || isSection(x)));
        if (ini) { letters += ini; return; }
        if (isNameWord(t) && !DATE_WORDS.test(t)) { letters += t[0].toUpperCase(); h.fromName = true; return; }
      }
      if (letters) nameDone = true;
      rest.push(t);
    });
    // A segment of just the class or plan ("7C - A.R. - 504"): the name comes next.
    if (!letters) { if (rest.length) return null; continue; }
    h.initials = dotted(letters);
    if (rest.length) h.rest.push(rest.join(' '));
  }
  return h.initials ? h : null;
}

/** Is this line where a new student starts? */
function isHeaderLine(line: string, afterBreak: boolean): boolean {
  const toks = line.split(/[\s,;:|]+/).filter(t => /[a-z0-9]/i.test(t));
  const hasPlan = toks.some(t => isPlan(t));
  const hasSection = toks.some(t => isSection(t));
  const lead = toks.findIndex(t => !isPlan(t) && !isSection(t) && !isFiller(t));
  if (lead === -1) return false;
  const first = toks[lead];
  // "504 meeting 2/4" is a date under a student, not a new student.
  if (lead > 0 && !hasSection) return false;
  const firstIni = initialsLetters(first, hasPlan || hasSection);
  if (firstIni) {
    if (hasPlan || hasSection) return true;
    if (first.includes('.') && (toks.length === 1 || (afterBreak && toks.length <= 3))) return true;
    return false;
  }
  // "John Smith 7A IEP": name words, then the class or plan within the first few words.
  if (isNameWord(first) && (hasPlan || hasSection) && !DATE_WORDS.test(line) && !findDate(line, '2000-01-01')) {
    const idx = toks.findIndex(t => isPlan(t) || isSection(t));
    if (idx < lead) return toks.slice(lead, lead + 3).some(t => isNameWord(t));
    return idx <= lead + 3 && toks.slice(lead, idx).every(t => isNameWord(t) || !!initialsLetters(t));
  }
  return false;
}

function startStudent(h: Header, group: { plan: Plan | null; period: string } = { plan: null, period: '' }): RosterStudent {
  const plan = h.plan ?? group.plan;
  return {
    initials: h.initials,
    period: h.period || group.period,
    plan: plan ?? 'IEP',
    planGiven: !!plan,
    accommodations: [],
    goals: [],
    dates: [],
    notes: h.fromName ? ['Name changed to initials'] : [],
  };
}

function finish(list: RosterStudent[]): RosterStudent[] {
  // The same student listed twice becomes one.
  const out: RosterStudent[] = [];
  for (const st of list) {
    const twin = out.find(o => o.initials === st.initials && (o.period === st.period || !o.period || !st.period));
    if (twin) {
      twin.period ||= st.period;
      if (st.planGiven) { twin.plan = st.plan; twin.planGiven = true; }
      mergeInto(twin, st);
      for (const n of st.notes) if (!twin.notes.includes(n)) twin.notes.push(n);
    } else out.push(st);
  }
  for (const st of out) {
    if (!st.planGiven) {
      st.plan = st.goals.length || !st.accommodations.length ? 'IEP' : '504';
      st.notes.push(`Plan not given, set to ${st.plan}`);
    }
    if (st.initials.replace(/\./g, '').length < 2) st.notes.push('Only one initial');
    if (!st.period) st.notes.push('No class given');
  }
  return out;
}

function mergeInto(target: { accommodations: string[]; goals: Goal[]; dates: KeyDate[] }, src: { accommodations: string[]; goals: Goal[]; dates: KeyDate[] }) {
  const has = (xs: string[], x: string) => xs.some(y => y.toLowerCase() === x.toLowerCase());
  for (const a of src.accommodations) if (!has(target.accommodations, a)) target.accommodations.push(a);
  for (const g of src.goals) if (!has(target.goals.map(x => x.text), g.text)) target.goals.push(g);
  for (const d of src.dates) if (!target.dates.some(x => x.date === d.date && x.label.toLowerCase() === d.label.toLowerCase())) target.dates.push(d);
}

export function parseRoster(text: string, today: string): RosterParse {
  const students: RosterStudent[] = [];
  const skipped: string[] = [];
  let current: RosterStudent | null = null;
  let columns: string[] | null = null;
  let afterBreak = true;
  let mode: Mode = null;
  const group: { plan: Plan | null; period: string } = { plan: null, period: '' };

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) { afterBreak = true; continue; }

    // A row pasted from a spreadsheet.
    if (line.includes('\t')) {
      const cells = line.split('\t').map(c => c.trim());
      const nonEmpty = cells.filter(Boolean);
      const isColumnRow = !nonEmpty.some(c => isPlan(c) || isSection(c) || initialsLetters(c)) && nonEmpty.some(c => /student|name|initial|plan|class|period|section|accom|goal|review|date/i.test(c));
      if (isColumnRow) { columns = cells; afterBreak = false; continue; }
      const col = (i: number) => columns?.[i] ?? '';
      const nameAt = (() => {
        const named = cells.findIndex((_, i) => /student|name|initial/i.test(col(i)));
        if (named !== -1) return named;
        return cells.findIndex(c => c && !isPlan(c) && !isSection(c) && !findDate(c, today));
      })();
      const header = nameAt === -1 ? null : readHeader(cells[nameAt]);
      if (!header) { skipped.push(line.trim()); continue; }
      const st = startStudent(header, group);
      header.rest.forEach(r => addDetail(st, r, today));
      cells.forEach((c, i) => {
        if (i === nameAt || !c) return;
        const name = col(i);
        const p = isPlan(c) ?? (/\b504\b/.test(c) ? '504' : /\biep\b/i.test(c) ? 'IEP' : null);
        if (/plan|type/i.test(name)) { if (p) { st.plan = p; st.planGiven = true; } return; }
        if (isPlan(c) && !st.planGiven) { st.plan = isPlan(c)!; st.planGiven = true; return; }
        if (/class|period|section|homeroom/i.test(name)) { if (c.length <= 8) st.period = c.replace(/^(?:period|pd\.?|class)\s*/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase(); return; }
        if (isSection(c) && !st.period) { st.period = c.replace(/[^a-z0-9]/gi, '').toUpperCase(); return; }
        addDetail(st, c, today, name || undefined);
      });
      students.push(st);
      current = null;
      afterBreak = false;
      continue;
    }

    const t = line.trim();
    // Group labels: "504 Students", "IEP:", "7A", "Period 3".
    const groupPlan = /^(?:my\s+)?(iep|504)(?:\s*(?:students?|plans?|kids|caseload|list|s))?\s*:?$/i.exec(t);
    if (groupPlan) { group.plan = isPlan(groupPlan[1]); current = null; mode = null; afterBreak = true; continue; }
    const groupClass = /^(?:(?:period|pd\.?|class|section|block)\s*)?(\d{1,2}[a-h]?)\s*:?$/i.exec(t);
    if (groupClass && (isSection(groupClass[1]) || /^(period|pd|class|section|block)/i.test(t))) { group.period = groupClass[1].toUpperCase(); current = null; mode = null; afterBreak = true; continue; }
    // Labels inside a student: "Goals:", "Accommodations:".
    if (/^(?:iep\s+)?(?:goals?|objectives?|benchmarks?)\s*:?$/i.test(t)) { mode = 'goal'; continue; }
    if (/^(?:accommodations?|accoms?|modifications?|supports?|504 accommodations)\s*:?$/i.test(t)) { mode = 'accommodation'; continue; }
    if (/^(?:key\s+)?(?:dates?|meetings?|timeline|deadlines?)\s*:?$/i.test(t)) { mode = 'date'; continue; }

    if (isHeaderLine(t, afterBreak)) {
      const header = readHeader(t);
      if (header) {
        mode = null;
        current = startStudent(header, group);
        students.push(current);
        header.rest.forEach(r => (current ? splitList(r).forEach(part => addDetail(current!, part, today)) : null));
        afterBreak = false;
        continue;
      }
    }
    afterBreak = false;
    if (current) addDetail(current, line, today, undefined, mode);
    else skipped.push(t);
  }
  return { students: finish(students), skipped };
}

/* ------------------------------------------------------------- applying */

/** The student this row would update, if Hats already has them. */
export function matchExisting(existing: Student[], st: Pick<RosterStudent, 'initials' | 'period'>): Student | undefined {
  const same = existing.filter(s => s.initials.toUpperCase() === st.initials.toUpperCase());
  if (st.period) return same.find(s => s.period.toUpperCase() === st.period.toUpperCase()) ?? (same.length === 1 && !same[0].period ? same[0] : undefined);
  return same.length === 1 ? same[0] : undefined;
}

/** Adds new students and fills in existing ones. Nothing already there is removed. */
export function applyRoster(d: AppData, list: RosterStudent[]): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  for (const st of list) {
    const found = matchExisting(d.students, st);
    if (found) {
      if (st.planGiven) found.plan = st.plan;
      if (!found.period && st.period) found.period = st.period;
      mergeInto(found, { accommodations: st.accommodations, goals: st.goals.map(g => ({ ...g, id: uid('g') })), dates: st.dates.map(x => ({ ...x, id: uid('d') })) });
      updated++;
    } else {
      d.students.push({
        id: uid('s'),
        initials: st.initials,
        period: st.period,
        plan: st.plan,
        goals: st.goals.map(g => ({ ...g, id: uid('g') })),
        accommodations: [...st.accommodations],
        dates: st.dates.map(x => ({ ...x, id: uid('d') })),
        points: [],
      });
      added++;
    }
  }
  return { added, updated };
}
