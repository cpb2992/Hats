import assert from "node:assert/strict";
import test from "node:test";
import { chooseWidgetNext } from "../nextUp";
import type { PlannedTask } from "../engine";

const today = "2026-11-02";
const item = (
  id: string,
  time: string | null,
  opts: { date?: string; fixed?: boolean; essential?: boolean; minutes?: number; doneAt?: string | null } = {},
): PlannedTask => ({
  task: {
    id,
    title: id,
    hat: "home",
    date: opts.date ?? today,
    time,
    fixed: opts.fixed ?? false,
    essential: opts.essential ?? false,
    minutes: opts.minutes ?? 20,
    doneAt: opts.doneAt ?? null,
    steps: [],
    repeat: "none",
    createdAt: "2026-11-01T12:00:00Z",
    deferred: 0,
  },
  date: opts.date ?? today,
  time,
  reason: "test",
});

test("active task is preferred over a future appointment", () => {
  const result = chooseWidgetNext([item("appointment", "17:00", { fixed: true }), item("dishes", "16:00")], today, 16 * 60 + 5);
  assert.equal(result.phase, "now");
  assert.equal(result.item?.task.id, "dishes");
});

test("fixed appointments come before later flexible slots", () => {
  const result = chooseWidgetNext([item("later chore", "15:00"), item("appointment", "14:30", { fixed: true })], today, 13 * 60);
  assert.equal(result.phase, "upcoming");
  assert.equal(result.item?.task.id, "appointment");
});

test("expired appointment doesn't remain stuck on the widget", () => {
  const result = chooseWidgetNext([item("old", "08:30", { fixed: true, minutes: 45 }), item("later", "14:00", { fixed: true })], today, 12 * 60);
  assert.equal(result.item?.task.id, "later");
});

test("older-date fixed commitments aren't mistaken for today's upcoming task", () => {
  const result = chooseWidgetNext([item("yesterday", "20:00", { fixed: true, date: "2026-11-01" }), item("today", "19:00")], today, 13 * 60);
  assert.equal(result.item?.task.id, "today");
  assert.equal(result.phase, "flexible");
});

test("unfinished flexible tasks without openings aren't falsely presented as scheduled", () => {
  const result = chooseWidgetNext([item("waiting", null, { essential: true })], today, 13 * 60);
  assert.equal(result.phase, "waiting");
  assert.equal(result.item, null);
});

test("the empty state is calm and truthful", () => {
  assert.deepEqual(chooseWidgetNext([], today, 13 * 60), { item: null, phase: "clear" });
});

test("a finished task never remains selected", () => {
  const result = chooseWidgetNext([item("finished", "15:00", { doneAt: "2026-11-02T14:05:00Z" })], today, 14 * 60);
  assert.equal(result.phase, "clear");
});

test("ongoing fixed commitments outrank an overlapping flexible task", () => {
  const result = chooseWidgetNext([item("gym", "13:00"), item("meeting", "13:00", { fixed: true })], today, 13 * 60 + 2);
  assert.equal(result.item?.task.id, "meeting");
});

test("an ended flexible slot doesn't keep showing when no future work fits", () => {
  const result = chooseWidgetNext([item("missed opening", "08:00")], today, 16 * 60);
  assert.equal(result.phase, "waiting");
});

test("selected candidates don't mutate the planner's input", () => {
  const candidates = [item("a", "14:00"), item("b", "13:00")];
  chooseWidgetNext(candidates, today, 12 * 60);
  assert.equal(candidates[0].task.id, "a");
});
