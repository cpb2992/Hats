/** Makes the actions happen in Hats: calendar events, tasks, data points, checked-off tasks. Each result can be undone. */
import { addEvent, completeTask, deleteEvent, logPoint, newTask, reopenTask, restoreEvent, undoPoint, updateEvent } from '../engine/actions';
import { describeWhen, type Action, type Recent } from '../engine/assistant';
import type { AppData, HatId } from '../engine/types';
import { uid } from '../engine/util';
import type { IconName } from '../ui/icons';

export interface Outcome {
  key: string;
  icon: IconName;
  title: string;
  detail: string;
  state: 'done' | 'failed' | 'undone';
  undo?: () => void;
  /** Where tapping the row goes. */
  href?: string;
  recent?: Recent;
}

interface Deps {
  mutate: (fn: (d: AppData) => void) => void;
  today: string;
}

const nowIso = () => new Date().toISOString();

export function runActions(actions: Action[], deps: Deps): Outcome[] {
  const { mutate, today } = deps;
  const out: Outcome[] = [];
  for (const [i, a] of actions.entries()) {
    const key = `${i}-${a.kind}`;
    try {
      if (a.kind === 'event') {
        const id = uid('e');
        mutate(d => { addEvent(d, { id, title: a.title, date: a.date, start: a.start, end: a.end, allDay: a.allDay, location: a.location, note: a.note, hat: a.hat }, nowIso()); });
        const when = a.allDay ? `${describeWhen(a.date, null, today)}, all day` : describeWhen(a.date, a.start, today, a.end);
        out.push({ key, icon: 'calendar', title: a.title, detail: `${when}${a.location ? ` · ${a.location}` : ''}`, state: 'done', href: `/event/${id}`, undo: () => mutate(d => deleteEvent(d, id)), recent: { kind: 'event', title: a.title, ref: id, when } });
      } else if (a.kind === 'task') {
        const id = uid('t');
        const hat: HatId = a.hat;
        mutate(d => { newTask(d, { id, title: a.title, hat, date: a.date, time: a.time, minutes: a.minutes, student: a.student }, nowIso()); });
        const when = a.time ? `Reminder ${describeWhen(a.date, a.time, today)}` : a.date ? describeWhen(a.date, null, today) : 'Today';
        out.push({ key, icon: 'check', title: a.title, detail: when, state: 'done', href: `/task/${id}`, undo: () => mutate(d => { d.tasks = d.tasks.filter(t => t.id !== id); }), recent: { kind: 'task', title: a.title, ref: id, when } });
      } else if (a.kind === 'log') {
        const times = a.goalKind === 'tally' ? a.value : 1;
        mutate(d => { for (let n = 0; n < times; n++) logPoint(d, a.studentId, a.goalId, today, a.goalKind === 'trials' ? a.value : 1, a.goalKind === 'trials' ? a.outOf : undefined); });
        const label = a.goalKind === 'trials' ? `${a.value} of ${a.outOf}` : `+${a.value}`;
        out.push({ key, icon: 'people', title: `Logged ${label} for ${a.initials}`, detail: 'Caseload', state: 'done', href: `/student/${a.studentId}`, undo: () => mutate(d => { for (let n = 0; n < times; n++) undoPoint(d, a.studentId, a.goalId, today); }), recent: { kind: 'log', title: `${label} for ${a.initials}`, ref: '', when: 'today' } });
      } else if (a.kind === 'done') {
        mutate(d => completeTask(d, a.taskId, nowIso()));
        out.push({ key, icon: 'check', title: a.title, detail: 'Checked off', state: 'done', undo: () => mutate(d => reopenTask(d, a.taskId)), recent: { kind: 'done', title: a.title, ref: a.taskId, when: 'today' } });
      } else if (a.kind === 'move') {
        const from = a.from;
        mutate(d => updateEvent(d, a.eventId, { date: a.date, start: a.start, end: a.end, allDay: a.allDay }));
        const when = a.allDay ? describeWhen(a.date, null, today) : describeWhen(a.date, a.start, today, a.end);
        out.push({ key, icon: 'calendar', title: a.title, detail: `Moved to ${when}`, state: 'done', href: `/event/${a.eventId}`, undo: () => mutate(d => updateEvent(d, a.eventId, { date: from.date, start: from.start, end: from.end, allDay: from.allDay })), recent: { kind: 'move', title: a.title, ref: a.eventId, when } });
      } else if (a.kind === 'cancel') {
        const from = a.from;
        mutate(d => deleteEvent(d, a.eventId));
        const when = from.allDay ? describeWhen(from.date, null, today) : describeWhen(from.date, from.start, today);
        out.push({ key, icon: 'trash', title: a.title, detail: `Taken off your calendar (${when})`, state: 'done', undo: () => mutate(d => restoreEvent(d, from)), recent: { kind: 'cancel', title: a.title, ref: '', when } });
      }
    } catch {
      out.push({ key, icon: 'close', title: 'title' in a ? a.title : 'That one', detail: 'Couldn’t do that one.', state: 'failed' });
    }
  }
  return out;
}
