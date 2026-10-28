import assert from "node:assert/strict";
import test from "node:test";
import { addDays } from "../../engine/dates";
import {
  activityFor,
  budgetSummary,
  captureTask,
  dayWindows,
  finishStep,
  installRoutines,
  makeTask,
  materialize,
  nextOpening,
  planDay,
  reschedule,
  rotateActivity,
  shoppingFor,
} from "../engine";
import { freshPersonal, validData, validDate, type Habit } from "../model";
import { streakFor } from "../streaks";

const today = "2026-10-28";
test("import validation rejects malformed data instead of crashing the next launch", () => {
  const d = freshPersonal();
  assert.equal(validData(d), true);
  assert.equal(validData({ ...d, notes: [null] }), false);
  assert.equal(
    validData({ ...d, preferences: { ...d.preferences, homeTime: "99:99" } }),
    false,
  );
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2026-02-28"), true);
});
test("laundry remains open until every last step is completed", () => {
  const t = makeTask("Laundry", "home", today, {
    steps: ["Wash", "Dry", "Fold", "Put away"].map((title) => ({
      title,
      done: false,
    })),
  });
  for (let i = 0; i < 3; i++) {
    finishStep(t);
    assert.equal(t.doneAt, null);
  }
  finishStep(t, "2026-10-28T20:00:00Z");
  assert.equal(t.doneAt, "2026-10-28T20:00:00Z");
});
test("automatic plans avoid fixed events and the gym", () => {
  const d = freshPersonal();
  d.preferences.gymDays = [3];
  d.events.push({
    id: "event",
    title: "Dinner",
    date: today,
    start: "17:00",
    end: "18:00",
    allDay: false,
    source: "google",
  });
  d.tasks = [
    makeTask("A", "home", today, { minutes: 30 }),
    makeTask("B", "home", today, { minutes: 60 }),
    makeTask("C", "home", today, { minutes: 30 }),
  ];
  for (const item of planDay(d, today, 16 * 60 + 45)) {
    if (!item.time) continue;
    const [h, m] = item.time.split(":").map(Number),
      start = h * 60 + m,
      end = start + item.task.minutes;
    assert.ok(end <= 17 * 60 || start >= 18 * 60);
    assert.ok(end <= 20 * 60 + 30 || start >= 21 * 60 + 30);
  }
});
test("rescheduling never moves a fixed commitment", () => {
  const d = freshPersonal();
  const t = makeTask("Appointment", "myself", today, {
    fixed: true,
    time: "18:00",
  });
  d.tasks = [t];
  const before = JSON.stringify(d);
  assert.equal(reschedule(d, t.id, today, 1100), false);
  assert.equal(JSON.stringify(d), before);
});
test("next opening moves a flexible task beyond a full evening", () => {
  const d = freshPersonal();
  const t = makeTask("Guitar", "myself", today, { minutes: 10 });
  d.tasks = [t];
  const slot = nextOpening(d, t, today, 23 * 60);
  assert.ok(slot);
  assert.equal(slot.date, addDays(today, 1));
  assert.ok(reschedule(d, t.id, today, 23 * 60));
  assert.equal(t.deferred, 1);
});
test("low energy reduces optional load but retains essential care", () => {
  const d = freshPersonal();
  d.tasks = [
    makeTask("Pet care", "pets", today, { essential: true }),
    ...Array.from({ length: 5 }, (_, i) =>
      makeTask(`Optional ${i}`, "myself", today),
    ),
  ];
  d.lowEnergyDays = [today];
  const placed = planDay(d, today).filter((x) => x.time);
  assert.ok(placed.some((x) => x.task.essential));
  assert.equal(placed.filter((x) => !x.task.essential).length, 1);
});
test("recurrence does not multiply unfinished chores", () => {
  const d = freshPersonal();
  installRoutines(d, addDays(today, -1));
  const count = d.tasks.length;
  materialize(d, today);
  assert.equal(d.tasks.length, count);
  const kitchen = d.tasks.find((t) => t.source === "starter-kitchen")!;
  kitchen.steps.forEach((s) => (s.done = true));
  kitchen.doneAt = "2026-10-27T21:00:00Z";
  assert.ok(materialize(d, today));
  materialize(d, today);
  assert.equal(
    d.tasks.filter((t) => t.source === "starter-kitchen" && t.date === today)
      .length,
    1,
  );
});
test("confirmed closures open daytime without modifying calendar events", () => {
  const d = freshPersonal();
  assert.equal(dayWindows(d, today)[0].start, 16 * 60 + 45);
  d.events.push({
    id: "closure",
    title: "Day off",
    date: today,
    start: "00:00",
    end: "23:59",
    allDay: true,
    closure: true,
    source: "hats",
  });
  const before = JSON.stringify(d.events);
  assert.equal(dayWindows(d, today)[0].start, 9 * 60);
  planDay(d, today);
  assert.equal(JSON.stringify(d.events), before);
});
test("daily streak allows today to remain incomplete and deduplicates checks", () => {
  const h: Habit = {
    id: "a",
    title: "Guitar",
    hat: "myself",
    frequency: "daily",
    target: 1,
    checkins: ["2026-10-26", "2026-10-27", "2026-10-27"],
  };
  assert.deepEqual(streakFor(h, today), {
    current: 2,
    best: 2,
    progress: 0,
    target: 1,
    unit: "day",
    done: false,
  });
  h.checkins.push(today);
  assert.equal(streakFor(h, today).current, 3);
});
test("missed daily check resets current streak without erasing best", () => {
  const h: Habit = {
    id: "a",
    title: "Guitar",
    hat: "myself",
    frequency: "daily",
    target: 1,
    checkins: ["2026-10-24", "2026-10-25"],
  };
  const s = streakFor(h, today);
  assert.equal(s.current, 0);
  assert.equal(s.best, 2);
});
test("weekly streak counts weeks meeting the chosen target on distinct days", () => {
  const h: Habit = {
    id: "a",
    title: "Guitar",
    hat: "myself",
    frequency: "weekly",
    target: 3,
    checkins: [
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-26",
      "2026-10-26",
      "2026-10-27",
    ],
  };
  let s = streakFor(h, today);
  assert.equal(s.current, 2);
  assert.equal(s.progress, 2);
  h.checkins.push(today);
  s = streakFor(h, today);
  assert.equal(s.current, 3);
  assert.equal(s.best, 3);
});
test("future check-ins never inflate a streak", () => {
  const h: Habit = {
    id: "a",
    title: "A",
    hat: "home",
    frequency: "daily",
    target: 1,
    checkins: [addDays(today, 1)],
  };
  assert.equal(streakFor(h, today).current, 0);
});
test("shopping ignores known staples and budgets distinguish unknown from zero", () => {
  const d = freshPersonal();
  d.meals = [
    {
      id: "m",
      name: "Rice and eggs",
      ingredients: ["Rice", "Eggs"],
      minutes: 10,
      prep: "",
      favorite: true,
    },
  ];
  d.pantry = ["rice"];
  assert.deepEqual(shoppingFor(d, "m"), ["Eggs"]);
  assert.equal(budgetSummary(d, "takeout", "2026-10").left, null);
  d.preferences.budgets.takeout = 100;
  d.spending.push({
    id: "s",
    title: "Dinner",
    category: "takeout",
    amount: 25,
    date: today,
  });
  assert.equal(budgetSummary(d, "takeout", "2026-10").left, 75);
});
test("capture recognizes tomorrow and explicit am/pm without fabricating a fixed appointment", () => {
  const t = captureTask("Laundry tomorrow at 7 pm", "myself", today);
  assert.equal(t.hat, "home");
  assert.equal(t.date, "2026-10-29");
  assert.equal(t.time, "19:00");
  assert.equal(t.fixed, false);
  assert.equal(t.steps.length, 4);
});
test("another activity produces a different suggestion", () => {
  const d = freshPersonal();
  const first = activityFor(d, today)[0];
  rotateActivity(d, today);
  assert.notEqual(activityFor(d, today)[0], first);
});

test("a private setup profile imports only known fields and links the kitchen habit", async () => {
  const { parseBackup } = await import("../profile");
  const profile = {
    format: "hats-personal-profile",
    preferences: { name: "Sam", partner: "Alex", city: "Springfield", travelMinutes: 30, dateBudget: 100, apiKey: "nope" },
    people: [
      { id: "kid", name: "Robin", role: "child", interests: "puzzles" },
      { name: "Rex", role: "pet" },
      { name: "Boss", role: "coworker" },
    ],
    notes: [{ text: "Likes tulips", hat: "husband", secret: "drop me" }, { text: "bad hat", hat: "work" }],
    habits: [
      { title: "Finish the kitchen", hat: "home", frequency: "daily", target: 1, taskSource: "starter-kitchen" },
      { title: "Guitar", hat: "myself", frequency: "weekly", target: 3, extra: true },
      { title: "Too much", hat: "myself", frequency: "weekly", target: 9 },
    ],
  };
  const data = parseBackup(JSON.stringify(profile), "2026-10-27");
  assert.equal(data.preferences.city, "Springfield");
  assert.equal("apiKey" in data.preferences, false);
  assert.deepEqual(data.people.map((p) => p.name), ["Robin", "Rex"]);
  assert.equal(data.notes.length, 1);
  assert.equal("secret" in data.notes[0], false);
  assert.deepEqual(data.habits?.map((h) => [h.title, h.target, h.taskSource ?? null]), [
    ["Finish the kitchen", 1, "starter-kitchen"],
    ["Guitar", 3, null],
  ]);
  assert.equal("extra" in (data.habits?.[1] ?? {}), false);
  assert.ok(data.tasks.some((t) => t.source === "starter-kitchen"));
  assert.ok(validData(data));
  assert.throws(() => parseBackup(JSON.stringify({ format: "other" })));
});

test("fresh data carries no household location", () => {
  assert.equal(freshPersonal().preferences.city, "");
  assert.ok(validData(freshPersonal()));
});

test("a corrupted weekly target cannot hang the streak count", () => {
  const habit: Habit = { id: "h", title: "x", hat: "myself", frequency: "weekly", target: 0, checkins: [] };
  const s = streakFor(habit, "2026-10-27");
  assert.equal(s.current, 0);
  assert.equal(s.target, 1);
});

test("native screens use no HTML elements (they crash React Native on launch)", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = join(__dirname, "..", "..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== "__tests__") walk(p);
      } else if (p.endsWith(".tsx")) files.push(p);
    }
  };
  walk(join(root, "app"));
  walk(join(root, "personal"));
  const offenders = files.flatMap((f) =>
    [...readFileSync(f, "utf8").matchAll(/(?<![\w.$])<([a-z][a-z0-9]*)(?=[\s/>])/g)].map(
      (m) => `${f.slice(root.length)}: <${m[1]}>`,
    ),
  );
  assert.deepEqual(offenders, []);
});

test("every space and screen hat has sticker art that renders to valid SVG", async () => {
  const { HAT_ART_IDS, hatSvg, hatShapes } = await import("../hatArt");
  const { HATS: spaces } = await import("../model");
  for (const space of Object.values(spaces)) assert.ok(HAT_ART_IDS.includes(space.art));
  assert.equal(new Set(Object.values(spaces).map((s) => s.art)).size, 6, "each space wears a different hat");
  for (const id of HAT_ART_IDS) {
    assert.ok(hatShapes(id).length > 2);
    const svg = hatSvg(id);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 64 64">.*<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});
