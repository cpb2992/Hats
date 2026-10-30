import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addParsed, completeTask, newTask, logPoint, notNow, toggleKidStep, toggleThree, undoPoint, boardFor } from '../actions';
import { addDays, fmtTime, weekStart } from '../dates';
import { normalizeData } from '../normalize';
import { morningBody, planNotifications } from '../notify';
import { guessHat, parseCapture, parseMany, splitCapture } from '../parse';
import { dayTimeline, nowTask, openAtShutdown, queue, weekStats } from '../plan';
import { comingDue, draftReport, summarize } from '../progress';
import { currentBlock, defaultSchedule, isTeaching, nextBoost, nextFree, openTime, sectionNow, sections } from '../schedule';
import { evidenceMonths, monthSummary } from '../pulse';
import { defaultHat, hatName, setHatPrefs, wornHats } from '../hats';
import { shouldAskForReview } from '../review';
import { teacherData, teacherDemo } from './fixture';
import type { AppData } from '../types';
import { logView, nowView } from '../widgets';

// Thursday, October 22, 2026
const TODAY = '2026-10-22';
const NOW = '2026-10-22T07:10:00.000Z';

test('splits a run-on dictation into separate tasks', () => {
  const items = splitCapture('Send the science team the lab-supply list, The dog’s vet visit is Friday, and ask about coverage pay on early-release days.');
  assert.deepEqual(items, ['Send the science team the lab-supply list', 'The dog’s vet visit is Friday', 'Ask about coverage pay on early-release days']);
});

test('keeps short comma lists together', () => {
  assert.deepEqual(splitCapture('Email Sadie, Eva, and Stinfort about the lab'), ['Email Sadie, Eva, and Stinfort about the lab']);
});

test('splits on "and" only before an action', () => {
  assert.deepEqual(splitCapture('Print copies and send the list to the team'), ['Print copies', 'Send the list to the team']);
  assert.deepEqual(splitCapture('Buy salt and pepper'), ['Buy salt and pepper']);
});

test('does not split inside initials', () => {
  assert.deepEqual(splitCapture('Sign the note for A.R. tomorrow'), ['Sign the note for A.R. tomorrow']);
});

test('reads hat, date, time and student', () => {
  const p = parseCapture('IEP meeting for A.R. Nov 2 at 2:45', TODAY, ['A.R.']);
  assert.equal(p.hat, 'sped');
  assert.equal(p.date, '2026-11-02');
  assert.equal(p.time, '14:45');
  assert.equal(p.student, 'A.R.');
  assert.equal(p.title, 'IEP meeting for A.R.');
});

test('weekday names and relative days', () => {
  assert.equal(parseCapture('The dog’s vet visit is Friday', TODAY).date, '2026-10-23');
  assert.equal(parseCapture('The dog’s vet visit is Friday', TODAY).hat, 'home');
  assert.equal(parseCapture('Grade quizzes tomorrow', TODAY).date, '2026-10-23');
  assert.equal(parseCapture('Grade quizzes next week', TODAY).date, '2026-10-26');
  assert.equal(parseCapture('Lab setup on Thursday', TODAY).date, TODAY);
  assert.equal(parseCapture('Lab setup next Thursday', TODAY).date, '2026-10-29');
  assert.equal(parseCapture('Report cards Jan 5', TODAY).date, '2027-01-05');
});

test('times follow the school day', () => {
  assert.equal(parseCapture('Call the office at 3', TODAY).time, '15:00');
  assert.equal(parseCapture('Coffee with Eva at 7:30', TODAY).time, '07:30');
  assert.equal(parseCapture('Dentist 4pm', TODAY).time, '16:00');
  assert.equal(parseCapture('Period 3 copies', TODAY).time, null);
  assert.equal(parseCapture('Score 4 of 5 at 3 of the stations', TODAY).time, null);
});

test('minutes and speech-style initials', () => {
  const p = parseCapture('Write feedback for 20 minutes', TODAY);
  assert.equal(p.minutes, 20);
  assert.equal(p.title, 'Write feedback');
  assert.equal(p.hat, 'mentor');
  const q = parseCapture('progress note for AR', TODAY, ['A.R.']);
  assert.equal(q.student, 'A.R.');
  assert.equal(q.title, 'Progress note for A.R.');
});

test('guesses hats from keywords', () => {
  assert.equal(guessHat('Answer a coverage pay question'), 'union');
  assert.equal(guessHat('Sketch the new book cover'), 'creative');
  assert.equal(guessHat('Send the lab-supply list to the science team'), 'lead');
  assert.equal(guessHat('Something random'), null);
  assert.equal(parseMany('ask about coverage pay, and order ballet tights for Saturday', TODAY).map(p => p.hat).join(','), 'union,parent');
});

function demo(): AppData {
  return teacherDemo(TODAY);
}

test('Now follows the queue: arrived times, then today’s three, then order', () => {
  const d = demo();
  // 7:10am: nothing timed has arrived, so today's first pick is Now.
  assert.equal(nowTask(d, TODAY, 7 * 60 + 10)?.id, 'demo-0');
  // 10:38am: the 10:40 task has arrived.
  assert.equal(nowTask(d, TODAY, 10 * 60 + 38)?.id, 'demo-1');
  const q = queue(d, TODAY, 7 * 60 + 10).map(t => t.id);
  assert.deepEqual(q.slice(0, 3), ['demo-0', 'demo-7', 'demo-4']);
  assert.ok(!q.includes('demo-6'), 'future-dated tasks stay out of today');
  assert.ok(!q.includes('demo-9'), 'done tasks stay out');
});

test('Not now pushes a task behind the rest for today', () => {
  const d = demo();
  notNow(d, 'demo-0', NOW);
  assert.equal(nowTask(d, TODAY, 7 * 60 + 10)?.id, 'demo-7');
  const q = queue(d, TODAY, 7 * 60 + 10).map(t => t.id);
  assert.equal(q[q.length - 1], 'demo-0');
  // Tomorrow it's back to normal.
  assert.equal(queue(d, addDays(TODAY, 1), 7 * 60).some(t => t.id === 'demo-0'), true);
});

test('completing and today’s three', () => {
  const d = demo();
  completeTask(d, 'demo-0', NOW);
  assert.equal(nowTask(d, TODAY, 7 * 60)?.id, 'demo-7');
  assert.equal(toggleThree(d, TODAY, 'demo-4'), true);
  assert.equal(toggleThree(d, TODAY, 'demo-5'), false, 'only three');
});

test('timeline mixes anchors and timed tasks in clock order', () => {
  const d = demo();
  const items = dayTimeline(d, TODAY, 7 * 60 + 10, null);
  const times = items.map(i => i.time);
  assert.deepEqual(times, [...times].sort());
  assert.ok(items.some(i => i.kind === 'anchor' && i.anchor.kind === 'shutdown'));
  assert.ok(items.some(i => i.kind === 'task' && i.task.id === 'demo-1'));
});

test('shutdown lists open school tasks only', () => {
  const d = demo();
  const ids = openAtShutdown(d, TODAY).map(t => t.id);
  assert.ok(ids.includes('demo-1'));
  assert.ok(!ids.includes('demo-5'), 'home tasks are not school work');
});

test('progress summary and drafted report', () => {
  const d = demo();
  const s = d.students[0];
  const sum = summarize(s, s.goals[0]);
  assert.equal(sum.trend, 'up');
  assert.equal(Math.round(sum.baseline! * 5), 1);
  assert.equal(Math.round(sum.recent! * 5), 3);
  const text = draftReport(s, s.goals[0]);
  assert.match(text, /A\.R\. is making steady progress/);
  assert.match(text, /averaged 1 of 5 tries/);
  assert.match(text, /averaged 3 of 5 tries with read-aloud and graphic organizer/);
  assert.equal(comingDue(d.students, TODAY)[0].student.initials, 'A.R.');
});

test('logging and undoing a data point', () => {
  const d = demo();
  const s = d.students[1];
  const before = s.points.length;
  logPoint(d, s.id, s.goals[0].id, TODAY, 1);
  logPoint(d, s.id, s.goals[0].id, TODAY, 1);
  undoPoint(d, s.id, s.goals[0].id, TODAY);
  assert.equal(d.students[1].points.length, before + 1);
});

test('pulse evidence and month summary', () => {
  const d = demo();
  const months = evidenceMonths(d.cycles, TODAY);
  assert.equal(months.length, 10);
  assert.equal(months[0].month, '2026-09');
  assert.equal(months.find(m => m.current)?.month, '2026-10');
  const text = monthSummary(d.cycles, d.standards, '2026-10');
  assert.match(text, /25 exit tickets: 7 reteach \(28%\)/);
});

test('kids board: stars follow checkmarks and nights reset', () => {
  const d = demo();
  const stars = d.board.stars;
  toggleKidStep(d, TODAY, 'k1', 'r-teeth');
  assert.equal(d.board.stars, stars + 1);
  toggleKidStep(d, TODAY, 'k1', 'r-teeth');
  assert.equal(d.board.stars, stars);
  const tomorrow = boardFor(d, addDays(TODAY, 1));
  assert.deepEqual(tomorrow.done, {});
  assert.equal(tomorrow.stars, stars);
});

test('notification plan: morning nudge carries tonight’s dinner', () => {
  const d = teacherData();
  d.dinners[addDays(TODAY, 1)] = 'Salmon';
  const plan = planNotifications(d, new Date(2026, 9, 22, 7, 0), 7);
  const fri = plan.find(p => p.id === 'sync-morning-2026-10-23');
  assert.equal(fri?.body, 'Move the salmon to the fridge, then pick today’s three.');
  assert.ok(!plan.some(p => p.id === 'sync-morning-2026-10-22'), 'past times are skipped');
  assert.ok(plan.some(p => p.id === 'sync-shutdown-2026-10-23' && p.title.includes('end of the week')));
  assert.ok(!plan.some(p => p.id.includes('2026-10-24')), 'no school reminders on Saturday');
  assert.equal(morningBody('Leftovers'), 'Leftovers tonight, nothing to defrost. Pick today’s three.');
});

test('adding parsed tasks and weekly stats', () => {
  const d = teacherData();
  const added = addParsed(d, parseMany('Print the lab sheets, then grade the quizzes for 30 min', TODAY).map(p => ({ ...p, hat: p.hat ?? 'teacher' })), NOW);
  assert.equal(added.length, 2);
  assert.equal(added[1].minutes, 30);
  completeTask(d, added[0].id, NOW);
  const w = weekStats(d, TODAY);
  assert.equal(w.start, weekStart(TODAY));
  assert.equal(w.wins, 1);
  assert.equal(w.byHat[0].hat, 'teacher');
});

test('normalize repairs partial saves', () => {
  const d = normalizeData({ settings: { name: 'Chris' }, tasks: [{ id: 'a', title: 'x', hat: 'nope' }] });
  assert.equal(d.settings.name, 'Chris');
  assert.equal(d.settings.shutdown, '17:00');
  assert.equal(d.tasks[0].hat, 'work');
  assert.equal(d.hats.length, 15);
  assert.equal(fmtTime('16:45'), '4:45');
});


test('bell schedule: Thursday', () => {
  const s = teacherData().settings;
  // Thursday 8:50 is CPT, not prep.
  assert.equal(currentBlock(s, TODAY, 8 * 60 + 50)?.kind, 'meeting');
  // 10:40 Thursday is 7D.
  assert.equal(sectionNow(s, TODAY, 10 * 60 + 40), '7D');
  assert.equal(isTeaching(currentBlock(s, TODAY, 10 * 60 + 40)), true);
  // Next free block after 10:40 is RBR at 11:23.
  assert.equal(nextFree(s, TODAY, 10 * 60 + 40)?.start, '11:23');
  assert.deepEqual(sections(s), ['7A', '7B', '7C', '7D']);
  // Thursday open time: before 8:15, RBR, after dismissal until shutdown (no prep because of CPT).
  assert.deepEqual(openTime(s, TODAY).map(o => o.label), ['Before 8:15', 'RBR', 'After 3:10']);
});

test('bell schedule: Boosts and weekends', () => {
  const s = teacherData().settings;
  assert.deepEqual(nextBoost(s, '7C', TODAY, 8 * 60), { date: '2026-10-23', block: nextBoost(s, '7C', TODAY, 8 * 60)!.block });
  assert.equal(nextBoost(s, '7C', TODAY, 8 * 60)?.block.start, '11:23');
  assert.equal(nextBoost(s, '7B', TODAY, 8 * 60)?.date, '2026-10-27');
  assert.equal(currentBlock(s, '2026-10-24', 10 * 60), null);
  // Monday Period 1 is prep.
  assert.equal(currentBlock(s, '2026-10-26', 9 * 60)?.kind, 'free');
});

test('free-block reminders and the school-day timeline', () => {
  const d = teacherData();
  d.settings.onboarded = true;
  const plan = planNotifications(d, new Date(2026, 9, 22, 7, 0), 2);
  assert.ok(plan.some(p => p.id === 'sync-free-2026-10-22-11:23' && p.title === 'RBR · 53 free minutes'));
  assert.ok(!plan.some(p => p.id === 'sync-free-2026-10-22-08:35'), 'Thursday period 1 is CPT');
  assert.ok(plan.some(p => p.id === 'sync-free-2026-10-23-08:35' && p.title.startsWith('Specialty')));
  const items = dayTimeline(d, TODAY, 10 * 60 + 40, null);
  assert.ok(items.some(i => i.kind === 'block' && i.current && i.block.section === '7D'));
  assert.ok(!items.some(i => i.kind === 'anchor' && i.anchor.kind === 'school'), 'blocks replace the generic school-day anchor');
});


test('Now widget follows the block you are in', () => {
  const d = demo();
  // 10:40 Thursday: teaching 7D, the next task waits for RBR.
  const cls = nowView(d, TODAY, 10 * 60 + 40);
  assert.equal(cls.mode, 'class');
  assert.equal(cls.title, '7D');
  assert.match(cls.waiting ?? '', /^RBR at 11:23: /);
  // 11:30 Thursday: RBR is free, so the task shows with focus sized to the time left.
  const free = nowView(d, TODAY, 11 * 60 + 30);
  assert.equal(free.mode, 'task');
  assert.equal(free.status, 'RBR · 46 min free');
  assert.ok((free.focusMin ?? 0) <= 46);
  // 8:50 Thursday: CPT.
  assert.equal(nowView(d, TODAY, 8 * 60 + 50).mode, 'meeting');
});

test('Caseload widget puts the class in front of you first', () => {
  const d = demo();
  const v = logView(d, TODAY, 10 * 60 + 40);
  assert.equal(v.header, '7D · in class');
  assert.deepEqual(v.students.map(s => s.initials), ['J.S.']);
  const off = logView(d, TODAY, 18 * 60);
  assert.equal(off.header, 'Caseload');
  assert.equal(off.students.length, 4);
  assert.equal(off.students.find(s => s.initials === 'A.R.')?.trials, true);
});

test('hats: only worn hats are guessed, and renamed hats use their new name', () => {
  const d = normalizeData({ hats: [{ id: 'teacher', name: 'Science', on: true }, { id: 'home', name: 'Home', on: true }] });
  setHatPrefs(d.hats);
  try {
    assert.equal(hatName('teacher'), 'Science');
    assert.equal(hatName('union'), 'Union');
    // "coverage" is a Union word, but Union isn't worn.
    assert.equal(guessHat('Answer a coverage pay question'), null);
    assert.equal(guessHat('Grade the quizzes'), 'teacher');
    assert.equal(guessHat('Order groceries'), 'home');
    assert.deepEqual(wornHats(), ['teacher', 'home']);
    assert.equal(defaultHat(), 'teacher');
  } finally {
    setHatPrefs(teacherData().hats);
  }
});

test('a new install starts with a few hats worn, no blocks, and a typical school day ready for teachers', () => {
  const d = normalizeData(null);
  assert.deepEqual(d.hats.filter(h => h.on).map(h => h.id), ['work', 'home', 'wellness']);
  assert.equal(Object.values(d.settings.schedule).flat().length, 0);
  const mon = defaultSchedule()['1'];
  assert.ok(mon.some(x => x.kind === 'free'));
  assert.deepEqual(mon.filter(x => x.kind === 'class').map(x => x.section), ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
});

test('rating prompt: only after real use, and not again for four months', () => {
  const d = teacherData();
  assert.equal(shouldAskForReview(d, TODAY, null), false);
  for (let i = 0; i < 15; i++) newTask(d, { id: `r${i}`, title: `Task ${i}`, hat: 'teacher' }, NOW);
  for (const t of d.tasks) { t.done = true; t.doneAt = NOW; }
  assert.equal(shouldAskForReview(d, TODAY, null), false);
  for (let i = 0; i < 5; i++) d.days[addDays(TODAY, -i)] = { date: addDays(TODAY, -i), recovery: null, three: [], planned: true, shutdown: false };
  assert.equal(shouldAskForReview(d, TODAY, null), true);
  assert.equal(shouldAskForReview(d, TODAY, addDays(TODAY, -30)), false);
  assert.equal(shouldAskForReview(d, TODAY, addDays(TODAY, -121)), true);
});
