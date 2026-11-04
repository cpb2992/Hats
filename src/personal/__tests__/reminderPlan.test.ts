import test from "node:test";
import assert from "node:assert/strict";
import { freshPersonal } from "../model";
import { makeTask } from "../engine";
import { applyPersonalReminders, currentPlanNotice, noticeRevision, personalReminderPlan, reminderChanges, type Notice, type SavedNotice, type ReminderPort } from "../reminderPlan";

const date = "2026-11-03";
function setup() {
  const data = freshPersonal();
  data.preferences.notifications = true;
  data.preferences.school = { on: false };
  data.preferences.kidsRoutine = false;
  data.preferences.unavailableDays = [];
  data.preferences.weekendStart = "09:00";
  data.preferences.weekendEnd = "16:00";
  return data;
}
test("live notice names the real task and advances when a step is done", () => {
  const data = setup();
  data.tasks.push(makeTask("Laundry", "home", date, { minutes: 20, steps: [{ title: "Wash", done: false }, { title: "Dry", done: false }] }));
  const before = currentPlanNotice(data, date, 9 * 60)!;
  assert.match(before.title, /Laundry/);
  assert.match(before.body, /Next: Wash/);
  data.tasks[0].steps[0].done = true;
  assert.match(currentPlanNotice(data, date, 9 * 60)!.body, /Next: Dry/);
  assert.notEqual(noticeRevision(before), noticeRevision(currentPlanNotice(data, date, 9 * 60)!));
});
test("a minute tick doesn't repost a flexible task just because its planned slot moved", () => {
  const data = setup();
  data.tasks.push(makeTask("Tidy the kitchen", "home", date));
  assert.deepEqual(currentPlanNotice(data, date, 540), currentPlanNotice(data, date, 541));
});
test("current class and next class come from the actual school schedule", () => {
  const data = setup();
  data.preferences.school = { on: true, week: { "2": [
    { start: "09:00", end: "09:45", title: "7A Science", kind: "class", section: "7A" },
    { start: "09:50", end: "10:35", title: "7B Science", kind: "class", section: "7B" },
  ] } };
  data.preferences.unavailableDays = [2];
  assert.match(currentPlanNotice(data, date, 9 * 60 + 10)!.title, /Now: 7A Science/);
  assert.match(currentPlanNotice(data, date, 9 * 60 + 46)!.title, /Up next: 7B Science/);
  assert.match(currentPlanNotice(data, date, 10 * 60)!.title, /Now: 7B Science/);
  assert.equal(currentPlanNotice(data, date, 10 * 60)!.taskId, undefined);
});
test("old and ended fixed appointments never get stuck on the persistent card", () => {
  const data = setup();
  data.tasks.push(makeTask("Yesterday", "work", "2026-11-02", { fixed: true, time: "14:00" }));
  data.tasks.push(makeTask("Ended", "work", date, { fixed: true, time: "08:00" }));
  const notice = currentPlanNotice(data, date, 13 * 60)!;
  assert.doesNotMatch(notice.title, /Yesterday|Ended/);
});
test("timed alerts show task, time and next step instead of the same generic message", () => {
  const data = setup();
  data.tasks.push(makeTask("Prepare tomorrow's lesson", "work", date, { fixed: true, time: "14:00", steps: [{ title: "Make copies", done: false }] }));
  const plan = personalReminderPlan(data, new Date(`${date}T09:00:00`));
  const alert = plan.scheduled.find((n) => n.taskId)!;
  assert.equal(alert.title, "Prepare tomorrow's lesson");
  assert.match(alert.body, /2:00 PM.*Next: Make copies/);
  assert.equal(alert.at, new Date(`${date}T14:00:00`).toISOString());
});
test("digest identifiers are stable dates; changing data never creates another copy", () => {
  const data = setup();
  const first = personalReminderPlan(data, new Date(`${date}T09:00:00`));
  const next = personalReminderPlan(data, new Date(`${date}T09:01:00`));
  assert.deepEqual(reminderChanges(first.scheduled.map((n) => ({ identifier: n.identifier, revision: noticeRevision(n) })), next.scheduled), { cancel: [], schedule: [] });
  assert.ok(first.scheduled.some((n) => n.identifier === `personal-evening-${date}`));
});

function fake() {
  const scheduled = new Map<string, SavedNotice>();
  const presented = new Map<string, SavedNotice>();
  const calls: string[] = [];
  const port: ReminderPort = {
    scheduled: async () => [...scheduled.values()],
    presented: async () => [...presented.values()],
    cancel: async (id) => { calls.push(`cancel:${id}`); scheduled.delete(id); },
    dismiss: async (id) => { calls.push(`dismiss:${id}`); presented.delete(id); },
    post: async (n, live) => { calls.push(`post:${n.identifier}`); (live ? presented : scheduled).set(n.identifier, { identifier: n.identifier, revision: noticeRevision(n) }); },
  };
  return { port, scheduled, presented, calls };
}
const notice: Notice = { identifier: "personal-now", title: "Hats · Now: Kitchen reset", body: "Next: Wipe counters", url: "/", taskId: "kitchen" };
test("twenty unrelated saves cause zero repeat posts after the first native update", async () => {
  const f = fake();
  const plan = { live: notice, scheduled: [{ ...notice, identifier: "personal-task-kitchen", at: "2026-11-03T19:00:00Z" }] };
  for (let i = 0; i < 20; i++) await applyPersonalReminders(f.port, plan, true, true);
  assert.deepEqual(f.calls, ["post:personal-task-kitchen", "post:personal-now"]);
  await applyPersonalReminders(f.port, { ...plan, live: { ...notice, body: "Next: Sweep floor" } }, true, true);
  assert.equal(f.calls.filter((c) => c === "post:personal-now").length, 2);
});
test("legacy generic notices are retired, without touching a running focus timer", async () => {
  const f = fake();
  f.scheduled.set("sync-old", { identifier: "sync-old" });
  f.scheduled.set("focus-end", { identifier: "focus-end" });
  f.presented.set("personal-now", { identifier: "personal-now" });
  f.presented.set("personal-task-old", { identifier: "personal-task-old" });
  f.presented.set("focus-live", { identifier: "focus-live" });
  await applyPersonalReminders(f.port, { live: notice, scheduled: [] }, true, true);
  assert.deepEqual(f.calls, ["cancel:sync-old", "dismiss:personal-task-old", "dismiss:personal-now", "post:personal-now"]);
  assert.ok(f.scheduled.has("focus-end"));
  assert.ok(f.presented.has("focus-live"));
});
test("disabling notifications clears owned schedules and presented notices", async () => {
  const f = fake();
  f.presented.set("personal-now", { identifier: "personal-now", revision: noticeRevision(notice) });
  f.scheduled.set("personal-task-a", { identifier: "personal-task-a" });
  await applyPersonalReminders(f.port, { live: notice, scheduled: [] }, false, true);
  assert.deepEqual(f.calls, ["cancel:personal-task-a", "dismiss:personal-now"]);
  assert.deepEqual(personalReminderPlan({ ...setup(), preferences: { ...setup().preferences, notifications: false } }), { live: null, scheduled: [] });
});
test("iOS does not receive a reposted ongoing card", async () => {
  const f = fake();
  await applyPersonalReminders(f.port, { live: notice, scheduled: [] }, true, false);
  assert.deepEqual(f.calls, []);
});
test("completed tasks and day-end clear a stale task card", async () => {
  const data = setup();
  data.tasks.push(makeTask("Kitchen", "home", date, { doneAt: `${date}T10:00:00` }));
  assert.equal(currentPlanNotice(data, date, 23 * 60), null);
  const f = fake();
  f.presented.set("personal-now", { identifier: "personal-now", revision: noticeRevision(notice) });
  await applyPersonalReminders(f.port, { live: null, scheduled: [] }, true, true);
  assert.deepEqual(f.calls, ["dismiss:personal-now"]);
});

// Regression: minute refreshes used to cancel alerts one minute before delivery.
test("imminent alarms survive minute ticks and delayed OS delivery without reposting", () => {
  const data = setup();
  data.tasks.push(makeTask("Leave for pickup", "home", date, { fixed: true, time: "14:00", minutes: 30 }));
  const initial = personalReminderPlan(data, new Date(`${date}T13:58:00`));
  const alert = initial.scheduled.find(n => n.taskId)!;
  const existing = [{identifier: alert.identifier, revision: noticeRevision(alert)}];
  for (const time of ["13:59:00", "13:59:59", "14:00:00", "14:04:00"]) {
    const desired = personalReminderPlan(data, new Date(`${date}T${time}`)).scheduled;
    const changes = reminderChanges(existing, desired);
    assert.ok(!changes.cancel.includes(alert.identifier), time);
    assert.ok(!changes.schedule.some(n => n.identifier === alert.identifier), time);
  }
  const late = personalReminderPlan(data, new Date(`${date}T14:04:00`)).scheduled;
  assert.ok(!reminderChanges([], late).schedule.some(n => n.identifier === alert.identifier), "do not re-alert after delivery or fresh setup");
  data.tasks = [];
  assert.ok(reminderChanges(existing, personalReminderPlan(data,new Date(`${date}T14:04:00`)).scheduled).cancel.includes(alert.identifier), "deletion still cancels immediately");
});

test("a late-night queued alarm survives midnight without replay on a new install", () => {
  const data=setup();
  data.tasks.push(makeTask("Late arrival", "home", date, { fixed:true,time:"23:59" }));
  const first=personalReminderPlan(data,new Date(`${date}T23:57:00`)).scheduled.find(n=>n.taskId)!;
  const next=personalReminderPlan(data,new Date("2026-11-04T00:01:00")).scheduled;
  const changes=reminderChanges([{identifier:first.identifier,revision:noticeRevision(first)}],next);
  assert.ok(!changes.cancel.includes(first.identifier));
  assert.ok(!reminderChanges([],next).schedule.some(n=>n.identifier===first.identifier));
});
