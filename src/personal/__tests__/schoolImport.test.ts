import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal, validData } from "../model";
import { makeTask } from "../engine";
import { editDayAssignments } from "../school";
import { applySchoolSchedule, parseSchoolSchedule } from "../schoolImport";
import { currentPlanNotice } from "../reminderPlan";
import { dayTimeline } from "../timeline";

const fixture = () => ({ format: "hats-school-schedule", version: 1, week: { "4": [
  { start: "08:00", end: "08:40", title: "Department meeting", kind: "meeting", period: 1 },
  { start: "08:45", end: "09:25", title: "8X Science", kind: "class", section: "8X", period: 2 },
  { start: "09:30", end: "10:10", title: "Prep", kind: "off", note: "Planning", period: 4 },
  { start: "12:19", end: "13:12", title: "Advisory / Lunch", kind: "advisory", period: 5 },
] } });
test("schedule import changes only school configuration and workdays", () => {
  const data = freshPersonal();
  data.tasks.push(makeTask("Keep my task", "home", "2026-11-05"));
  data.notes.push({ id: "private", kind: "memory", hat: "myself", text: "Keep this note", createdAt: new Date().toISOString() });
  const before = JSON.parse(JSON.stringify(data));
  const schedule = parseSchoolSchedule(JSON.stringify(fixture()));
  applySchoolSchedule(data, schedule);
  assert.equal(validData(data), true);
  assert.deepEqual(data.preferences.unavailableDays, [4]);
  const expected = { ...before, preferences: { ...before.preferences, school: { on: true, week: schedule.week }, unavailableDays: [4] } };
  assert.deepEqual(data, expected);
  schedule.week["4"][0].title = "Changed outside the app";
  assert.equal(data.preferences.school!.week!["4"][0].title, "Department meeting");
});
test("imported class periods, meetings and prep appear at their actual times", () => {
  const data = freshPersonal();
  applySchoolSchedule(data, parseSchoolSchedule(JSON.stringify(fixture())));
  const day = "2026-11-05";
  assert.match(currentPlanNotice(data, day, 8 * 60 + 5)!.title, /Department meeting/);
  const cls = currentPlanNotice(data, day, 8 * 60 + 50)!;
  assert.match(cls.title, /8X Science/);
  assert.match(cls.body, /Until 9:25 AM.*Period 2/);
  const prep = currentPlanNotice(data, day, 9 * 60 + 35)!;
  assert.match(prep.title, /Prep/);
  assert.match(prep.body, /Planning/);
});
test("a broad Work calendar block does not hide the actual class period", () => {
  const data = freshPersonal();
  applySchoolSchedule(data, parseSchoolSchedule(JSON.stringify(fixture())));
  data.events.push({ id: "work", title: "Work", source: "google", date: "2026-11-05", start: "07:00", end: "16:00", allDay: false });
  assert.match(currentPlanNotice(data, "2026-11-05", 8 * 60 + 50)!.title, /8X Science/);
});
test("changing class assignments preserves meetings, prep labels and combined lunch times", () => {
  const schedule = parseSchoolSchedule(JSON.stringify(fixture()));
  const changed = editDayAssignments(schedule.week["4"], { p2: "8Y", p3: "8Z", p4: "RBR", p5: "Advisory", p6: "8X", p7: "8Y" });
  assert.deepEqual(changed[0], schedule.week["4"][0]);
  assert.equal(changed[1].section, "8Y");
  assert.equal(changed[1].start, "08:45");
  assert.equal(changed[2].title, "Prep");
  assert.equal(changed[3].end, "13:12");
  assert.equal(changed[3].title, "Advisory / Lunch");
});
test("closures and weekends still suppress the imported school timetable", () => {
  const data = freshPersonal();
  applySchoolSchedule(data, parseSchoolSchedule(JSON.stringify(fixture())));
  data.events.push({ id: "off", title: "School closed", source: "hats", date: "2026-11-05", start: "00:00", end: "23:59", allDay: true, closure: true });
  assert.ok(!dayTimeline(data, "2026-11-05", 9 * 60, "2026-11-05").items.some((i) => i.kind === "work"));
  assert.ok(!dayTimeline(data, "2026-11-07", 9 * 60, "2026-11-07").items.some((i) => i.kind === "work"));
});
test("invalid schedule files fail before touching personal data", () => {
  for (const bad of [ {}, { format: "hats-personal-profile" }, { ...fixture(), week: {} },
    { ...fixture(), week: { "9": fixture().week["4"] } },
    { ...fixture(), week: { "4": [{ ...fixture().week["4"][0], end: "07:00" }] } },
    { ...fixture(), week: { "4": [{ ...fixture().week["4"][0], kind: "unknown" }] } },
    { ...fixture(), week: { "4": [fixture().week["4"][0], fixture().week["4"][0]] } } ]) {
    const data = freshPersonal(), before = JSON.stringify(data);
    assert.throws(() => applySchoolSchedule(data, bad as never));
    assert.equal(JSON.stringify(data), before);
  }
});
