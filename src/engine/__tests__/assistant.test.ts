import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addEvent, newTask } from '../actions';
import { buildContext, checkActions, readWithoutClaude, type RawAction, type Situation } from '../assistant';
import { minutesOf } from '../dates';
import { choresOn, materializeChores } from '../rhythm';
import { applyRoster, parseRoster } from '../roster';
import { teacherData } from './fixture';
import { planNotifications } from '../notify';
import { agenda, dayTimeline, queue } from '../plan';
import type { AppData } from '../types';

// Thursday, October 22, 2026. 7A is in Period 6 (13:15-14:08) on Thursdays.
const TODAY = '2026-10-22';
const NOW_ISO = '2026-10-22T17:00:00.000Z';

function world(nowMin = 13 * 60 + 39): Situation {
  const data: AppData = teacherData();
  data.settings.onboarded = true;
  applyRoster(data, parseRoster(`A.R. 7A IEP\ngoal: CER, 4 of 5\n\nA.R. 7D IEP\ngoal: break card 3 times a day\n\nD.W. 7A IEP\ngoal: starts tasks, 3 of 4\n\nE.R. 7C 504: extended time`, TODAY).students);
  newTask(data, { id: 't-report', title: 'Draft the progress report for D.W.', hat: 'sped' }, NOW_ISO);
  newTask(data, { id: 't-lab', title: 'Email Sadie the lab list', hat: 'lead' }, NOW_ISO);
  addEvent(data, { id: 'ev-1', title: 'Staff meeting', date: '2026-10-23', start: '15:15', end: '16:15', allDay: false, location: 'Library', note: '', hat: 'lead' }, NOW_ISO);
  addEvent(data, { id: 'ev-2', title: 'Half day', date: '2026-10-26', start: null, end: null, allDay: true, location: '', note: '', hat: 'teacher' }, NOW_ISO);
  return { data, today: TODAY, nowMin, recent: [] };
}

const raw = (p: Partial<RawAction>): RawAction => ({ kind: 'task', title: '', hat: '', date: '', start: '', end: '', allDay: false, minutes: 0, location: '', note: '', student: '', studentClass: '', value: 0, ref: '', ...p });

test('the context tells Claude what is happening right now', () => {
  const ctx = buildContext(world());
  assert.match(ctx, /NOW: Thursday 2026-10-22, 13:39/);
  assert.match(ctx, /RIGHT NOW: Teaching: 7A until 14:08/);
  assert.match(ctx, /HATS CALENDAR/);
  assert.match(ctx, /ref=ev-1 \| Fri 2026-10-23 15:15-16:15 \| Staff meeting @ Library/);
  assert.match(ctx, /ref=ev-2 \| Mon 2026-10-26 all day \| Half day/);
  assert.match(ctx, /ref=t-lab \| Email Sadie the lab list/);
  assert.match(ctx, /A\.R\. 7D IEP \| goal logged as \+1/);
  assert.doesNotMatch(ctx, /extended time/, 'accommodations stay on the phone');
});

test('events get sensible lengths, dates and all-day handling', () => {
  const s = world();
  const { actions } = checkActions([
    raw({ kind: 'event', title: 'IEP meeting · J.M.', date: '2026-10-29', start: '9:30', hat: 'sped' }),
    raw({ kind: 'event', title: 'Call with Sadie', date: 'next week', start: '15:20', hat: 'nonsense' }),
    raw({ kind: 'event', title: 'Field trip', date: '2026-11-06', allDay: true }),
  ], s);
  assert.deepEqual(actions.map(a => a.kind === 'event' && [a.date, a.start, a.end, a.allDay, a.hat]), [
    ['2026-10-29', '09:30', '10:30', false, 'sped'],
    [TODAY, '15:20', '15:50', false, 'teacher'],
    ['2026-11-06', null, null, true, 'teacher'],
  ]);
});

test('a data point goes to the student in the class being taught', () => {
  const s = world();
  const { actions } = checkActions([raw({ kind: 'log', student: 'AR', value: 4 }), raw({ kind: 'log', student: 'A.R.', studentClass: '7D', value: 1 })], s);
  const [a, b] = actions;
  assert.ok(a.kind === 'log' && b.kind === 'log');
  assert.equal(s.data.students.find(x => x.id === a.studentId)?.period, '7A');
  assert.deepEqual([a.goalKind, a.value, a.outOf], ['trials', 4, 5]);
  assert.equal(s.data.students.find(x => x.id === b.studentId)?.period, '7D');
  assert.deepEqual([b.goalKind, b.value], ['tally', 1]);
});

test('logs for unknown students or 504s without goals are refused with a note', () => {
  const { actions, notes } = checkActions([raw({ kind: 'log', student: 'Z.Z.', value: 1 }), raw({ kind: 'log', student: 'E.R.', value: 1 })], world());
  assert.equal(actions.length, 0);
  assert.equal(notes.length, 2);
});

test('done, move and cancel only touch things that exist and can change', () => {
  const s = world();
  const { actions, notes } = checkActions([
    raw({ kind: 'done', ref: 't-lab' }),
    raw({ kind: 'done', title: 'progress report for D.W.' }),
    raw({ kind: 'move', ref: 'ev-1', date: '2026-10-27', start: '14:15' }),
    raw({ kind: 'cancel', ref: 'ev-2' }),
    raw({ kind: 'cancel', title: 'the bus duty' }),
  ], s);
  assert.deepEqual(actions.map(a => a.kind), ['done', 'done', 'move', 'cancel']);
  const move = actions[2];
  assert.ok(move.kind === 'move');
  assert.deepEqual([move.date, move.start, move.end], ['2026-10-27', '14:15', '15:15'], 'keeps the hour length');
  assert.equal(notes.length, 1, 'an event that isn’t on the calendar is refused');
});

test('without Claude: meetings become events, using the school day', () => {
  const s = world(17 * 60);
  const { actions } = checkActions(readWithoutClaude('Team meeting after school Friday, email Sadie about goggles, dentist appointment Nov 3 at 4pm', s).actions, s);
  assert.equal(actions.length, 3);
  const [meeting, email, dentist] = actions;
  assert.ok(meeting.kind === 'event');
  assert.equal(meeting.date, '2026-10-23');
  assert.equal(meeting.start, '15:10', 'after school = when dismissal ends');
  assert.equal(email.kind, 'task');
  assert.ok(dentist.kind === 'event');
  assert.deepEqual([dentist.date, dentist.start, dentist.end], ['2026-11-03', '16:00', '17:00']);
});

test('without Claude: data points and finished tasks', () => {
  const s = world();
  const { actions } = checkActions(readWithoutClaude('4 out of 5 for A.R.', s).actions, s);
  assert.equal(actions[0].kind, 'log');
  const done = checkActions(readWithoutClaude('finished the progress report for D.W.', s).actions, s).actions;
  assert.deepEqual(done.map(a => a.kind === 'done' && a.taskId), ['t-report']);
});

test('the weekly rhythm becomes Home tasks timed around the day', () => {
  const d = teacherData();
  const monday = '2026-10-19';
  assert.equal(materializeChores(d, monday, NOW_ISO), true);
  const made = d.tasks.filter(t => t.date === monday);
  const laundry = made.find(t => t.title === 'Laundry: mine');
  const baths = made.find(t => t.title === 'Baths');
  assert.ok(laundry && baths);
  assert.equal(laundry.hat, 'home');
  assert.equal(laundry.time, '18:00', 'an hour after pickups');
  assert.equal(baths.time, '19:00', 'an hour before bedtime');
  assert.equal(materializeChores(d, monday, NOW_ISO), false, 'only once a day');
  d.tasks = d.tasks.filter(t => t.id !== laundry.id);
  materializeChores(d, monday, NOW_ISO);
  assert.ok(!d.tasks.some(t => t.title === 'Laundry: mine' && t.date === monday), 'a deleted one stays deleted');
  materializeChores(d, '2026-10-20', NOW_ISO);
  assert.ok(!d.tasks.some(t => t.date === monday && !t.done), 'yesterday’s undone rhythm tasks clear away');
  assert.ok(d.tasks.some(t => t.title === 'Laundry: hers' && t.date === '2026-10-20'));
});

test('monthly rhythm items land only on the first one of the month', () => {
  const d = teacherData();
  assert.ok(choresOn(d.chores, '2026-11-07').some(c => c.label.startsWith('Bedding')));
  assert.ok(!choresOn(d.chores, '2026-11-14').some(c => c.label.startsWith('Bedding')));
});

test('school work comes first at school, home work after shutdown', () => {
  const d = teacherData();
  newTask(d, { id: 'home-1', title: 'Order the birthday cake', hat: 'home' }, '2026-10-22T05:00:00.000Z');
  newTask(d, { id: 'school-1', title: 'Grade the quizzes', hat: 'teacher' }, '2026-10-22T06:00:00.000Z');
  newTask(d, { id: 'timed-1', title: 'Call the pediatrician', hat: 'home', time: '10:00', date: TODAY }, '2026-10-22T06:00:00.000Z');
  assert.deepEqual(queue(d, TODAY, minutesOf('09:00')).map(t => t.id).slice(0, 2), ['school-1', 'home-1']);
  assert.equal(queue(d, TODAY, minutesOf('10:02'))[0].id, 'timed-1', 'a timed task whose time has come still surfaces');
  assert.deepEqual(queue(d, TODAY, minutesOf('18:00')).map(t => t.id).slice(0, 2), ['timed-1', 'home-1']);
  assert.deepEqual(queue(d, '2026-10-24', minutesOf('09:00')).map(t => t.id), ['home-1', 'school-1', 'timed-1'], 'days off: your own order');
});

test('Hats calendar events and caseload dates show in the day and on the calendar', () => {
  const s = world(14 * 60);
  const day = dayTimeline(s.data, '2026-10-23', 10 * 60);
  assert.ok(day.some(i => i.kind === 'event' && i.event.title === 'Staff meeting' && !i.past));
  const s2 = world();
  s2.data.students[0].dates.push({ id: 'k1', label: 'Annual review', date: '2026-10-27' });
  const tue = agenda(s2.data, '2026-10-27', TODAY, 14 * 60);
  assert.ok(tue.some(i => i.kind === 'keydate' && i.keyDate.label === 'Annual review'));
  assert.ok(tue.some(i => i.kind === 'block'), 'a school day shows its bells');
  const past = agenda(s2.data, '2026-10-23', TODAY, 14 * 60).find(i => i.kind === 'event');
  assert.equal(past?.past, false, 'tomorrow is never past');
});

test('event reminders: 15 minutes before, all-day ones with the morning plan', () => {
  const s = world();
  const plan = planNotifications(s.data, new Date('2026-10-22T20:00:00'), 7);
  const staff = plan.find(p => p.id === 'sync-event-ev-1');
  assert.ok(staff);
  assert.equal(staff.at.getHours() * 60 + staff.at.getMinutes(), 15 * 60, '3:00 for a 3:15 meeting');
  const half = plan.find(p => p.id === 'sync-event-ev-2');
  assert.equal(half?.at.getHours(), 6);
  s.data.settings.notify.events = false;
  assert.ok(!planNotifications(s.data, new Date('2026-10-22T20:00:00'), 7).some(p => p.id.startsWith('sync-event')));
});
