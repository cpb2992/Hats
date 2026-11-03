import assert from "node:assert/strict";
import test from "node:test";
import { fmtTime } from "../../engine/dates";
import { dayWindows, finishStep } from "../engine";
import { addPackageBlock, addPackageChecklist, attachPackage, detachPackage, makePackageBlock, packageFor, packageHat, removePackageBlock } from "../hatPackages";
import { freshPersonal, hangUpHat, validData } from "../model";
import { HAT_PACKAGES } from "../packageCatalog";
import { parseBackup } from "../profile";
import { sharedFromLocal, mergeRemote } from "../share";

const date = "2026-11-05";
const checklist = { title: "My next job", steps: "Check materials\nConfirm arrival", minutes: "20", date, template: 0 };
const night = { title: "Night duty", date, endDate: "2026-11-06", start: "19:00", end: "07:00", location: "Station" };

test("existing teachers retain tools and new packages never schedule sample data", () => {
  const d = freshPersonal();
  assert.equal(packageFor(d, "work")?.id, "teacher");
  for (const pack of HAT_PACKAGES) {
    const hat = attachPackage(d, pack.id);
    assert.equal(packageFor(d, hat)?.id, pack.id);
    assert.equal(attachPackage(d, pack.id), hat);
  }
  assert.equal(d.customHats?.length, HAT_PACKAGES.length - 1);
  assert.equal(d.tasks.length + d.events.length, 0);
  assert.ok(validData(d));
});
test("adding a package reuses a named hat, and reopens hidden built-ins", () => {
  const d = freshPersonal();
  d.customHats = [{ id: "my-chef", name: "Chef", art: "chef", createdAt: new Date().toISOString() }];
  assert.equal(attachPackage(d, "chef"), "my-chef");
  d.preferences.hiddenHats = ["work"];
  assert.equal(attachPackage(d, "teacher"), "work");
  assert.deepEqual(d.preferences.hiddenHats, []);
  assert.throws(() => attachPackage(d, "unknown"));
  assert.throws(() => attachPackage(d, "chef", "my-missing"));
});
test("changing and removing tools preserves the hat, notes, tasks, calendar, and other packages", () => {
  const d = freshPersonal();
  const hat = attachPackage(d, "driver");
  const chef = attachPackage(d, "chef");
  addPackageChecklist(d, hat, checklist);
  addPackageBlock(d, hat, night);
  const before = JSON.stringify({ tasks: d.tasks, events: d.events, notes: d.notes, hats: d.customHats });
  attachPackage(d, "trades", hat);
  assert.equal(packageFor(d, hat)?.id, "trades");
  detachPackage(d, hat);
  assert.equal(packageFor(d, hat), undefined);
  assert.equal(packageFor(d, chef)?.id, "chef");
  assert.equal(JSON.stringify({ tasks: d.tasks, events: d.events, notes: d.notes, hats: d.customHats }), before);
  detachPackage(d, "work");
  assert.equal(packageFor(d, "work"), undefined);
  assert.ok(validData(d));
});
test("a customized checklist is a real task with real step completion and private defaults", () => {
  const d = freshPersonal();
  const hat = attachPackage(d, "trades");
  const taskId = addPackageChecklist(d, hat, checklist);
  const task = d.tasks.find((t) => t.id === taskId)!;
  assert.equal(task.hat, hat);
  assert.equal(task.minutes, 20);
  assert.equal(task.title, "My next job");
  assert.equal(task.steps[1].title, "Confirm arrival");
  assert.equal(task.shared, false);
  assert.throws(() => addPackageChecklist(d, hat, checklist), /already open/);
  assert.equal(d.tasks.length, 1);
  finishStep(task); assert.equal(task.doneAt, null);
  finishStep(task); assert.ok(task.doneAt);
  assert.ok(validData(d));
});
test("invalid checklist input cannot leave a partial task", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "coach");
  for (const patch of [{ date: "2026-02-30" }, { minutes: "0" }, { steps: "" }, { title: "" }]) {
    assert.throws(() => addPackageChecklist(d, hat, { ...checklist, ...patch }));
    assert.equal(d.tasks.length, 0);
  }
});
test("overnight shifts reserve both calendar days through midnight and remove together", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "police");
  d.preferences.unavailableDays = []; d.preferences.weekendStart = "00:00"; d.preferences.weekendEnd = "23:59";
  addPackageBlock(d, hat, night);
  assert.deepEqual(d.events.map((e) => [e.date, e.start, e.end]), [[date, "19:00", "24:00"], ["2026-11-06", "00:00", "07:00"]]);
  assert.ok(dayWindows(d, date).every((w) => w.end <= 19 * 60));
  assert.ok(dayWindows(d, "2026-11-06").every((w) => w.start >= 7 * 60));
  assert.equal(fmtTime("24:00", true), "12:00 AM");
  assert.ok(validData(d));
  removePackageBlock(d, d.events[1]);
  assert.equal(d.events.length, 0);
});
test("24-hour blocks and exact midnight endings do not create empty or missing segments", () => {
  const full = makePackageBlock("work", { ...night, start: "07:00", end: "07:00" });
  assert.equal(full.reduce((n, e) => { const m = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3)); return n + m(e.end) - m(e.start); }, 0), 1440);
  assert.equal(makePackageBlock("work", { ...night, end: "00:00" }).length, 1);
  assert.throws(() => makePackageBlock("work", { ...night, endDate: date }));
  assert.throws(() => makePackageBlock("work", { ...night, endDate: "2026-11-09" }));
  assert.throws(() => makePackageBlock("work", { ...night, start: "25:00" }));
});
test("a conflict on the second day rejects the entire block without partial saves", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "nurse");
  d.events.push({ id: "busy", title: "Appointment", date: "2026-11-06", start: "06:00", end: "08:00", source: "google", allDay: false });
  assert.throws(() => addPackageBlock(d, hat, night), /Appointment/);
  assert.equal(d.events.length, 1);
});
test("backups retain package choices and grouped shifts without auto sharing work", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "firefighter");
  addPackageBlock(d, hat, night); addPackageChecklist(d, hat, checklist);
  const restored = parseBackup(JSON.stringify(d));
  assert.equal(packageHat(restored, "firefighter"), hat);
  assert.deepEqual(restored.events, d.events);
  assert.equal(JSON.stringify([...sharedFromLocal(d).values()]).includes("Night duty"), false);
  const malformed = JSON.parse(JSON.stringify(d)); malformed.hatPackages[hat] = "not-a-package";
  assert.equal(validData(malformed), false);
  malformed.hatPackages[hat] = "chef"; malformed.customHats = [];
  assert.equal(validData(malformed), false);
});
test("hanging up a custom hat cleans the binding and keeps its work under Home", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "driver");
  assert.ok(hat.startsWith("my-"));
  addPackageChecklist(d, hat, checklist); addPackageBlock(d, hat, night);
  hangUpHat(d, hat as `my-${string}`);
  assert.equal(d.hatPackages?.[hat], undefined);
  assert.ok(d.events.every((e) => e.hat === "home"));
  assert.equal(d.tasks[0].hat, "home");
  assert.ok(validData(d));
});

test("explicitly shared overnight shifts still produce a valid plan on the other phone", () => {
  const d = freshPersonal(); const hat = attachPackage(d, "nurse");
  addPackageBlock(d, hat, night);
  d.events.forEach((e) => { e.shared = true; });
  const rows = [...sharedFromLocal(d).values()].map((r) => ({ ...r, deleted: false, updated_at: "2026-11-05T12:00:00Z", updated_by: "sender" }));
  const receiver = freshPersonal();
  mergeRemote(receiver, rows, { householdId: "family", lastPull: "", synced: {} }, "receiver", [{ id: "sender", name: "Sender" }]);
  assert.equal(receiver.events.length, 2);
  assert.equal(receiver.events[0].packageGroup, receiver.events[1].packageGroup);
  assert.ok(validData(receiver));
});
