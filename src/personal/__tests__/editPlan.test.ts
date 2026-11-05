import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal, type DatePlan, type PersonalEvent } from "../model";
import { editDatePlan, editHatsEvent } from "../editPlan";
import { dayTimeline } from "../timeline";

const TODAY = "2026-11-05";
function datePlan(): DatePlan {
  return {
    id: "night-1", date: TODAY, time: "19:00",
    title: "Dinner date", budget: 150, childcare: 0, transport: 0,
    note: "Reservation pending", childcareConfirmed: true,
    steps: [{ title: "Confirm childcare", done: true }, { title: "Pick restaurant", done: true }],
  };
}
function event(): PersonalEvent {
  return {
    id: "event-1", source: "hats", title: "Soccer practice",
    date: TODAY, start: "17:00", end: "18:00",
    allDay: false, location: "Field", hat: "dad",
  };
}
test("editing date night 7 PM to 6:30 PM updates the same schedule item", () => {
  const d = freshPersonal();
  const p = datePlan();
  d.dates.push(p);
  editDatePlan(p, { title: "Dinner date", date: TODAY, time: "6:30 PM", note: "Reservation moved" });
  assert.equal(p.id, "night-1");
  assert.equal(p.time, "18:30");
  assert.equal(p.childcareConfirmed, false);
  assert.equal(p.steps[0].done, false);
  assert.equal(p.steps[1].done, true);
  const shown = dayTimeline(d, TODAY, 0, TODAY).items.find((x) => x.id === "date:night-1");
  assert.equal(shown?.time, "18:30");
});
test("date night title and day edits keep the plan and move its timeline entry", () => {
  const d = freshPersonal();
  const p = datePlan();
  d.dates.push(p);
  editDatePlan(p, { title: "Concert", date: "2026-11-06", time: "8 PM", note: "Tickets" });
  assert.equal(p.title, "Concert");
  assert.equal(p.note, "Tickets");
  assert.equal(dayTimeline(d, TODAY, 0, TODAY).items.some((x) => x.id === "date:night-1"), false);
  assert.equal(dayTimeline(d, "2026-11-06", 0, TODAY).items.find((x) => x.id === "date:night-1")?.time, "20:00");
});
test("editing a Hats event updates title, location and displayed time", () => {
  const d = freshPersonal();
  const e = event();
  d.events.push(e);
  editHatsEvent(e, { title: "Soccer game", date: TODAY, start: "6:30 PM", end: "8 PM", location: "Gym", allDay: false });
  assert.equal(e.id, "event-1");
  assert.equal(e.start, "18:30");
  assert.equal(e.end, "20:00");
  assert.equal(e.location, "Gym");
  assert.equal(dayTimeline(d, TODAY, 0, TODAY).items.find((x) => x.id === "event:event-1")?.time, "18:30");
});
test("bad time, date, and managed Google event do not mutate source", () => {
  const e = event();
  const before = JSON.stringify(e);
  assert.throws(() => editHatsEvent(e, { title: "Bad", date: TODAY, start: "8 PM", end: "7 PM", location: "", allDay: false }), /End time/);
  assert.throws(() => editHatsEvent(e, { title: "Bad", date: "2026-02-30", start: "6 PM", end: "7 PM", location: "", allDay: false }), /valid date/);
  assert.equal(JSON.stringify(e), before);
  e.source = "google";
  assert.throws(() => editHatsEvent(e, { title: "Bad", date: TODAY, start: "6 PM", end: "7 PM", location: "", allDay: false }), /Google Calendar/);
});
test("all-day editing retains the same event identity", () => {
  const e = event();
  editHatsEvent(e, { title: "Field trip", date: TODAY, start: "", end: "", allDay: true, location: "Museum" });
  assert.equal(e.id, "event-1");
  assert.equal(e.allDay, true);
  assert.equal(e.start, "00:00");
  assert.equal(e.end, "23:59");
});
