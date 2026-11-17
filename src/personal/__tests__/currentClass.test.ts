import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal } from "../model";
import { currentPlanNotice } from "../reminderPlan";
import { dayTimeline, nowAndNext } from "../timeline";

const mon = "2026-11-16";
const t = (h: number, m: number) => h * 60 + m;
function school() {
  const d = freshPersonal();
  d.preferences.unavailableDays = [1, 2, 3, 4, 5];
  d.preferences.notifications = true;
  return d;
}
const nowAt = (d: ReturnType<typeof school>, min: number) =>
  nowAndNext(dayTimeline(d, mon, min, mon).items, min).now;

test("current class: a long calendar event doesn't hide the class you're teaching", () => {
  const d = school();
  // A multi-day timed event imports as 00:00-23:59; a "school hours" block spans the day.
  d.events.push({ id: "week", title: "Science fair week", date: mon, start: "00:00", end: "23:59", allDay: false, source: "google" } as never);
  d.events.push({ id: "day", title: "Condon", date: mon, start: "07:45", end: "15:15", allDay: false, source: "google" } as never);
  assert.equal(nowAt(d, t(9, 45))?.title, "7A Science");
  const n = currentPlanNotice(d, mon, t(9, 45));
  assert.equal(n?.title, "Hats · Now: 7A Science");
  assert.equal(n?.body, "Until 10:24 AM · Period 2");
  // Prep and lunch still read as prep and lunch, not the all-day event.
  assert.equal(nowAt(d, t(11, 40))?.title, "Prep");
  assert.equal(nowAt(d, t(12, 50))?.title, "Lunch");
});

test("current class: a fixed to-do during class doesn't replace the class", () => {
  const d = school();
  d.tasks.push({ id: "t", title: "Email Mr. Prince", hat: "work", minutes: 10, steps: [], fixed: true, date: mon, time: "09:40", createdAt: "2026-11-16T00:00:00Z" } as never);
  assert.equal(nowAt(d, t(9, 45))?.title, "7A Science");
  assert.equal(currentPlanNotice(d, mon, t(9, 45))?.title, "Hats · Now: 7A Science");
});

test("current class: a meeting that starts during prep still shows during prep", () => {
  const d = school();
  d.events.push({ id: "iep", title: "IEP meeting", date: mon, start: "11:30", end: "12:00", allDay: false, source: "google" } as never);
  assert.equal(nowAt(d, t(11, 40))?.title, "IEP meeting");
  // ...and the class right after still wins at its time.
  assert.equal(nowAt(d, t(13, 20))?.title, "7B Science");
});
