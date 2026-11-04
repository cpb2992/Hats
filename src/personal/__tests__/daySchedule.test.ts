import assert from "node:assert/strict";
import test from "node:test";
import { dayWindows } from "../engine";
import { freshPersonal, validData } from "../model";
import { isWorkday } from "../routine";
import { schoolBlocks } from "../school";
import { dayTimeline } from "../timeline";

const date = "2026-11-05";
test("Thursday date night and hat events appear on Thursday, independent of today's clock", () => {
  const d = freshPersonal();
  d.dates.push({ id: "date", date, time: "19:00", title: "Dinner out", budget: 100, childcare: 0, transport: 0, steps: [], note: "" });
  d.events.push({ id: "event", date, start: "16:00", end: "16:30", title: "Pick up flowers", source: "hats", allDay: false, hat: "husband" });
  const timeline = dayTimeline(d, date, 23 * 60, "2026-11-03");
  assert.equal(timeline.items.find(i => i.id === "date:date")?.time, "19:00");
  assert.equal(timeline.items.find(i => i.id === "date:date")?.done, false);
  assert.equal(timeline.items.filter(i => i.id === "event:event").length, 1);
  assert.equal(dayTimeline(d, "2026-11-04", 0, "2026-11-03").items.some(i => i.kind === "date"), false);
});
test("day off persists, opens daytime and removes school only on the chosen date", () => {
  const d = freshPersonal();
  d.preferences.school = { on: true };
  d.preferences.unavailableDays = [1, 2, 3, 4, 5];
  const week = [...d.preferences.unavailableDays];
  const before = dayWindows(d, date)[0].start;
  d.workDaysOff = [date];
  d.events.push({ id: "appointment", date, start: "11:00", end: "12:00", title: "Appointment", source: "google", allDay: false });
  assert.equal(isWorkday(d, date), false);
  assert.equal(schoolBlocks(d, date).length, 0);
  assert.ok(dayWindows(d, date)[0].start < before);
  assert.ok(dayWindows(d, date).every(w => w.end <= 660 || w.start >= 720));
  const timeline = dayTimeline(d, date, 0, "2026-11-03");
  assert.ok(timeline.allDay.some(i => i.title === "Day off work"));
  assert.ok(timeline.items.some(i => i.title === "Appointment"));
  assert.ok(!timeline.items.some(i => i.kind === "work" || i.key === "home"));
  assert.equal(isWorkday(d, "2026-11-06"), true);
  assert.deepEqual(d.preferences.unavailableDays, week);
  assert.equal(validData(JSON.parse(JSON.stringify(d))), true);
  d.workDaysOff = [];
  assert.ok(schoolBlocks(d, date).length > 0);
  assert.equal(dayWindows(d, date)[0].start, before);
});
test("old backups remain valid and malformed day exceptions are rejected", () => {
  const d = freshPersonal();
  assert.equal(validData(d), true);
  assert.equal(validData({ ...d, workDaysOff: ["2026-02-30"] }), false);
  assert.equal(validData({ ...d, workDaysOff: "Thursday" }), false);
});
