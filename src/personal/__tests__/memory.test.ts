import assert from "node:assert/strict";
import test from "node:test";
import { makeTask, planDay } from "../engine";
import { activeMemories, emptyMemory, keepMemory, memorySuggestions, taskMemories, type PersonalMemory } from "../memory";
import { freshPersonal, validData } from "../model";
import { parseBackup } from "../profile";
import { sharedFromLocal } from "../share";

const today = "2026-11-03";
const stamp = "2026-11-01T12:00:00Z";
const memory = (extra: Partial<PersonalMemory> = {}): PersonalMemory => ({
  id: "m", text: "Home tasks work better earlier", hat: "home", source: "you", createdAt: stamp, updatedAt: stamp, ...extra,
});
function setup() {
  const d = freshPersonal();
  d.preferences.unavailableDays = [];
  d.preferences.weekendStart = "09:00";
  d.preferences.weekendEnd = "16:00";
  d.preferences.kidsRoutine = false;
  d.tasks = [makeTask("A", "work", today, { id: "a", createdAt: stamp }), makeTask("B", "home", today, { id: "b", createdAt: stamp })];
  return d;
}
test("old backups still load; memory round trips without touching tasks", () => {
  const d = setup();
  assert.equal(validData(d), true);
  const before = JSON.stringify(d.tasks);
  keepMemory(d, memory());
  assert.equal(validData(d), true);
  assert.deepEqual(parseBackup(JSON.stringify(d)).memory, d.memory);
  assert.equal(JSON.stringify(d.tasks), before);
});
test("corrections replace the rule; expired context is not used", () => {
  const d = setup();
  keepMemory(d, memory({ rule: { kind: "window", start: "09:00", end: "10:00" } }));
  keepMemory(d, memory({ id: "new", rule: { kind: "window", start: "13:00", end: "14:00" } }));
  assert.equal(d.memory!.items.length, 1);
  keepMemory(d, memory({ id: "expired", expiresOn: "2026-11-02" }));
  assert.deepEqual(activeMemories(d, today).map((m) => m.id), ["new"]);
  assert.equal(taskMemories(d, d.tasks[0], today).length, 0);
});
test("priority changes same-day optional tasks; essential and overdue care stay first", () => {
  const d = setup();
  keepMemory(d, memory({ rule: { kind: "priority" } }));
  assert.equal(planDay(d, today)[0].task.id, "b");
  d.tasks.push(makeTask("Care", "pets", today, { id: "care", essential: true }));
  assert.equal(planDay(d, today)[0].task.id, "care");
  d.tasks[0].date = "2026-11-02";
  assert.deepEqual(planDay(d, today).slice(0, 3).map((x) => x.task.id), ["care", "a", "b"]);
});
test("preferred windows avoid fixed commitments, with safe fallback instead of losing a task", () => {
  const d = setup();
  keepMemory(d, memory({ rule: { kind: "window", start: "13:00", end: "14:00" } }));
  assert.equal(planDay(d, today).find((x) => x.task.id === "b")?.time, "13:00");
  d.tasks.push(makeTask("Appointment", "home", today, { id: "fixed", fixed: true, time: "13:00", minutes: 60 }));
  const plan = planDay(d, today);
  assert.equal(plan.find((x) => x.task.id === "fixed")?.time, "13:00");
  assert.equal(plan.find((x) => x.task.id === "b")?.time, "09:25");
  assert.match(plan.find((x) => x.task.id === "b")!.reason, /Preferred time unavailable/);
});
test("preferences don't move essential tasks later or put tasks into a blocked family routine", () => {
  const d = setup();
  d.tasks[1].essential = true;
  keepMemory(d, memory({ rule: { kind: "window", start: "13:00", end: "14:00" } }));
  assert.equal(planDay(d, today).find((x) => x.task.id === "b")?.time, "09:00");
  d.tasks[1].essential = false;
  d.events.push({ id: "pickup", title: "Pickup", source: "hats", date: today, start: "13:00", end: "14:00", allDay: false });
  assert.notEqual(planDay(d, today).find((x) => x.task.id === "b")?.time, "13:00");
});
test("smaller-task preference starts small without changing estimates or losing longer tasks", () => {
  const d = setup();
  d.tasks[0].hat = "home";
  d.tasks[0].minutes = 45;
  keepMemory(d, memory({ rule: { kind: "small", minutes: 15 } }));
  assert.equal(planDay(d, today)[0].task.id, "b");
  assert.equal(d.tasks[0].minutes, 45);
  assert.ok(planDay(d, today).find((x) => x.task.id === "a")?.time);
});
test("expired rules restore the original plan and context alone doesn't reorder tasks", () => {
  const d = setup();
  const original = planDay(d, today);
  keepMemory(d, memory());
  assert.deepEqual(planDay(d, today), original);
  keepMemory(d, memory({ id: "expired", rule: { kind: "priority" }, expiresOn: "2026-11-02" }));
  assert.deepEqual(planDay(d, today), original);
});
function completed() {
  const d = setup();
  d.memory = emptyMemory();
  // Local timestamps keep this deterministic across host time zones.
  d.tasks = ["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-30"].map((day, i) =>
    makeTask(`Task ${i}`, "home", day, { doneAt: `${day}T14:00:00`, id: String(i) }));
  return d;
}
test("learning is off until enabled, and a proposed pattern changes nothing until accepted", () => {
  const d = completed();
  assert.deepEqual(memorySuggestions(d, today), []);
  d.memory!.learnFromCompletions = true;
  const before = JSON.stringify(d);
  assert.deepEqual(memorySuggestions(d, today), [{ key: "timing:home:1", hat: "home", count: 4, days: 3, start: "12:00", end: "17:00" }]);
  assert.equal(JSON.stringify(d), before);
  d.memory!.dismissed.push("timing:home:1");
  assert.deepEqual(memorySuggestions(d, today), []);
});
test("sparse, old, future, same-day and other-member completions can't form a pattern", () => {
  for (const variant of ["sparse", "old", "future", "today", "other", "fixed", "invalid"]) {
    const d = completed();
    d.memory!.learnFromCompletions = true;
    if (variant === "sparse") d.tasks.pop();
    for (const task of d.tasks) {
      if (variant === "old") task.doneAt = "2026-01-01T14:00:00";
      if (variant === "future") task.doneAt = "2026-12-01T14:00:00";
      if (variant === "today") task.doneAt = `${today}T14:00:00`;
      if (variant === "other") task.assignee = "someone-else";
      if (variant === "fixed") task.fixed = true;
      if (variant === "invalid") task.doneAt = "invalid";
    }
    assert.deepEqual(memorySuggestions(d, today), [], variant);
  }
});
test("deferrals alone never infer a preference; existing confirmed timing stays in charge", () => {
  const d = completed();
  d.memory!.learnFromCompletions = true;
  keepMemory(d, memory({ rule: { kind: "window", start: "09:00", end: "10:00" } }));
  assert.deepEqual(memorySuggestions(d, today), []);
  d.memory!.items = [];
  for (const task of d.tasks) { task.doneAt = null; task.deferred = 50; }
  assert.deepEqual(memorySuggestions(d, today), []);
});
test("memories and their rules never enter family-sharing payloads", () => {
  const d = setup();
  d.tasks[1].shared = true;
  const before = [...sharedFromLocal(d)];
  keepMemory(d, memory({ text: "Private personal context", rule: { kind: "priority" } }));
  assert.deepEqual([...sharedFromLocal(d)], before);
});
test("invalid imported memory is rejected rather than executed by the planner", () => {
  for (const bad of [null, {}, { items: "bad" }, { ...emptyMemory(), items: [memory({ rule: { kind: "window", start: "25:00", end: "26:00" } })] },
    { ...emptyMemory(), items: [memory({ rule: { kind: "small", minutes: -1 } })] },
    { ...emptyMemory(), items: [memory({ text: "" })] },
    { ...emptyMemory(), items: [memory({ expiresOn: "2026-02-30" })] },
    { ...emptyMemory(), items: [memory(), memory()] }]) {
    const d = { ...setup(), memory: bad };
    assert.equal(validData(d), false);
    assert.throws(() => parseBackup(JSON.stringify(d)));
  }
});
