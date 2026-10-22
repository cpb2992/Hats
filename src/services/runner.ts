/** Makes the actions happen: calendar events on the phone, tasks and data points in Hats. Each result can be undone. */
import { completeTask, newTask, reopenTask, undoPoint, logPoint } from '../engine/actions';
import { describeWhen, type Action, type Recent } from '../engine/assistant';
import type { AppData, HatId } from '../engine/types';
import { uid } from '../engine/util';
import type { IconName } from '../ui/icons';
import { createEvent, deleteEvent, moveEvent } from './calendar';

export interface Outcome {
  key: string;
  icon: IconName;
  title: string;
  detail: string;
  state: 'done' | 'ask' | 'failed' | 'undone';
  undo?: () => Promise<void>;
  /** For cancelling an event: runs only after Chris taps Delete. */
  confirm?: () => Promise<Outcome>;
  recent?: Recent;
}

interface Deps {
  mutate: (fn: (d: AppData) => void) => void;
  today: string;
  calendar: { id: string; name: string } | null;
}

const nowIso = () => new Date().toISOString();

function addTask(deps: Deps, a: { title: string; hat: HatId; date: string | null; time: string | null; minutes: number; student: string | null }): string {
  const id = uid('t');
  deps.mutate(d => { newTask(d, { id, title: a.title, hat: a.hat, date: a.date, time: a.time, minutes: a.minutes, student: a.student }, nowIso()); });
  return id;
}

const removeTask = (deps: Deps, id: string) => async () => { deps.mutate(d => { d.tasks = d.tasks.filter(t => t.id !== id); }); };

export async function runActions(actions: Action[], deps: Deps): Promise<Outcome[]> {
  const out: Outcome[] = [];
  for (const [i, a] of actions.entries()) {
    const key = `${i}-${a.kind}`;
    try {
      if (a.kind === 'event') {
        const when = a.allDay ? `${describeWhen(a.date, null, deps.today)}, all day` : describeWhen(a.date, a.start, deps.today, a.end);
        if (!deps.calendar) {
          const id = addTask(deps, { title: a.title, hat: a.hat, date: a.date, time: a.start, minutes: 10, student: null });
          out.push({ key, icon: 'clock', title: a.title, detail: `${when} · saved as a reminder. Connect your calendar in Settings to add events there.`, state: 'done', undo: removeTask(deps, id), recent: { kind: 'task', title: a.title, ref: id, when } });
          continue;
        }
        const cal = deps.calendar;
        const id = await createEvent(cal.id, a);
        out.push({ key, icon: 'calendar', title: a.title, detail: `${when} · ${cal.name}`, state: 'done', undo: () => deleteEvent(id), recent: { kind: 'event', title: a.title, ref: id, when } });
      } else if (a.kind === 'task') {
        const id = addTask(deps, a);
        const when = a.time ? `Reminder ${describeWhen(a.date, a.time, deps.today)}` : a.date ? describeWhen(a.date, null, deps.today) : 'Today';
        out.push({ key, icon: 'check', title: a.title, detail: when, state: 'done', undo: removeTask(deps, id), recent: { kind: 'task', title: a.title, ref: id, when } });
      } else if (a.kind === 'log') {
        const times = a.goalKind === 'tally' ? a.value : 1;
        deps.mutate(d => { for (let n = 0; n < times; n++) logPoint(d, a.studentId, a.goalId, deps.today, a.goalKind === 'trials' ? a.value : 1, a.goalKind === 'trials' ? a.outOf : undefined); });
        const label = a.goalKind === 'trials' ? `${a.value} of ${a.outOf}` : `+${a.value}`;
        out.push({ key, icon: 'people', title: `Logged ${label} for ${a.initials}`, detail: 'Caseload', state: 'done', undo: async () => { deps.mutate(d => { for (let n = 0; n < times; n++) undoPoint(d, a.studentId, a.goalId, deps.today); }); }, recent: { kind: 'log', title: `${label} for ${a.initials}`, ref: '', when: 'today' } });
      } else if (a.kind === 'done') {
        deps.mutate(d => completeTask(d, a.taskId, nowIso()));
        out.push({ key, icon: 'check', title: a.title, detail: 'Checked off', state: 'done', undo: async () => { deps.mutate(d => reopenTask(d, a.taskId)); }, recent: { kind: 'done', title: a.title, ref: a.taskId, when: 'today' } });
      } else if (a.kind === 'move') {
        await moveEvent(a.eventId, a);
        const when = a.allDay ? describeWhen(a.date, null, deps.today) : describeWhen(a.date, a.start, deps.today);
        const from = a.from;
        out.push({ key, icon: 'calendar', title: a.title, detail: `Moved to ${when}`, state: 'done', undo: () => moveEvent(a.eventId, { date: from.date, start: from.start, end: from.end, allDay: from.allDay }), recent: { kind: 'move', title: a.title, ref: a.eventId, when } });
      } else if (a.kind === 'cancel') {
        const from = a.from;
        const when = from.allDay ? describeWhen(from.date, null, deps.today) : describeWhen(from.date, from.start, deps.today);
        out.push({
          key, icon: 'trash', title: a.title, detail: `${when} · tap Delete to take it off your calendar`, state: 'ask',
          confirm: async () => {
            await deleteEvent(a.eventId);
            return {
              key, icon: 'trash', title: a.title, detail: `Deleted from ${from.calendar || 'your calendar'}`, state: 'done',
              undo: async () => { await createEvent(from.calendarId, { title: from.title, date: from.date, start: from.start, end: from.end, allDay: from.allDay, location: from.location }); },
              recent: { kind: 'cancel', title: a.title, ref: '', when },
            };
          },
        });
      }
    } catch {
      out.push({ key, icon: 'close', title: 'title' in a ? a.title : 'That one', detail: a.kind === 'event' || a.kind === 'move' || a.kind === 'cancel' ? 'Your calendar didn’t accept that change.' : 'Couldn’t do that one.', state: 'failed' });
    }
  }
  return out;
}
