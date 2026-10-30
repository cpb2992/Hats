/** Starting data for a new install, and the sample data behind "Try it with sample data". */
import { addDays, nextWorkday, weekStart } from './dates';
import { ALL_HATS, HATS, STARTER_HATS } from './hats';
import { DEFAULT_MOVES } from './pulse';
import { emptySchedule } from './schedule';
import type { AppData, Chore, Cycle, KidStep, PackItem, Student, Task } from './types';

export const DEFAULT_ROUTINE: KidStep[] = [
  { id: 'r-backpack', label: 'Backpack away', icon: 'backpack' },
  { id: 'r-dinner', label: 'Dinner done', icon: 'bowl' },
  { id: 'r-teeth', label: 'Brush teeth', icon: 'tooth' },
  { id: 'r-pjs', label: 'PJs on', icon: 'shirt' },
  { id: 'r-story', label: 'Story time', icon: 'book' },
];

/** A light starting rhythm; people edit or delete these in Settings → Weekly rhythm. */
export const DEFAULT_CHORES: Chore[] = [
  { id: 'c-laundry', label: 'Laundry', days: [0, 3], kind: 'laundry' },
  { id: 'c-groceries', label: 'Groceries', days: [6], kind: 'other' },
  { id: 'c-bedding', label: 'Bedding (monthly)', days: [6], kind: 'laundry' },
];

export const DEFAULT_MEALS = ['Chicken thighs', 'Ground turkey', 'Salmon', 'Pasta', 'Tacos', 'Leftovers'];

export function freshData(): AppData {
  return {
    v: 1,
    settings: {
      name: '',
      onboarded: false,
      morning: '06:15',
      schoolStart: '09:00',
      shutdown: '17:00',
      pickups: '17:00',
      bedtime: '20:00',
      gym: '20:30',
      workdays: [1, 2, 3, 4, 5],
      notify: { morning: true, shutdown: true, tasks: true, blocks: true, events: true },
      schedule: emptySchedule(),
    },
    hats: ALL_HATS.map(id => ({ id, name: HATS[id].name, on: STARTER_HATS.includes(id) })),
    tasks: [],
    students: [],
    standards: [{ id: 'std-1', code: 'Target 1', text: 'Today’s learning target. Rename it to your own standard.' }],
    cycles: [],
    meals: [...DEFAULT_MEALS],
    dinners: {},
    chores: DEFAULT_CHORES.map(c => ({ ...c, days: [...c.days] })),
    events: [],
    kids: [],
    routine: DEFAULT_ROUTINE.map(r => ({ ...r })),
    board: { date: '', done: {}, stars: 0, goal: 20, reward: 'Friday movie night. You pick the movie.' },
    days: {},
    focus: [],
    packs: [],
  };
}

/** A believable week for exploring the app. Initials and names are made up. */
export function makeDemo(today: string, settings?: AppData['settings']): AppData {
  const d = freshData();
  if (settings) d.settings = { ...settings, onboarded: true, notify: { morning: false, shutdown: false, tasks: false, blocks: false, events: false } };
  d.settings.name = d.settings.name || 'Sam';
  d.hats = d.hats.map(h => ({ ...h, on: ['work', 'lead', 'gig', 'parent', 'home', 'wellness'].includes(h.id) }));
  d.settings.schedule = sampleWorkWeek();
  d.settings.onboarded = true;
  const created = `${today}T06:00:00.000Z`;
  let order = 0;
  const task = (title: string, hat: Task['hat'], minutes: number, extra: Partial<Task> = {}): Task => ({
    id: `demo-${order}`, title, hat, date: today, time: null, minutes, student: null, done: false, doneAt: null, created, order: order++, deferredAt: null, ...extra,
  });
  d.tasks = [
    task('Send the Q3 numbers to Dana', 'work', 10),
    task('Prep the client deck', 'work', 45, { time: '10:30' }),
    task('Write Priya’s review notes', 'lead', 20, { time: '13:30' }),
    task('Invoice the Lees for October', 'gig', 5, { time: '16:30' }),
    task('Sign the field trip form', 'parent', 2),
    task('30-minute walk', 'wellness', 30, { time: '17:30' }),
    task('Book the kids’ dentist appointments', 'parent', 10, { date: addDays(today, 2) }),
    task('Call the plumber about the sink', 'home', 10),
    task('Renew the car registration', 'home', 15, { date: nextWorkday(today, [5]) }),
    task('Answered the vendor email', 'work', 10, { done: true, doneAt: `${today}T07:05:00.000Z` }),
    task('Paid the electric bill', 'home', 5, { done: true, doneAt: `${today}T07:20:00.000Z` }),
  ];
  const item = (hat: PackItem['hat'], title: string, extra: Partial<PackItem> = {}): PackItem => ({
    id: `demo-pk-${d.packs.length}`, hat, title, who: '', date: null, time: null, repeatDays: 0, amount: null, done: false, doneAt: null, last: null, sessions: [], note: '', created, ...extra,
  });
  d.packs = [];
  d.packs.push(item('lead', 'Priya', { who: 'Designer', date: addDays(today, 1), time: '14:00', repeatDays: 14, last: addDays(today, -13) }));
  d.packs.push(item('lead', 'Marcus', { who: 'Analyst', date: addDays(today, 6), repeatDays: 14, last: addDays(today, -8) }));
  d.packs.push(item('gig', 'Tutoring, October', { who: 'The Lees', amount: 240, date: today }));
  d.packs.push(item('gig', 'Logo for the bakery', { who: 'Rise & Shine', amount: 350 }));
  d.packs.push(item('gig', 'Tutoring, September', { who: 'The Lees', amount: 220, done: true, doneAt: `${today}T08:00:00.000Z` }));
  d.days[today] = { date: today, recovery: 72, three: ['demo-0', 'demo-1'], planned: true, shutdown: false };

  const student = (id: string, initials: string, period: string, plan: Student['plan'], goal: string, kind: 'tally' | 'trials', values: number[], dueIn: number, dueLabel: string, accom: string[]): Student => {
    const goalId = `${id}-g1`;
    return {
      id, initials, period, plan,
      goals: [{ id: goalId, text: goal, kind, outOf: 5, target: kind === 'trials' ? 4 : 3 }],
      accommodations: accom,
      dates: [{ id: `${id}-d1`, label: dueLabel, date: addDays(today, dueIn) }],
      points: values.map((v, i) => ({ goalId, date: addDays(today, -7 * (values.length - 1 - i)), value: v, outOf: kind === 'trials' ? 5 : undefined })),
    };
  };
  d.students = [
    student('s1', 'A.R.', 'P3', 'IEP', 'Backs a written claim with evidence in 4 of 5 tries.', 'trials', [1, 1, 2, 2, 3, 2, 3, 3], 11, 'Annual IEP review', ['Read-aloud', 'Graphic organizer', 'Extended time']),
    student('s2', 'D.K.', 'P3', 'IEP', 'Starts work within 2 minutes of the prompt.', 'tally', [1, 2, 1, 2, 3, 2], 22, 'Progress report', ['Visual timer', 'Check-in at the door']),
    student('s3', 'M.T.', 'P1', '504', 'Uses the graphic organizer before writing.', 'trials', [2, 3, 3, 4], 43, '504 review', ['Graphic organizer', 'Preferential seating']),
    student('s4', 'J.S.', 'P5', 'IEP', 'Uses a break card instead of leaving the room.', 'tally', [1, 1, 2, 2], 60, 'Progress report', ['Break card']),
  ];

  const wk = weekStart(today);
  const cycle = (id: string, date: string, counts: Cycle['counts']): Cycle => ({ id, date, period: 'P3', standardId: 'std-1', counts, moves: { ...DEFAULT_MOVES } });
  d.cycles = [cycle('cy1', addDays(wk, -35), { reteach: 9, practice: 11, extend: 5 }), cycle('cy2', addDays(wk, 1), { reteach: 7, practice: 12, extend: 6 })];

  d.dinners[today] = 'Chicken thighs';
  d.kids = [
    { id: 'k1', name: 'Kid 1', color: 'rose' },
    { id: 'k2', name: 'Kid 2', color: 'teal' },
  ];
  d.board = { date: today, done: { k1: ['r-backpack', 'r-dinner'], k2: ['r-backpack'] }, stars: 11, goal: 20, reward: 'Friday movie night. You pick the movie.' };
  d.focus = [{ taskId: 'demo-9', start: `${today}T06:50:00.000Z`, minutes: 20 }];
  return d;
}

/** The sample person's office week: a standup, a long meeting midweek, and focus time. */
function sampleWorkWeek(): AppData['settings']['schedule'] {
  const blk = (start: string, end: string, label: string, kind: 'meeting' | 'free' | 'break' | 'class') => ({ id: `${start}-${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), start, end, label, kind });
  const day = (extra: ReturnType<typeof blk>[] = []) => [blk('09:00', '09:15', 'Standup', 'meeting'), blk('09:30', '11:30', 'Focus time', 'free'), blk('12:00', '12:45', 'Lunch', 'break'), ...extra];
  return { '1': day([blk('14:00', '15:00', 'Team meeting', 'meeting')]), '2': day(), '3': day([blk('13:00', '16:00', 'Client workshop', 'class')]), '4': day(), '5': day([blk('15:00', '17:00', 'Focus time', 'free')]) };
}
