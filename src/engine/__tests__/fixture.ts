/**
 * A real teacher's week, kept as a fixed test fixture: a rotating bell schedule with prep, Boost and
 * advisory blocks, every hat worn, and a fuller weekly rhythm. The app's own defaults are generic and
 * may change; the tests run against this so they keep checking the hard cases.
 */
import { addDays, nextWorkday } from '../dates';
import { ALL_HATS, HATS, setHatPrefs } from '../hats';
import { freshData, makeDemo } from '../seed';
import type { AppData, Block, BlockKind, Task } from '../types';

const b = (start: string, end: string, label: string, kind: BlockKind, section?: string): Block => ({
  id: `${start}-${label}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
  start, end, label, kind, ...(section ? { section } : {}),
});

function day(p2: string, p3: string, p4: Block, p5top: Block, p6: string, p7: string, p1: Block): Block[] {
  return [
    b('08:15', '08:35', 'Homeroom', 'homeroom'),
    p1,
    b('09:31', '10:24', p2, 'class', p2),
    b('10:27', '11:20', p3, 'class', p3),
    p4,
    p5top,
    b('12:45', '13:12', 'Lunch', 'break'),
    b('13:15', '14:08', p6, 'class', p6),
    b('14:11', '15:05', p7, 'class', p7),
    b('15:05', '15:10', 'Dismissal', 'break'),
  ];
}

const prep = b('08:35', '09:28', 'Specialty · prep', 'free');
const cpt = b('08:35', '09:28', 'CPT · science dept', 'meeting');
const rbr = b('11:23', '12:16', 'RBR · off', 'free');
const boost = (s: string) => b('11:23', '12:16', `${s} Boost`, 'boost', s);
const recess = b('12:19', '12:45', 'Recess', 'break');
const advisory = b('12:19', '12:45', 'Advisory', 'advisory');

export function teacherSchedule(): Record<string, Block[]> {
  return {
    '1': day('7A', '7C', rbr, recess, '7B', '7D', prep),
    '2': day('7B', '7D', boost('7B'), advisory, '7A', '7C', prep),
    '3': day('7A', '7C', boost('7A'), recess, '7B', '7D', prep),
    '4': day('7B', '7D', rbr, advisory, '7A', '7C', cpt),
    '5': day('7A', '7C', boost('7C'), recess, '7B', '7D', prep),
  };
}

function shape(d: AppData): AppData {
  d.settings.schedule = teacherSchedule();
  d.settings.schoolStart = '06:45';
  d.settings.shutdown = '16:45';
  d.hats = ALL_HATS.map(id => ({ id, name: HATS[id].name, on: true }));
  d.chores = [
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
  setHatPrefs(d.hats);
  return d;
}

/** A fresh install shaped like the fixture teacher's week. */
export const teacherData = (): AppData => shape(freshData());

/** The sample week used by the planning tests. */
export function teacherDemo(today: string): AppData {
  const d = shape(makeDemo(today));
  d.settings.name = 'Chris';
  const created = `${today}T06:00:00.000Z`;
  let order = 0;
  const task = (title: string, hat: Task['hat'], minutes: number, extra: Partial<Task> = {}): Task => ({
    id: `demo-${order}`, title, hat, date: today, time: null, minutes, student: null, done: false, doneAt: null, created, order: order++, deferredAt: null, ...extra,
  });
  d.tasks = [
    task('Print the research checklists', 'teacher', 5),
    task('Sign the progress note for A.R.', 'sped', 10, { time: '10:40', student: 'A.R.' }),
    task('Send the lab-supply list to the science team', 'lead', 5, { time: '11:50' }),
    task('Answer a member’s coverage-pay question', 'union', 10, { time: '14:50' }),
    task('Turn observation notes into feedback', 'mentor', 15),
    task('Order new ballet tights', 'home', 3, { time: '20:15' }),
    task('Sketch the new book cover', 'creative', 20, { date: addDays(today, 2) }),
    task('Finish the IEP draft for A.R.', 'sped', 25, { student: 'A.R.' }),
    task('Vet appointment', 'home', 30, { date: nextWorkday(today, [5]) }),
    task('Entered October grades', 'teacher', 20, { done: true, doneAt: `${today}T07:05:00.000Z` }),
    task('Replied to the lab safety email', 'lead', 5, { done: true, doneAt: `${today}T07:20:00.000Z` }),
  ];
  d.packs = [];
  d.days[today] = { ...d.days[today], three: ['demo-0', 'demo-7'] };
  for (const st of d.students) st.period = ({ P3: '7C', P1: '7A', P5: '7D' } as Record<string, string>)[st.period] ?? st.period;
  for (const c of d.cycles) c.period = '7C';
  return d;
}
