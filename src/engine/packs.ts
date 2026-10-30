/**
 * Packs: each hat brings its own small toolkit. Some packs are screens Hats already had (the bell
 * schedule, Caseload, Pulse, the kids' board, dinner and the weekly rhythm). The rest share one shape,
 * a list of pack items, configured per hat: 1:1s for a team lead, deadlines for a student, invoices
 * for a side gig, refills for a caregiver.
 *
 * Anything with a date turns into a task on that day, so it shows up in Now. Finishing the task
 * finishes (or reschedules) the item.
 */
import { addDays, daysBetween, monthKey, weekStart } from './dates';
import type { AppData, HatId, PackItem, Task } from './types';
import { sum } from './util';

export interface PackLink {
  label: string;
  route: string;
  icon: 'calendar' | 'people' | 'pulse' | 'star' | 'dinner' | 'laundry' | 'bolt';
  note: string;
}

export interface PackDef {
  hat: HatId;
  /** Short name of the pack, e.g. "1:1s". */
  title: string;
  /** One line on what it does; shown when picking hats. */
  blurb: string;
  /** Screens Hats already has that belong to this hat. */
  links: PackLink[];
  /** Pack items, when this pack keeps a list. */
  list?: {
    noun: string;
    titleHint: string;
    whoHint?: string;
    /** Each item is a person you check in with: finishing logs a touch and keeps them. */
    people?: boolean;
    amount?: boolean;
    repeat?: boolean;
    defaultRepeat?: number;
    /** Count work sessions (Creative). */
    sessions?: boolean;
    doneLabel: string;
    /** Title of the task it becomes on its day. */
    task: (p: PackItem) => string;
    minutes: number;
    empty: string;
  };
}

const L = {
  bells: { label: 'Bell schedule', route: '/schedule', icon: 'calendar', note: 'Hats waits while you teach and fills your planning period.' },
  workSchedule: { label: 'Work schedule', route: '/schedule', icon: 'calendar', note: 'Meetings, shifts and focus blocks. Hats waits in meetings and fills the gaps.' },
  pulse: { label: 'Pulse', route: '/pulse', icon: 'pulse', note: 'Sort exit tickets into Reteach, Practice and Extend.' },
  caseload: { label: 'Caseload', route: '/caseload', icon: 'people', note: 'IEP and 504 goals, one-tap data, progress reports.' },
  kids: { label: 'Kids’ board', route: '/kids', icon: 'star', note: 'A bedtime routine board with team stars.' },
  home: { label: 'Dinner and rhythm', route: '/home', icon: 'dinner', note: 'Tonight’s dinner, the defrost reminder and the weekly rhythm.' },
  energy: { label: 'Morning plan', route: '/morning', icon: 'bolt', note: 'Check your energy; low days lead with quick wins.' },
} satisfies Record<string, PackLink>;

export const PACKS: Record<HatId, PackDef> = {
  work: {
    hat: 'work', title: 'Work schedule', blurb: 'Your meetings and focus blocks, so Hats knows when you’re free', links: [L.workSchedule],
  },
  lead: {
    hat: 'lead', title: '1:1s', blurb: 'Your people, when you last met, the next 1:1', links: [],
    list: { noun: 'Person', titleHint: 'Name or initials', whoHint: 'Role (optional)', people: true, repeat: true, defaultRepeat: 14, doneLabel: 'Met', task: p => `1:1 with ${p.title}`, minutes: 30, empty: 'Add the people you lead. Each gets a 1:1 rhythm, and the next one shows up in Now on its day.' },
  },
  mentor: {
    hat: 'mentor', title: 'Mentees', blurb: 'Who you’re coaching and the next check-in', links: [],
    list: { noun: 'Mentee', titleHint: 'Name or initials', whoHint: 'Focus right now (optional)', people: true, repeat: true, defaultRepeat: 7, doneLabel: 'Checked in', task: p => `Check in with ${p.title}`, minutes: 20, empty: 'Add the people you mentor. Hats brings up the next check-in on its day.' },
  },
  union: {
    hat: 'union', title: 'Member issues', blurb: 'Who raised what, the next step and when', links: [],
    list: { noun: 'Issue', titleHint: 'What’s going on', whoHint: 'Member (initials)', doneLabel: 'Closed', task: p => `Next step: ${p.title}${p.who ? ` (${p.who})` : ''}`, minutes: 15, empty: 'Log member issues as they come in. Give each a next-step date and it lands in Now.' },
  },
  gig: {
    hat: 'gig', title: 'Jobs and invoices', blurb: 'What you’re owed, what’s paid, the month’s total', links: [],
    list: { noun: 'Job', titleHint: 'Job or invoice', whoHint: 'Client (optional)', amount: true, doneLabel: 'Paid', task: p => `Follow up: ${p.title}${p.who ? ` · ${p.who}` : ''}`, minutes: 5, empty: 'Add jobs and invoices with an amount. A due date reminds you to follow up; Paid adds it to the month.' },
  },
  teacher: {
    hat: 'teacher', title: 'Classroom', blurb: 'Bell schedule and Pulse for exit tickets', links: [L.bells, L.pulse],
  },
  sped: {
    hat: 'sped', title: 'Caseload', blurb: 'IEP and 504 goals, one-tap data, progress reports', links: [L.caseload],
  },
  student: {
    hat: 'student', title: 'Deadlines', blurb: 'Assignments and exams with a countdown', links: [],
    list: { noun: 'Deadline', titleHint: 'Paper, exam or assignment', whoHint: 'Class (optional)', doneLabel: 'Turned in', task: p => `Due: ${p.title}${p.who ? ` · ${p.who}` : ''}`, minutes: 30, empty: 'Add what’s due. The countdown keeps it in view, and it shows up in Now on the day.' },
  },
  parent: {
    hat: 'parent', title: 'Kids', blurb: 'Bedtime board and the kids’ weekly activities', links: [L.kids, L.home],
  },
  caregiver: {
    hat: 'caregiver', title: 'Care list', blurb: 'Appointments and refills that come back on their own', links: [],
    list: { noun: 'Item', titleHint: 'Refill, appointment or call', whoHint: 'For (optional)', repeat: true, doneLabel: 'Done', task: p => `${p.title}${p.who ? ` · ${p.who}` : ''}`, minutes: 15, empty: 'Add refills and appointments. Set “every 30 days” and the next one is scheduled when you finish this one.' },
  },
  home: {
    hat: 'home', title: 'Dinner and rhythm', blurb: 'Tonight’s dinner, defrost reminder, weekly chores', links: [L.home],
  },
  volunteer: {
    hat: 'volunteer', title: 'Commitments', blurb: 'What you said yes to, and when it’s due', links: [],
    list: { noun: 'Commitment', titleHint: 'What you signed up for', whoHint: 'Group (optional)', repeat: true, doneLabel: 'Done', task: p => `${p.title}${p.who ? ` · ${p.who}` : ''}`, minutes: 20, empty: 'Add what you’ve agreed to do. It lands in Now on its date, so nothing slips.' },
  },
  coach: {
    hat: 'coach', title: 'Games and practices', blurb: 'The season’s schedule, repeating practices included', links: [],
    list: { noun: 'Game or practice', titleHint: 'Practice, game vs. Tigers…', whoHint: 'Where (optional)', repeat: true, defaultRepeat: 7, doneLabel: 'Done', task: p => `${p.title}${p.who ? ` @ ${p.who}` : ''}`, minutes: 60, empty: 'Add practices and games. Weekly practices repeat on their own.' },
  },
  creative: {
    hat: 'creative', title: 'Projects', blurb: 'Each project’s next step and sessions this week', links: [],
    list: { noun: 'Project', titleHint: 'Project name', whoHint: 'Next step', sessions: true, repeat: true, doneLabel: 'Worked on it', task: p => `${p.title}${p.who ? `: ${p.who}` : ''}`, minutes: 30, empty: 'Add a project and its next step. Tap “Worked on it” after a session; Hats counts your sessions this week (no streaks).' },
  },
  wellness: {
    hat: 'wellness', title: 'Energy', blurb: 'A morning energy check and protected me-time', links: [L.energy],
  },
};

export const packFor = (hat: HatId): PackDef => PACKS[hat];

/* ------------------------------------------------------------- items */

export const PACK_PREFIX = 'pk-';
export const packTaskId = (p: PackItem) => `${PACK_PREFIX}${p.id}-${p.date}`;
export const isPackTask = (id: string) => id.startsWith(PACK_PREFIX);
const itemOfTask = (d: AppData, taskId: string) => d.packs.find(p => taskId.startsWith(`${PACK_PREFIX}${p.id}-`));

export function addPackItem(d: AppData, fields: Partial<PackItem> & { hat: HatId; title: string }, nowIso: string): PackItem {
  const def = PACKS[fields.hat].list;
  const item: PackItem = {
    id: fields.id ?? `pi-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    hat: fields.hat,
    title: fields.title.trim(),
    who: (fields.who ?? '').trim(),
    date: fields.date ?? null,
    time: fields.time ?? null,
    repeatDays: fields.repeatDays ?? def?.defaultRepeat ?? 0,
    amount: fields.amount ?? null,
    done: false,
    doneAt: null,
    last: null,
    sessions: [],
    note: fields.note ?? '',
    created: nowIso,
  };
  d.packs.push(item);
  return item;
}

export function updatePackItem(d: AppData, id: string, patch: Partial<Omit<PackItem, 'id' | 'hat' | 'created'>>) {
  d.packs = d.packs.map(p => (p.id === id ? { ...p, ...patch } : p));
}

export function deletePackItem(d: AppData, id: string) {
  d.packs = d.packs.filter(p => p.id !== id);
  d.tasks = d.tasks.filter(t => !(t.id.startsWith(`${PACK_PREFIX}${id}-`) && !t.done));
}

/**
 * Finishing an item. People and projects log a touch and stay; repeating items move to their next
 * date; everything else is done.
 */
export function finishPackItem(d: AppData, id: string, today: string, nowIso: string) {
  const p = d.packs.find(x => x.id === id);
  if (!p) return;
  const def = PACKS[p.hat].list;
  if (def?.sessions) p.sessions = [...p.sessions, today];
  if (def?.people) p.last = today;
  if (p.repeatDays > 0) {
    // The next one counts from the planned date when it was on time, from today when it was late.
    const base = p.date && p.date >= today ? p.date : today;
    p.date = addDays(base, p.repeatDays);
  } else if (def?.people || def?.sessions) {
    p.date = null;
  } else {
    p.done = true;
    p.doneAt = nowIso;
  }
  // A task already made for this item is finished with it.
  for (const t of d.tasks) if (!t.done && t.id.startsWith(`${PACK_PREFIX}${p.id}-`)) { t.done = true; t.doneAt = nowIso; }
}

export function reopenPackItem(d: AppData, id: string) {
  const p = d.packs.find(x => x.id === id);
  if (p) { p.done = false; p.doneAt = null; }
}

/** Called when a task made from a pack item is finished anywhere in the app (Now, focus, a widget). */
export function packTaskDone(d: AppData, taskId: string, nowIso: string) {
  const p = itemOfTask(d, taskId);
  if (!p) return;
  finishPackItem(d, p.id, nowIso.slice(0, 10), nowIso);
}

/**
 * Turns items due today (or overdue) into tasks, once, for hats being worn. Tasks for items that moved
 * or were finished elsewhere are cleared. Returns true when anything changed.
 */
export function materializePacks(d: AppData, today: string, nowIso: string): boolean {
  const worn = new Set(d.hats.filter(h => h.on).map(h => h.id));
  let changed = false;
  const wanted = new Map<string, PackItem>();
  for (const p of d.packs) {
    if (p.done || !p.date || p.date > today || !worn.has(p.hat) || !PACKS[p.hat].list) continue;
    wanted.set(packTaskId(p), p);
  }
  const before = d.tasks.length;
  d.tasks = d.tasks.filter(t => !(isPackTask(t.id) && !t.done && !wanted.has(t.id)));
  if (d.tasks.length !== before) changed = true;
  let order = d.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  for (const [id, p] of wanted) {
    if (d.tasks.some(t => t.id === id)) continue;
    const def = PACKS[p.hat].list!;
    const task: Task = { id, title: def.task(p), hat: p.hat, date: today, time: p.date === today ? p.time : null, minutes: def.minutes, student: null, done: false, doneAt: null, created: nowIso, order: order++, deferredAt: null };
    d.tasks.push(task);
    changed = true;
  }
  return changed;
}

/* ------------------------------------------------------------- views */

export function packItems(d: AppData, hat: HatId) {
  const all = d.packs.filter(p => p.hat === hat);
  const open = all.filter(p => !p.done).sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title));
  const done = all.filter(p => p.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  return { open, done };
}

/** "Today", "Tomorrow", "in 5 days", "3 days late". */
export function countdown(date: string | null, today: string): string {
  if (!date) return 'No date';
  const n = daysBetween(today, date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return '1 day late';
  return n > 0 ? `in ${n} days` : `${-n} days late`;
}

/** The line under a pack's title: money for a side gig, sessions for projects, what's next for the rest. */
export function packSummary(d: AppData, hat: HatId, today: string): string {
  const def = PACKS[hat];
  if (!def.list) return def.blurb;
  const { open, done } = packItems(d, hat);
  if (def.list.amount) {
    const month = monthKey(today);
    const paid = sum(done.filter(p => p.doneAt && monthKey(p.doneAt.slice(0, 10)) === month).map(p => p.amount ?? 0));
    const owed = sum(open.map(p => p.amount ?? 0));
    return `${money(paid)} paid this month · ${money(owed)} still owed`;
  }
  if (def.list.sessions) {
    const wk = weekStart(today);
    const n = sum(d.packs.filter(p => p.hat === hat).map(p => p.sessions.filter(s => s >= wk && s <= today).length));
    return `${n} ${n === 1 ? 'session' : 'sessions'} this week`;
  }
  const due = open.filter(p => p.date && p.date <= addDays(today, 7)).length;
  if (!open.length) return def.blurb;
  return due ? `${due} coming up this week` : `${open.length} ${open.length === 1 ? def.list.noun.toLowerCase() : 'on the list'}`;
}

export const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
