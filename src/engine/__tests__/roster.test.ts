import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRoster, matchExisting, parseRoster } from '../roster';
import { teacherData } from './fixture';

const TODAY = '2026-10-22';

test('reads a block per student: goals, accommodations and dates', () => {
  const { students, skipped } = parseRoster(`J.S. 7A IEP
goal: writes a CER paragraph with evidence, 4 of 5 tries
goal: uses a break card 3 times a day
- graphic organizer
- read-aloud for tests
annual review 3/12

A.R. 7C 504: extended time, preferential seating
504 meeting 2/4`, TODAY);
  assert.deepEqual(skipped, []);
  assert.equal(students.length, 2);
  const [js, ar] = students;
  assert.equal(js.initials, 'J.S.');
  assert.equal(js.period, '7A');
  assert.equal(js.plan, 'IEP');
  assert.equal(js.goals.length, 2);
  assert.deepEqual([js.goals[0].kind, js.goals[0].target, js.goals[0].outOf], ['trials', 4, 5]);
  assert.equal(js.goals[0].text, 'writes a CER paragraph with evidence, 4 of 5 tries');
  assert.deepEqual([js.goals[1].kind, js.goals[1].target], ['tally', 3]);
  assert.deepEqual(js.accommodations, ['graphic organizer', 'read-aloud for tests']);
  assert.deepEqual(js.dates.map(d => [d.label, d.date]), [['Annual review', '2027-03-12']]);
  assert.equal(ar.plan, '504');
  assert.deepEqual(ar.accommodations, ['extended time', 'preferential seating']);
  assert.deepEqual(ar.dates.map(d => [d.label, d.date]), [['504 meeting', '2027-02-04']]);
  assert.deepEqual(ar.goals, []);
});

test('one line per student works for a quick roster', () => {
  const { students } = parseRoster('J.S. 7A IEP\nA.R. 7C 504\nDK 7B IEP\nm.t. 7d 504', TODAY);
  assert.deepEqual(students.map(s => [s.initials, s.period, s.plan]), [['J.S.', '7A', 'IEP'], ['A.R.', '7C', '504'], ['D.K.', '7B', 'IEP'], ['M.T.', '7D', '504']]);
});

test('full names become initials and say so', () => {
  const { students } = parseRoster('John Smith 7A IEP\nAna Li, 7C, 504\nJ. Rivera - 7B - 504', TODAY);
  assert.deepEqual(students.map(s => s.initials), ['J.S.', 'A.L.', 'J.R.']);
  assert.ok(students.every(s => s.notes.includes('Name changed to initials')));
  assert.deepEqual(students.map(s => s.period), ['7A', '7C', '7B']);
});

test('class and plan can come first', () => {
  const { students } = parseRoster('7A J.S. IEP\n7C - A.R. - 504', TODAY);
  assert.deepEqual(students.map(s => [s.initials, s.period, s.plan]), [['J.S.', '7A', 'IEP'], ['A.R.', '7C', '504']]);
});

test('lines that mention IEP or 504 under a student stay with that student', () => {
  const { students } = parseRoster('J.S. 7A IEP\nIEP annual review 3/12\n504 meeting 2/4\nAnnual review 4/1', TODAY);
  assert.equal(students.length, 1);
  assert.deepEqual(students[0].dates.map(d => d.label), ['IEP annual review', '504 meeting', 'Annual review']);
});

test('blank lines inside a student keep the lines with that student', () => {
  const { students, skipped } = parseRoster('J.S. 7A IEP\ngoal: CER paragraph, 4 of 5\n\n- extended time\n- read aloud\n\nA.R. 7C 504\n- breaks', TODAY);
  assert.deepEqual(skipped, []);
  assert.deepEqual(students[0].accommodations, ['extended time', 'read aloud']);
  assert.deepEqual(students[1].accommodations, ['breaks']);
});

test('accommodations with numbers stay accommodations', () => {
  const { students } = parseRoster('A.R. 7C 504\n- extended time 1.5x\n- time and 1/2 on tests\n- breaks 2 times per class', TODAY);
  assert.deepEqual(students[0].accommodations, ['extended time 1.5x', 'time and 1/2 on tests', 'breaks 2 times per class']);
  assert.deepEqual(students[0].dates, []);
  assert.deepEqual(students[0].goals, []);
});

test('measured lines on an IEP become goals without the goal: label', () => {
  const { students } = parseRoster('J.S. 7A IEP\nWill cite 2 pieces of evidence in 4 out of 5 trials\nWill stay on task with 80% accuracy\n- calculator', TODAY);
  const [s] = students;
  assert.equal(s.goals.length, 2);
  assert.deepEqual([s.goals[1].target, s.goals[1].outOf], [8, 10]);
  assert.deepEqual(s.accommodations, ['calculator']);
});

test('dates in many shapes', () => {
  const { students } = parseRoster('J.S. 7A IEP\nRe-eval: May 20, 2027\nAnnual review 3/12/27\nProgress report due Jan 15\nTriennial 2028-01-09\nannual 9/1', TODAY);
  assert.deepEqual(students[0].dates.map(d => d.date), ['2027-05-20', '2027-03-12', '2027-01-15', '2028-01-09', '2027-09-01']);
  assert.deepEqual(students[0].dates.map(d => d.label), ['Re-eval', 'Annual review', 'Progress report', 'Triennial', 'Annual']);
});

test('rows pasted from a spreadsheet, with column names', () => {
  const sheet = [
    'Student\tClass\tPlan\tAccommodations\tAnnual review',
    'J.S.\t7A\tIEP\tGraphic organizer; Read-aloud\t3/12/27',
    'Ana Li\t7C\t504\tExtended time, Preferential seating\t2/4/27',
  ].join('\n');
  const { students } = parseRoster(sheet, TODAY);
  assert.equal(students.length, 2);
  assert.deepEqual(students.map(s => [s.initials, s.period, s.plan]), [['J.S.', '7A', 'IEP'], ['A.L.', '7C', '504']]);
  assert.deepEqual(students[0].accommodations, ['Graphic organizer', 'Read-aloud']);
  assert.deepEqual(students[1].dates.map(d => [d.label, d.date]), [['Annual review', '2027-02-04']]);
});

test('rows pasted from a spreadsheet without column names', () => {
  const { students } = parseRoster('J.S.\t7A\tIEP\tGraphic organizer; Breaks\nA.R.\t7C\t504\tExtended time', TODAY);
  assert.deepEqual(students.map(s => [s.initials, s.period, s.plan, s.accommodations.length]), [['J.S.', '7A', 'IEP', 2], ['A.R.', '7C', '504', 1]]);
});

test('lines before any student are reported, not lost silently', () => {
  const { students, skipped } = parseRoster('My caseload for this year\nJ.S. 7A IEP', TODAY);
  assert.equal(students.length, 1);
  assert.deepEqual(skipped, ['My caseload for this year']);
});

test('missing plan and class are filled in and flagged', () => {
  const { students } = parseRoster('J.S.\n- extended time\n\nA.R.\ngoal: CER, 3 of 5', TODAY);
  assert.equal(students[0].plan, '504');
  assert.equal(students[1].plan, 'IEP');
  assert.ok(students[0].notes.some(n => n.startsWith('Plan not given')));
  assert.ok(students[0].notes.includes('No class given'));
});

test('the same student twice becomes one', () => {
  const { students } = parseRoster('J.S. 7A IEP\n- calculator\nJ.S. 7A IEP\n- calculator\n- breaks', TODAY);
  assert.equal(students.length, 1);
  assert.deepEqual(students[0].accommodations, ['calculator', 'breaks']);
});

test('applying adds new students and fills in existing ones without duplicates', () => {
  const d = teacherData();
  const first = parseRoster('J.S. 7A IEP\n- calculator\nannual review 3/12', TODAY).students;
  assert.deepEqual(applyRoster(d, first), { added: 1, updated: 0 });
  const again = parseRoster('J.S. 7A IEP\n- calculator\n- breaks\nannual review 3/12\n\nA.R. 7C 504', TODAY).students;
  assert.ok(matchExisting(d.students, again[0]));
  assert.equal(matchExisting(d.students, again[1]), undefined);
  assert.deepEqual(applyRoster(d, again), { added: 1, updated: 1 });
  assert.equal(d.students.length, 2);
  assert.deepEqual(d.students[0].accommodations, ['calculator', 'breaks']);
  assert.equal(d.students[0].dates.length, 1);
  assert.equal(d.students[1].plan, '504');
});

test('a caseload pasted from a document, with group and section labels', () => {
  const doc = `IEP Students
J.S. (7A) - IEP
Goals:
1. Will write a CER paragraph with 2 pieces of evidence in 4/5 trials
2. Will use a break card when frustrated
Accommodations: extended time, read aloud, graphic organizers
Annual Review: 3/12/27

504 Students
A.R. (7C)
Accommodations:
- preferential seating
- extended time
504 meeting 2/4

7D
M.T. IEP
- calculator`;
  const { students, skipped } = parseRoster(doc, TODAY);
  assert.deepEqual(skipped, []);
  assert.deepEqual(students.map(s => [s.initials, s.period, s.plan]), [['J.S.', '7A', 'IEP'], ['A.R.', '7C', '504'], ['M.T.', '7D', 'IEP']]);
  const [js, ar] = students;
  assert.equal(js.goals.length, 2);
  assert.equal(js.goals[1].text, 'Will use a break card when frustrated');
  assert.deepEqual(js.accommodations, ['extended time', 'read aloud', 'graphic organizers']);
  assert.deepEqual(js.dates.map(d => d.label), ['Annual Review']);
  assert.deepEqual(ar.accommodations, ['preferential seating', 'extended time']);
  assert.deepEqual(ar.dates.map(d => d.label), ['504 meeting']);
  assert.ok(!ar.notes.some(n => n.startsWith('Plan not given')));
});

test('the caseload widget only offers students with a goal to log', async () => {
  const { logView } = await import('../widgets');
  const d = teacherData();
  applyRoster(d, parseRoster('A.R. 7C 504: extended time\nJ.S. 7A IEP\ngoal: CER, 4 of 5', TODAY).students);
  const v = logView(d, TODAY, 8 * 60);
  assert.deepEqual(v.students.map(s => s.initials), ['J.S.']);
  const only504 = teacherData();
  applyRoster(only504, parseRoster('A.R. 7C 504: extended time', TODAY).students);
  assert.equal(logView(only504, TODAY, 8 * 60).students.length, 0);
  assert.match(logView(only504, TODAY, 8 * 60).empty ?? '', /IEP goal/);
});

test('a month word right before a numeric date reads the numeric date', () => {
  const { students } = parseRoster('J.S. 7A IEP\nAnnual review in December 12/1/26\nRe-eval 1/4/27 in January', TODAY);
  assert.deepEqual(students[0].dates.map(d => [d.label, d.date]), [['Annual review in December', '2026-12-01'], ['Re-eval in January', '2027-01-04']]);
});
