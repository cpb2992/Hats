import assert from 'node:assert/strict';
import { test } from 'node:test';
import { completeTask } from '../actions';
import { ALL_HATS } from '../hats';
import { addPackItem, countdown, deletePackItem, finishPackItem, materializePacks, PACKS, packSummary, packTaskId } from '../packs';
import { teacherData } from './fixture';

const TODAY = '2026-10-22';
const NOW = '2026-10-22T11:00:00.000Z';

test('every hat has a pack, and every pack either links somewhere or keeps a list', () => {
  for (const id of ALL_HATS) {
    const p = PACKS[id];
    assert.equal(p.hat, id);
    assert.ok(p.links.length || p.list, `${id} has nothing`);
  }
});

test('a 1:1 due today becomes a task; finishing it logs the meeting and books the next one', () => {
  const d = teacherData();
  const p = addPackItem(d, { hat: 'lead', title: 'J.D.', date: TODAY, time: '14:00' }, NOW);
  assert.equal(p.repeatDays, 14);
  assert.ok(materializePacks(d, TODAY, NOW));
  const t = d.tasks.find(x => x.id === packTaskId(p))!;
  assert.equal(t.title, '1:1 with J.D.');
  assert.equal(t.time, '14:00');
  assert.equal(materializePacks(d, TODAY, NOW), false, 'made once');

  completeTask(d, t.id, NOW);
  assert.equal(p.last, TODAY);
  assert.equal(p.date, '2026-11-05');
  assert.equal(p.done, false);
});

test('a late repeating refill counts its next date from today', () => {
  const d = teacherData();
  const p = addPackItem(d, { hat: 'caregiver', title: 'Mom’s refill', date: '2026-10-18', repeatDays: 30 }, NOW);
  finishPackItem(d, p.id, TODAY, NOW);
  assert.equal(p.date, '2026-11-21');
});

test('deadlines finish for good; moving one clears its old task', () => {
  const d = teacherData();
  const p = addPackItem(d, { hat: 'student', title: 'Lit review', who: 'EDU 610', date: TODAY }, NOW);
  materializePacks(d, TODAY, NOW);
  assert.equal(d.tasks.filter(t => t.id.startsWith('pk-')).length, 1);
  p.date = '2026-10-30';
  materializePacks(d, TODAY, NOW);
  assert.equal(d.tasks.filter(t => t.id.startsWith('pk-')).length, 0);
  finishPackItem(d, p.id, TODAY, NOW);
  assert.equal(p.done, true);
  assert.equal(countdown('2026-10-25', TODAY), 'in 3 days');
  assert.equal(countdown('2026-10-20', TODAY), '2 days late');
});

test('hats not worn make no pack tasks', () => {
  const d = teacherData();
  d.hats = d.hats.map(h => ({ ...h, on: h.id !== 'gig' }));
  addPackItem(d, { hat: 'gig', title: 'Invoice the Lees', date: TODAY, amount: 120 }, NOW);
  assert.equal(materializePacks(d, TODAY, NOW), false);
});

test('side gig totals and creative sessions', () => {
  const d = teacherData();
  const a = addPackItem(d, { hat: 'gig', title: 'Tutoring, October', amount: 240 }, NOW);
  addPackItem(d, { hat: 'gig', title: 'Logo for the bakery', amount: 150.5 }, NOW);
  finishPackItem(d, a.id, TODAY, NOW);
  assert.equal(packSummary(d, 'gig', TODAY), '$240 paid this month · $150.50 still owed');

  const book = addPackItem(d, { hat: 'creative', title: 'Picture book', who: 'Thumbnail the spreads' }, NOW);
  finishPackItem(d, book.id, TODAY, NOW);
  finishPackItem(d, book.id, TODAY, NOW);
  assert.equal(book.done, false);
  assert.equal(packSummary(d, 'creative', TODAY), '2 sessions this week');

  deletePackItem(d, book.id);
  assert.equal(d.packs.some(p => p.id === book.id), false);
});
