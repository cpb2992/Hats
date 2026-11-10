import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal } from "../model";
import { makeTask, finishStep } from "../engine";
import { prepWindow } from "../prep";
import { keepMemory } from "../memory";

const date = "2026-11-04"; // a Wednesday (Thursday period 1 is CPT)
function setup() {
  const d = freshPersonal();
  d.preferences.unavailableDays = [3];
  d.preferences.school = { on: true, week: { "3": [
    { start: "08:00", end: "08:40", title: "Prep", kind: "off", note: "Planning", period: 1 },
    { start: "08:45", end: "09:25", title: "8X Science", kind: "class", section: "8X", period: 2 },
  ] } };
  d.tasks = [
    makeTask("Print lab packets", "work", date, { id: "print", minutes: 15, createdAt: "2026-11-01T10:00:00Z" }),
    makeTask("Reply to a message", "work", date, { id: "reply", minutes: 10, createdAt: "2026-11-01T11:00:00Z" }),
    makeTask("Long project", "work", date, { id: "long", minutes: 60 }),
  ];
  return d;
}
test("prep uses the actual bell window with a five minute wrap-up buffer", () => {
  const window = prepWindow(setup(), date, 8 * 60 + 10)!;
  assert.equal(window.usableMinutes, 25);
  assert.equal(window.endsAt, 8 * 60 + 40);
  assert.deepEqual(window.next, { title: "8X Science", time: "08:45" });
  assert.deepEqual(window.candidates.map((t) => t.id), ["print", "reply"]);
});
test("class time, a meeting block, disabled school and a closure are never prep", () => {
  const d = setup();
  assert.equal(prepWindow(d, date, 8 * 60 + 50), null);
  d.preferences.school!.week!["3"][0].kind = "meeting";
  assert.equal(prepWindow(d, date, 8 * 60 + 10), null);
  d.preferences.school!.week!["3"][0].kind = "off";
  d.preferences.school!.on = false;
  assert.equal(prepWindow(d, date, 8 * 60 + 10), null);
  d.preferences.school!.on = true;
  d.events.push({ id: "closed", title: "Closed", date, start: "00:00", end: "23:59", allDay: true, closure: true, source: "hats" });
  assert.equal(prepWindow(d, date, 8 * 60 + 10), null);
});
test("real calendar meetings shorten prep and suppress suggestions while they are happening", () => {
  const d = setup();
  d.events.push({ id: "meeting", title: "Team check-in", date, start: "08:30", end: "08:35", allDay: false, source: "google" });
  const window = prepWindow(d, date, 8 * 60 + 10)!;
  assert.equal(window.usableMinutes, 15);
  assert.deepEqual(window.next, { title: "Team check-in", time: "08:30" });
  assert.equal(prepWindow(d, date, 8 * 60 + 31), null);
  assert.equal(prepWindow(d, date, 8 * 60 + 35)!.usableMinutes, 0);
});
test("a broad Work calendar event doesn't erase a real prep period", () => {
  const d = setup();
  d.events.push({ id: "work", title: "Work", date, start: "07:00", end: "16:00", allDay: false, source: "google" });
  assert.equal(prepWindow(d, date, 8 * 60 + 10)!.usableMinutes, 25);
});
test("fixed commitments reserve time instead of being recommended as flexible work", () => {
  const d = setup();
  d.tasks.push(makeTask("Appointment", "myself", date, { id: "appointment", fixed: true, time: "08:30", minutes: 10 }));
  assert.equal(prepWindow(d, date, 8 * 60 + 10)!.usableMinutes, 15);
  assert.equal(prepWindow(d, date, 8 * 60 + 31), null);
});
test("future, completed, other people's and non-work tasks never enter the prep queue", () => {
  const d = setup();
  d.tasks.push(makeTask("Home", "home", date, { minutes: 5 }));
  d.tasks.push(makeTask("Tomorrow", "work", "2026-11-05", { minutes: 5 }));
  d.tasks.push(makeTask("Someone else's", "work", date, { minutes: 5, assignee: "other" }));
  d.tasks.push(makeTask("Call after 3", "work", date, { minutes: 5, time: "15:00" }));
  d.tasks[1].doneAt = "2026-11-04T08:00:00Z";
  assert.deepEqual(prepWindow(d, date, 8 * 60 + 10)!.candidates.map((t) => t.id), ["print"]);
});
test("finishing the suggested step advances the real task, with no schedule rewrite", () => {
  const d = setup();
  d.tasks[0].steps = [{ title: "Make copies", done: false }, { title: "Set out trays", done: false }];
  const before = { date: d.tasks[0].date, time: d.tasks[0].time, minutes: d.tasks[0].minutes };
  finishStep(prepWindow(d, date, 490)!.candidates[0]);
  assert.equal(d.tasks[0].steps[0].done, true);
  assert.equal(d.tasks[0].doneAt, null);
  finishStep(prepWindow(d, date, 490)!.candidates[0]);
  assert.equal(prepWindow(d, date, 490)!.candidates[0].id, "reply");
  assert.deepEqual({ date: d.tasks[0].date, time: d.tasks[0].time, minutes: d.tasks[0].minutes }, before);
});
test("lighter days and confirmed small-task preferences favor manageable work", () => {
  const d = setup();
  d.lowEnergyDays.push(date);
  assert.equal(prepWindow(d, date, 490)!.candidates[0].id, "reply");
  d.lowEnergyDays = [];
  keepMemory(d, { id: "small", text: "Start small", hat: "work", source: "you", createdAt: "2026-11-01T10:00:00Z", updatedAt: "2026-11-01T10:00:00Z", rule: { kind: "small", minutes: 10 } });
  assert.equal(prepWindow(d, date, 490)!.candidates[0].id, "reply");
});
test("essential and overdue work retain priority; finding candidates never mutates data", () => {
  const d = setup();
  d.tasks[1].essential = true;
  const before = JSON.stringify(d);
  assert.equal(prepWindow(d, date, 490)!.candidates[0].id, "reply");
  assert.equal(JSON.stringify(d), before);
  d.tasks[0].date = "2026-11-03";
  d.tasks[1].essential = false;
  assert.equal(prepWindow(d, date, 490)!.candidates[0].id, "print");
});
test("wrap-up time offers no tasks, and the card ends at the bell", () => {
  const d = setup();
  assert.equal(prepWindow(d, date, 8 * 60 + 37)!.usableMinutes, 0);
  assert.deepEqual(prepWindow(d, date, 8 * 60 + 37)!.candidates, []);
  assert.equal(prepWindow(d, date, 8 * 60 + 40), null);
});
test("protected personal sessions and a hidden work hat suppress prep suggestions", () => {
  const d = setup();
  d.protectedUntil = new Date(`${date}T09:00:00`).toISOString();
  assert.equal(prepWindow(d, date, 490), null);
  d.protectedUntil = null;
  d.preferences.hiddenHats = ["work"];
  assert.equal(prepWindow(d, date, 490), null);
});
test("Thursday period 1 is science CPT, never prep", () => {
  const d = setup();
  d.preferences.unavailableDays = [4];
  d.preferences.school!.week = { "4": d.preferences.school!.week!["3"] };
  assert.equal(prepWindow(d, "2026-11-05", 8 * 60 + 10), null);
});
