/** Starting data for a new install, and the sample data behind "Try it with sample data". */
import { addDays, nextWorkday, weekStart } from './dates';
import { ALL_HATS, HATS } from './hats';
import { DEFAULT_MOVES } from './pulse';
import { defaultSchedule } from './schedule';
import type { AppData, Chore, Cycle, KidStep, Student, Task } from './types';

export const DEFAULT_ROUTINE: KidStep[] = [
  { id: 'r-backpack', label: 'Backpack away', icon: 'backpack' },
  { id: 'r-dinner', label: 'Dinner done', icon: 'bowl' },
  { id: 'r-teeth', label: 'Brush teeth', icon: 'tooth' },
  { id: 'r-pjs', label: 'PJs on', icon: 'shirt' },
  { id: 'r-story', label: 'Story time', icon: 'book' },
];

export const DEFAULT_CHORES: Chore[] = [
  { id: 'c-l-mine', label: 'Laundry: mine', days: [1], kind: 'laundry' },
  { id: 'c-l-hers', label: 'Laundry: hers', days: [2], kind: 'laundry' },
  { id: 'c-l-k1', label: 'Laundry: kid 1', days: [3], kind: 'laundry' },
  { id: 'c-l-k2', label: 'Laundry: kid 2', days: [4], kind: 'laundry' },
  { id: 'c-l-k3', label: 'Laundry: kid 3', days: [5], kind: 'laundry' },
  { id: 'c-bedding', label: 'Bedding (monthly)', days: [6], kind: 'laundry' },
  { id: 'c-baths', label: 'Baths', days: [0, 1, 3, 5], kind: 'bath' },
  { id: 'c-cleaners', label: 'Cleaners', days: [2], kind: 'other' },
  { id: 'c-ballet', label: 'Ballet', days: [6], kind: 'other' },
];

export const DEFAULT_MEALS = ['Chicken thighs', 'Ground turkey', 'Salmon', 'Pasta', 'Tacos', 'Leftovers'];

export function freshData(): AppData {
  return {
    v: 1,
    settings: {
      name: '',
      onboarded: false,
      morning: '06:15',
      schoolStart: '06:45',
      shutdown: '16:45',
      pickups: '17:00',
      bedtime: '20:00',
      gym: '20:30',
      workdays: [1, 2, 3, 4, 5],
      notify: { morning: true, shutdown: true, tasks: true, blocks: true },
      schedule: defaultSchedule(),
    },
    hats: ALL_HATS.map(id => ({ id, name: HATS[id].name, on: true })),
    tasks: [],
    students: [],
    standards: [{ id: 'std-1', code: 'MS-PS1-2', text: 'Use data on properties to tell whether a chemical reaction happened.' }],
    cycles: [],
    meals: [...DEFAULT_MEALS],
    dinners: {},
    chores: DEFAULT_CHORES.map(c => ({ ...c, days: [...c.days] })),
    kids: [],
    routine: DEFAULT_ROUTINE.map(r => ({ ...r })),
    board: { date: '', done: {}, stars: 0, goal: 20, reward: 'Friday movie night. You pick the movie.' },
    days: {},
    focus: [],
  };
}

/** A believable week for exploring the app. Initials and names are made up. */
export function makeDemo(today: string, settings?: AppData['settings']): AppData {
  const d = freshData();
  if (settings) d.settings = { ...settings, onboarded: true, notify: { morning: false, shutdown: false, tasks: false, blocks: false } };
  d.settings.name = d.settings.name || 'Chris';
  d.settings.onboarded = true;
  const created = `${today}T06:00:00.000Z`;
  let order = 0;
  const task = (title: string, hat: Task['hat'], minutes: number, extra: Partial<Task> = {}): Task => ({
    id: `demo-${order}`, title, hat, date: today, time: null, minutes, student: null, done: false, doneAt: null, created, order: order++, deferredAt: null, ...extra,
  });
  d.tasks = [
    task('Print the Power Moves research checklists', 'teacher', 5),
    task('Sign the progress note for A.R.', 'sped', 10, { time: '10:40', student: 'A.R.' }),
    task('Send the lab-supply list to the science team', 'dept', 5, { time: '11:50' }),
    task('Answer a member’s coverage-pay question', 'btu', 10, { time: '14:50' }),
    task('Turn observation notes into feedback', 'mentor', 15),
    task('Order new ballet tights', 'home', 3, { time: '20:15' }),
    task('Sketch the new Sandy cover', 'author', 20, { date: addDays(today, 2) }),
    task('Finish the IEP draft for A.R.', 'sped', 25, { student: 'A.R.' }),
    task('Vet appointment', 'home', 30, { date: nextWorkday(today, [5]) }),
    task('Entered October grades', 'teacher', 20, { done: true, doneAt: `${today}T07:05:00.000Z` }),
    task('Replied to the lab safety email', 'dept', 5, { done: true, doneAt: `${today}T07:20:00.000Z` }),
  ];
  d.days[today] = { date: today, recovery: 72, three: ['demo-0', 'demo-7'], planned: true, shutdown: false };

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
    student('s1', 'A.R.', '7C', 'IEP', 'Backs a written claim with evidence in 4 of 5 tries.', 'trials', [1, 1, 2, 2, 3, 2, 3, 3], 11, 'Annual IEP review', ['Read-aloud', 'Graphic organizer', 'Extended time']),
    student('s2', 'D.K.', '7C', 'IEP', 'Starts work within 2 minutes of the prompt.', 'tally', [1, 2, 1, 2, 3, 2], 22, 'Progress report', ['Visual timer', 'Check-in at the door']),
    student('s3', 'M.T.', '7A', '504', 'Uses the graphic organizer before writing.', 'trials', [2, 3, 3, 4], 43, '504 review', ['Graphic organizer', 'Preferential seating']),
    student('s4', 'J.S.', '7D', 'IEP', 'Uses a break card instead of leaving the room.', 'tally', [1, 1, 2, 2], 60, 'Progress report', ['Break card']),
  ];

  const wk = weekStart(today);
  const cycle = (id: string, date: string, counts: Cycle['counts']): Cycle => ({ id, date, period: '7C', standardId: 'std-1', counts, moves: { ...DEFAULT_MOVES } });
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
