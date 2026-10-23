/** Changes to AppData. Each takes the draft to change in place (the store hands over a copy). */
import { dayLog } from './plan';
import type { Parsed } from './parse';
import type { AppData, HatId, HatsEvent, Task } from './types';
import { uid } from './util';

const ensureDay = (d: AppData, date: string) => (d.days[date] = { ...dayLog(d, date) });

export function newTask(d: AppData, fields: Partial<Task> & { title: string; hat: HatId }, nowIso: string): Task {
  const order = d.tasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
  const task: Task = {
    id: uid('t'),
    date: null,
    time: null,
    minutes: 10,
    student: null,
    done: false,
    doneAt: null,
    created: nowIso,
    order,
    deferredAt: null,
    ...fields,
  };
  d.tasks.push(task);
  return task;
}

export function addParsed(d: AppData, items: (Parsed & { hat: HatId })[], nowIso: string): Task[] {
  return items.map(p =>
    newTask(d, { title: p.title, hat: p.hat, date: p.date, time: p.time, minutes: p.minutes ?? 10, student: p.student }, nowIso),
  );
}

export function completeTask(d: AppData, id: string, nowIso: string) {
  const t = d.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = true;
  t.doneAt = nowIso;
  t.deferredAt = null;
}

export function reopenTask(d: AppData, id: string) {
  const t = d.tasks.find(x => x.id === id);
  if (!t) return;
  t.done = false;
  t.doneAt = null;
}

export function notNow(d: AppData, id: string, nowIso: string) {
  const t = d.tasks.find(x => x.id === id);
  if (t) t.deferredAt = nowIso;
}

export function deleteTask(d: AppData, id: string) {
  d.tasks = d.tasks.filter(t => t.id !== id);
  for (const day of Object.values(d.days)) day.three = day.three.filter(x => x !== id);
}

export function toggleThree(d: AppData, date: string, id: string): boolean {
  const day = ensureDay(d, date);
  const at = day.three.indexOf(id);
  if (at !== -1) { day.three.splice(at, 1); return true; }
  if (day.three.length >= 3) return false;
  day.three.push(id);
  return true;
}

export function setRecovery(d: AppData, date: string, value: number | null) {
  ensureDay(d, date).recovery = value == null ? null : Math.max(0, Math.min(100, Math.round(value)));
}

export function markPlanned(d: AppData, date: string) {
  ensureDay(d, date).planned = true;
}

export function setThawed(d: AppData, date: string, on: boolean) {
  ensureDay(d, date).thawed = on;
}

export function markShutdown(d: AppData, date: string) {
  ensureDay(d, date).shutdown = true;
}

export function moveTask(d: AppData, id: string, date: string) {
  const t = d.tasks.find(x => x.id === id);
  if (!t) return;
  t.date = date;
  t.deferredAt = null;
}

export function logPoint(d: AppData, studentId: string, goalId: string, date: string, value: number, outOf?: number) {
  const s = d.students.find(x => x.id === studentId);
  if (!s) return;
  s.points.push(outOf != null ? { goalId, date, value, outOf } : { goalId, date, value });
}

/** Removes the most recent point logged for that goal on that date (Undo). */
export function undoPoint(d: AppData, studentId: string, goalId: string, date: string) {
  const s = d.students.find(x => x.id === studentId);
  if (!s) return;
  for (let i = s.points.length - 1; i >= 0; i--) {
    if (s.points[i].goalId === goalId && s.points[i].date === date) { s.points.splice(i, 1); return; }
  }
}

/** The kids' board with last night's checkmarks cleared (stars carry over). */
export function boardFor(d: AppData, today: string): AppData['board'] {
  return d.board.date === today ? d.board : { ...d.board, date: today, done: {} };
}

export function toggleKidStep(d: AppData, today: string, kidId: string, stepId: string) {
  d.board = { ...boardFor(d, today) };
  const done = { ...d.board.done };
  const list = [...(done[kidId] ?? [])];
  const at = list.indexOf(stepId);
  if (at === -1) { list.push(stepId); d.board.stars = Math.min(d.board.goal, d.board.stars + 1); }
  else { list.splice(at, 1); d.board.stars = Math.max(0, d.board.stars - 1); }
  done[kidId] = list;
  d.board.done = done;
}

export function addKindness(d: AppData, today: string) {
  d.board = { ...boardFor(d, today) };
  d.board.stars = Math.min(d.board.goal, d.board.stars + 1);
}

export function resetStars(d: AppData) {
  d.board = { ...d.board, stars: 0 };
}

export function setDinner(d: AppData, date: string, meal: string | null) {
  if (meal) d.dinners[date] = meal;
  else delete d.dinners[date];
}

export function recordFocus(d: AppData, taskId: string | null, startIso: string, minutes: number) {
  if (minutes < 1) return;
  d.focus.push({ taskId, start: startIso, minutes: Math.round(minutes) });
  if (d.focus.length > 500) d.focus = d.focus.slice(-500);
}

/* Hats' calendar */

export function addEvent(d: AppData, e: Omit<HatsEvent, 'id' | 'created'> & { id?: string }, nowIso: string): HatsEvent {
  const ev: HatsEvent = { ...e, id: e.id ?? uid('e'), created: nowIso };
  d.events.push(ev);
  return ev;
}

export function updateEvent(d: AppData, id: string, patch: Partial<Omit<HatsEvent, 'id' | 'created'>>) {
  d.events = d.events.map(e => (e.id === id ? { ...e, ...patch } : e));
}

export function deleteEvent(d: AppData, id: string) {
  d.events = d.events.filter(e => e.id !== id);
}

/** Puts a deleted event back exactly as it was (Undo). */
export function restoreEvent(d: AppData, ev: HatsEvent) {
  if (!d.events.some(e => e.id === ev.id)) d.events.push({ ...ev });
}

