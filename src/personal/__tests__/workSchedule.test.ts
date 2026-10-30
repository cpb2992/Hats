import assert from "node:assert/strict";
import test from "node:test";
import { fmtTime } from "../../engine/dates";
import { dayWindows } from "../engine";
import { freshPersonal, validData } from "../model";
import { applySetup } from "../setup";
import { schoolBlocks } from "../school";
import { isWorkWeek, shiftsFromWeek, workWeek } from "../workSchedule";

test("different weekdays, split shifts and weekends survive saving and reopening", () => {
  const week = workWeek([
    { days: [1, 3], start: "8 AM", end: "12 PM", title: "Clinic" },
  ]);
  const split = workWeek([
    ...shiftsFromWeek(week),
    { days: [1], start: "2 PM", end: "6 PM", title: "Second job" },
    { days: [6], start: "10 AM", end: "3 PM", title: "Weekend" },
  ]);
  assert.equal(split["1"].length, 2);
  assert.equal(split["6"][0].start, "10:00");
  assert.deepEqual(workWeek(shiftsFromWeek(split)), split);
  assert.equal(isWorkWeek(split), true);
});

test("overnight Saturday shift carries into Sunday without blocking the daytime gap", () => {
  const week = workWeek([{ days: [6], start: "10 PM", end: "6 AM", title: "Night shift" }]);
  assert.equal(week["6"][0].end, "24:00");
  assert.equal(fmtTime("24:00", true), "12:00 AM");
  assert.equal(week["0"][0].end, "06:00");
  assert.deepEqual(workWeek(shiftsFromWeek(week)), week);
  const d = freshPersonal();
  d.preferences.school = { on: true, week };
  d.preferences.unavailableDays = [0, 6];
  d.preferences.weekendStart = "05:00";
  d.preferences.weekendEnd = "23:00";
  assert.equal(validData(d), true);
  assert.equal(schoolBlocks(d, "2026-11-01")[0].end, "06:00");
  assert.equal(dayWindows(d, "2026-11-01")[0].start, 360);
  assert.ok(dayWindows(d, "2026-10-31").every((w) => w.end <= 1320));
});

test("planner protects actual shifts and allows time before and between shifts", () => {
  const d = freshPersonal();
  d.preferences.school = { on: true, week: workWeek([
    { days: [1], start: "10 AM", end: "12 PM", title: "Job one" },
    { days: [1], start: "3 PM", end: "5 PM", title: "Job two" },
  ]) };
  d.preferences.unavailableDays = [1];
  const windows = dayWindows(d, "2026-10-26");
  assert.ok(windows.some((w) => w.start === 540 && w.end === 600));
  assert.ok(windows.some((w) => w.start === 720 && w.end === 900));
  assert.ok(windows.every((w) => !(w.start < 720 && w.end > 600) && !(w.start < 1020 && w.end > 900)));
});

test("invalid hours and overlapping overnight carry are rejected", () => {
  const shift = { days: [1], start: "9 AM", end: "5 PM", title: "Work" };
  assert.throws(() => workWeek([{ ...shift, start: "25:00" }]), /different start/);
  assert.throws(() => workWeek([{ ...shift, days: [] }]), /choose at least/);
  assert.throws(() => workWeek([{ ...shift, end: "9 AM" }]), /different start/);
  assert.throws(() => workWeek([
    { ...shift, start: "10 PM", end: "6 AM" },
    { ...shift, days: [2], start: "5 AM", end: "9 AM" },
  ]), /overlap/);
});

test("no fixed hours keeps the work hat without inventing a weekday schedule", () => {
  const d = freshPersonal();
  applySetup(d, {
    name: "Sam", partner: "", partnerWord: "Partner", kids: [], parentWord: "Parent", pets: [],
    hats: ["home", "work"], dinner: "18:00", baths: "off",
    work: { name: "Freelance", art: "bowler", title: "Work", days: [], start: "09:00", end: "17:00", week: {} },
  }, "2026-10-26");
  assert.equal(validData(d), true);
  assert.equal(d.preferences.hatNames?.work, "Freelance");
  assert.equal(d.preferences.school?.on, false);
  assert.deepEqual(d.preferences.unavailableDays, []);
  assert.deepEqual(schoolBlocks(d, "2026-10-26"), []);
});
