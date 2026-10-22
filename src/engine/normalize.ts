/** Fills in anything missing from saved data, so older saves keep working as the app grows. */
import { ALL_HATS, HATS } from './hats';
import { freshData } from './seed';
import type { AppData, Task } from './types';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = <T>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);

export function normalizeData(raw: unknown): AppData {
  const base = freshData();
  if (!isObj(raw)) return base;
  const r = raw as Partial<AppData>;
  const settings = { ...base.settings, ...(isObj(r.settings) ? r.settings : {}) };
  settings.notify = { ...base.settings.notify, ...(isObj(r.settings?.notify) ? r.settings!.notify : {}) };
  if (!Array.isArray(settings.workdays)) settings.workdays = base.settings.workdays;
  if (!isObj(settings.schedule)) settings.schedule = base.settings.schedule;
  settings.calendar = { ...base.settings.calendar, ...(isObj(r.settings?.calendar) ? r.settings!.calendar : {}) };

  const savedHats = arr(r.hats, base.hats);
  const hats = ALL_HATS.map(id => {
    const h = savedHats.find(x => x && x.id === id);
    return { id, name: h?.name || HATS[id].name, on: h ? h.on !== false : true };
  });

  const tasks = arr<Task>(r.tasks, []).filter(t => t && typeof t.id === 'string' && typeof t.title === 'string').map((t, i) => ({
    id: t.id,
    title: t.title,
    hat: ALL_HATS.includes(t.hat) ? t.hat : 'teacher',
    date: t.date ?? null,
    time: t.time ?? null,
    minutes: typeof t.minutes === 'number' && t.minutes > 0 ? t.minutes : 10,
    student: t.student ?? null,
    done: !!t.done,
    doneAt: t.doneAt ?? null,
    created: t.created ?? new Date().toISOString(),
    order: typeof t.order === 'number' ? t.order : i,
    deferredAt: t.deferredAt ?? null,
  }));

  return {
    v: 1,
    settings,
    hats,
    tasks,
    students: arr(r.students, base.students).map(s => ({
      ...s,
      goals: arr(s.goals, []),
      accommodations: arr(s.accommodations, []),
      dates: arr(s.dates, []),
      points: arr(s.points, []),
    })),
    standards: arr(r.standards, base.standards),
    cycles: arr(r.cycles, base.cycles),
    meals: arr(r.meals, base.meals),
    dinners: isObj(r.dinners) ? (r.dinners as Record<string, string>) : {},
    chores: arr(r.chores, base.chores),
    kids: arr(r.kids, base.kids),
    routine: arr(r.routine, base.routine),
    board: { ...base.board, ...(isObj(r.board) ? r.board : {}) },
    days: isObj(r.days) ? (r.days as AppData['days']) : {},
    focus: arr(r.focus, []),
  };
}
