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
    preferences: {
      name: "Sam",
      partner: "Alex",
      city: "Springfield",
      travelMinutes: 30,
      dateBudget: 100,
      apiKey: "nope",
    },
    people: [
      { id: "kid", name: "Robin", role: "child", interests: "puzzles" },
      { name: "Rex", role: "pet" },
      { name: "Boss", role: "coworker" },
    ],
    notes: [
      { text: "Likes tulips", hat: "husband", secret: "drop me" },
      { text: "bad hat", hat: "office" },
    ],
    habits: [
      {
        title: "Finish the kitchen",
        hat: "home",
        frequency: "daily",
        target: 1,
        taskSource: "starter-kitchen",
      },
      {
        title: "Guitar",
        hat: "myself",
        frequency: "weekly",
        target: 3,
        extra: true,
      },
      { title: "Too much", hat: "myself", frequency: "weekly", target: 9 },
    ],
  };
  const data = parseBackup(JSON.stringify(profile), "2026-10-27");
  assert.equal(data.preferences.city, "Springfield");
  assert.equal("apiKey" in data.preferences, false);
  assert.deepEqual(
    data.people.map((p) => p.name),
    ["Robin", "Rex"],
  );
  assert.equal(data.notes.length, 1);
  assert.equal("secret" in data.notes[0], false);
  assert.deepEqual(
    data.habits?.map((h) => [h.title, h.target, h.taskSource ?? null]),
    [
      ["Finish the kitchen", 1, "starter-kitchen"],
      ["Guitar", 3, null],
    ],
  );
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
  const habit: Habit = {
    id: "h",
    title: "x",
    hat: "myself",
    frequency: "weekly",
    target: 0,
    checkins: [],
  };
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
    [
      ...readFileSync(f, "utf8").matchAll(
        /(?<![\w.$])<([a-z][a-z0-9]*)(?=[\s/>])/g,
      ),
    ].map((m) => `${f.slice(root.length)}: <${m[1]}>`),
  );
  assert.deepEqual(offenders, []);
});

test("every space and screen hat has sticker art that renders to valid SVG", async () => {
  const { HAT_ART_IDS, hatSvg, hatShapes } = await import("../hatArt");
  const { HATS: spaces } = await import("../model");
  for (const space of Object.values(spaces))
    assert.ok(HAT_ART_IDS.includes(space.art));
  assert.equal(
    new Set(Object.values(spaces).map((s) => s.art)).size,
    7,
    "each space wears a different hat",
  );
  for (const id of HAT_ART_IDS) {
    assert.ok(hatShapes(id).length > 2);
    const svg = hatSvg(id);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 64 64">.*<\/svg>$/);
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
});

test("WHOOP: today's card only uses data scored today and never invents numbers", async () => {
  const { band, whoopToday, whoopLine } = await import("../whoop");
  assert.equal(band(0), "low");
  assert.equal(band(33), "low");
  assert.equal(band(34), "steady");
  assert.equal(band(66), "steady");
  assert.equal(band(67), "high");
  const at = (d: string, h: number) =>
    new Date(`${d}T${String(h).padStart(2, "0")}:00:00`).toISOString();
  const summary = {
    connected: true,
    recovery: [
      { at: at("2026-10-28", 6), score: 28, hrv: 41.2, restingHr: 58 },
      { at: at("2026-10-27", 6), score: 80, hrv: 70, restingHr: 52 },
    ],
    sleep: [
      {
        start: at("2026-10-27", 23),
        end: at("2026-10-28", 6),
        performance: 71,
        hoursAsleep: 5.9,
      },
    ],
    strain: [
      { start: at("2026-10-28", 6), strain: 3.1 },
      { start: at("2026-10-27", 6), strain: 14.2 },
    ],
  };
  const t = whoopToday(summary, "2026-10-28")!;
  assert.equal(t.recovery, 28);
  assert.equal(t.band, "low");
  assert.equal(t.suggestLighter, true);
  assert.equal(t.sleepHours, 5.9);
  assert.equal(t.yesterdayStrain, 14.2);
  assert.equal(whoopLine(t), "Low recovery (28%) · 5.9 h asleep");
  // Before WHOOP scores today: no recovery, no suggestion, honest wording.
  const early = whoopToday(summary, "2026-10-29")!;
  assert.equal(early.recovery, null);
  assert.equal(early.suggestLighter, false);
  assert.match(whoopLine(early), /isn't scored yet/);
  // Not connected: nothing to show.
  assert.equal(whoopToday({ connected: false }, "2026-10-28"), null);
  assert.equal(whoopToday(null, "2026-10-28"), null);
});

test("timeline: evening rhythm, alternating bath nights, and what's 'now'", async () => {
  const { dayTimeline, nowAndNext, isBathNight, isFaded } =
    await import("../timeline");
  const { planDay } = await import("../engine");
  const d = freshPersonal();
  d.preferences.partner = "Alex";
  d.preferences.unavailableDays = [1, 2, 3, 4, 5];
  d.preferences.bathAnchor = "2026-10-28";
  d.people.push({
    id: "k",
    name: "Robin",
    role: "child",
    interests: "",
    detail: "",
  });
  const wed = "2026-10-28";
  // Bath nights alternate and "Not tonight" (moving the anchor) flips them.
  assert.equal(isBathNight(d, wed), true);
  assert.equal(isBathNight(d, "2026-10-29"), false);
  assert.equal(isBathNight(d, "2026-10-30"), true);
  d.preferences.bathAnchor = "2026-10-29";
  assert.equal(isBathNight(d, wed), false);
  d.preferences.bathAnchor = wed;

  const { items } = dayTimeline(d, wed, 17 * 60, wed);
  const keys = items.filter((i) => i.kind === "routine").map((i) => i.key);
  assert.deepEqual(keys, [
    "home",
    "dinner",
    "partner",
    "bath",
    "stories",
    "bedtime",
  ]);
  assert.ok(items.find((i) => i.key === "partner")!.title.includes("Alex"));

  // At 7:20 PM stories (7:15) is "now", not the earlier bath; bedtime is next.
  const later = dayTimeline(d, wed, 19 * 60 + 20, wed).items;
  const { now, next } = nowAndNext(later, 19 * 60 + 20);
  assert.equal(now?.key, "stories");
  assert.equal(next?.key, "bedtime");
  // Routines run themselves: steps whose time has passed count as done.
  const home = later.find((i) => i.key === "home")!;
  assert.equal(home.done, true);
  assert.equal(home.auto, true);
  assert.equal(home.tag, "home");
  assert.equal(isFaded(home, 19 * 60 + 20), false);
  assert.equal(
    isFaded(
      later.find((i) => i.key === "stories")!,
      19 * 60 + 20,
    ),
    false,
  );

  // Checked-off steps are done; tomorrow's timeline starts fresh.
  d.routineDone = { [wed]: ["dinner"] };
  assert.equal(
    dayTimeline(d, wed, 0, wed).items.find((i) => i.key === "dinner")!.done,
    true,
  );
  assert.equal(
    dayTimeline(d, "2026-10-29", 0, wed).items.find((i) => i.key === "dinner")!
      .done,
    false,
  );
  assert.ok(validData(d));

  // The planner keeps dinner, bath, stories, and bedtime free for the family.
  d.tasks.push({
    ...d.tasks[0],
    id: "t1",
    title: "Fold laundry",
    hat: "home",
    date: wed,
    time: null,
    minutes: 30,
    essential: true,
    fixed: false,
    doneAt: null,
    steps: [],
    repeat: "none",
    createdAt: new Date().toISOString(),
    deferred: 0,
  } as never);
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const placed = planDay(d, wed, 17 * 60 + 30).find((x) => x.task.id === "t1")!;
  assert.ok(placed.time);
  const s = mins(placed.time!),
    e = s + 30;
  for (const [a, b] of [
    [17 * 60 + 45, 18 * 60 + 25],
    [18 * 60 + 45, 19 * 60 + 10],
    [19 * 60 + 15, 19 * 60 + 40],
    [19 * 60 + 45, 20 * 60],
  ])
    assert.ok(e <= a || s >= b, `task at ${placed.time} overlaps family time`);
});

test("evening times accept the way people type them", async () => {
  const { parseClock } = await import("../clock");
  assert.equal(parseClock("5:45 pm"), "17:45");
  assert.equal(parseClock("5:45PM"), "17:45");
  assert.equal(parseClock("545pm"), "17:45");
  assert.equal(parseClock("6 pm"), "18:00");
  assert.equal(parseClock("17:45"), "17:45");
  assert.equal(parseClock("12:15 am"), "00:15");
  assert.equal(parseClock("12 pm"), "12:00");
  assert.equal(parseClock("7:5"), null);
  assert.equal(parseClock("25:00"), null);
  assert.equal(parseClock("13 pm"), null);
  assert.equal(parseClock("dinner"), null);
});

test("capture: what you say lands on the right day and time", async () => {
  const { understand, addUnderstood } = await import("../understand");
  const { dayTimeline } = await import("../timeline");
  const d = freshPersonal();
  d.preferences.partner = "Alex";
  d.people.push(
    { id: "k1", name: "Robin", role: "child", interests: "", detail: "" },
    { id: "f1", name: "Sam", role: "friend", interests: "", detail: "" },
    { id: "p1", name: "Rex", role: "pet", interests: "", detail: "" },
  );
  const wed = "2026-10-28"; // a Wednesday
  const one = (text: string, now = 9 * 60) =>
    understand(text, d, wed, "home", now)[0];

  // The exact example: an event on Thursday at 5pm.
  let u = one("event on Thursday at 5pm");
  assert.equal(u.kind, "event");
  assert.equal(u.date, "2026-10-29");
  assert.equal(u.time, "17:00");

  u = one("Robin's dance class Thursday at 4:30");
  assert.deepEqual(
    [u.kind, u.date, u.time, u.hat],
    ["event", "2026-10-29", "16:30", "dad"],
  );
  assert.match(u.title, /dance class/i);

  u = one("dentist next Tuesday at 9am");
  assert.deepEqual(
    [u.kind, u.date, u.time, u.hat],
    ["event", "2026-11-03", "09:00", "myself"],
  );

  u = one("dinner with Sam Nov 3 at 7");
  assert.deepEqual(
    [u.kind, u.date, u.time, u.hat],
    ["event", "2026-11-03", "19:00", "friends"],
  );

  u = one("Rex vet appointment Friday 10:30am");
  assert.deepEqual(
    [u.kind, u.date, u.time, u.hat],
    ["event", "2026-10-30", "10:30", "pets"],
  );

  u = one("Alex and I date night Saturday at 6pm for 3 hours");
  assert.deepEqual(
    [u.kind, u.date, u.time, u.minutes, u.hat],
    ["event", "2026-10-31", "18:00", 180, "husband"],
  );

  // Chores stay to-dos, on the day you said.
  u = one("buy flowers Friday");
  assert.deepEqual([u.kind, u.date, u.time], ["task", "2026-10-30", null]);
  u = one("call the plumber tomorrow at 3pm");
  assert.deepEqual([u.kind, u.date, u.time], ["task", "2026-10-29", "15:00"]);

  // A birthday party with no time is an all-day event.
  u = one("Robin birthday party Saturday");
  assert.deepEqual([u.kind, u.date, u.time], ["event", "2026-10-31", null]);

  // A time that already passed today, with no day said, means tomorrow.
  u = one("pediatrician at 9am", 20 * 60);
  assert.deepEqual([u.date, u.time], ["2026-10-29", "09:00"]);

  // Several thoughts at once become several items.
  const many = understand(
    "swim lesson Saturday at 10, buy diapers tomorrow, and call Sam Sunday",
    d,
    wed,
    "home",
    9 * 60,
  );
  assert.equal(many.length, 3);
  assert.deepEqual(
    many.map((x) => [x.kind, x.date]),
    [
      ["event", "2026-10-31"],
      ["task", "2026-10-29"],
      ["task", "2026-11-01"],
    ],
  );

  // Saved events show on that day's timeline at that time.
  addUnderstood(d, [
    one("event on Thursday at 5pm"),
    one("Robin birthday party Saturday"),
  ]);
  const thu = dayTimeline(d, "2026-10-29", 0, wed);
  const ev = thu.items.find((i) => i.kind === "event");
  assert.equal(ev?.time, "17:00");
  assert.equal(ev?.end, "18:00");
  assert.equal(dayTimeline(d, "2026-10-31", 0, wed).allDay.length, 1);
  assert.ok(validData(d));
});

test("automation: skipped routines, the log, undo, energy, dinners, Google", async () => {
  const { routineSteps } = await import("../timeline");
  const {
    applyEnergy,
    didToday,
    logView,
    mergeGoogle,
    planWeek,
    setSkipped,
    undoEntry,
  } = await import("../auto");
  const d = freshPersonal();
  d.preferences.onboarded = true;
  d.preferences.partner = "Alex";
  d.preferences.gymDays = [3];
  d.people.push({
    id: "k",
    name: "Robin",
    role: "child",
    interests: "",
    detail: "",
  });
  const wed = "2026-10-28";
  const night = 21 * 60;
  // Yesterday's routine all counted; skipping one sticks and is not "done".
  let steps = routineSteps(d, "2026-10-27", { today: wed, nowMin: night });
  assert.ok(steps.every((s) => s.done && s.auto));
  setSkipped(d, "2026-10-27", "bath", true);
  steps = routineSteps(d, "2026-10-27", { today: wed, nowMin: night });
  const bath = steps.find((s) => s.key === "bath");
  if (bath) {
    assert.equal(bath.done, false);
    assert.equal(bath.skipped, true);
  }
  // Upcoming steps aren't assumed.
  assert.ok(
    routineSteps(d, wed, { today: wed, nowMin: 12 * 60 }).every((s) => !s.done),
  );
  // The log folds in routine auto-checks, counted in "Hats did N".
  assert.ok(didToday(d, wed, night) > 0);
  assert.ok(logView(d, wed, night).some((e) => e.id === `routines:${wed}`));

  // Low recovery lightens the day once; undo sticks for that day.
  assert.equal(applyEnergy(d, wed, 70), false);
  assert.equal(applyEnergy(d, wed, 22), true);
  assert.ok(d.lowEnergyDays.includes(wed));
  assert.equal(applyEnergy(d, wed, 22), false);
  // Gym becomes rest on a lighter day.
  const keys = routineSteps(d, wed).map((s) => s.key);
  assert.ok(keys.includes("rest") && !keys.includes("gym"));
  const entry = d.log!.find((e) => e.undo?.t === "notLighter")!;
  assert.equal(undoEntry(d, entry.id), true);
  assert.equal(d.lowEnergyDays.includes(wed), false);
  assert.equal(undoEntry(d, entry.id), false);
  assert.equal(applyEnergy(d, wed, 10), false);

  // Dinners: the week fills itself, rotating, and adds groceries; undo clears.
  d.meals = ["Tacos", "Pasta", "Chicken & rice", "Breakfast for dinner"].map(
    (name, i) => ({
      id: `m${i}`,
      name,
      ingredients: [`${name} stuff`],
      minutes: 20 + i * 5,
      prep: "",
      favorite: i === 0,
    }),
  );
  assert.equal(planWeek(d, wed), 7);
  const week = Array.from({ length: 7 }, (_, i) => d.dinners[addDays(wed, i)]);
  assert.ok(week.every(Boolean));
  assert.ok(new Set(week.slice(0, 4)).size === 4, "no repeats in a row");
  assert.ok(d.groceries.length > 0);
  assert.equal(planWeek(d, wed), 0);
  const dinners = d.log!.find((e) => e.undo?.t === "clearDinners")!;
  undoEntry(d, dinners.id);
  assert.equal(Object.keys(d.dinners).length, 0);
  assert.equal(d.groceries.length, 0);
  assert.equal(planWeek(d, wed), 0, "an undone week isn't re-planned");

  // Google: only new events are logged; a repeat read stays quiet.
  const ev = {
    id: "google:c:e1:2026-10-29",
    title: "Dance class",
    date: "2026-10-29",
    start: "16:30",
    end: "17:15",
    allDay: false,
    source: "google" as const,
  };
  const before = d.log!.length;
  assert.equal(mergeGoogle(d, wed, [ev]), 1);
  assert.equal(d.log!.length, before + 1);
  assert.equal(mergeGoogle(d, wed, [ev]), 0);
  assert.equal(d.log!.length, before + 1);
  assert.ok(validData(d));
});

test("capture: a follow-up belongs to the day it points at; today's weekday means next week", async () => {
  const { understand } = await import("../understand");
  const d = freshPersonal();
  const out = understand(
    "Field trip Friday. Pack lunch. Sign the form Wednesday.",
    d,
    "2026-10-28",
    "dad",
    21 * 60,
  );
  assert.deepEqual(
    out.map((u) => [u.kind, u.title, u.date]),
    [
      ["event", "Field trip", "2026-10-30"],
      ["task", "Pack lunch", "2026-10-30"],
      ["task", "Sign the form", "2026-11-04"],
    ],
  );
  // "today" still means today, and unrelated to-dos don't borrow a day.
  const b = understand(
    "Dentist Friday. Buy milk",
    d,
    "2026-10-28",
    "home",
    600,
  );
  assert.equal(b[1].date, "2026-10-28");
});

test("school day: classes on Today, the current period is the big card, CPT takes an off period", async () => {
  const { dayTimeline, nowAndNext } = await import("../timeline");
  const { schoolBlocks, dayFields, dayFrom, STANDARD_WEEK } = await import("../school");
  const d = freshPersonal();
  d.preferences.unavailableDays = [1, 2, 3, 4, 5];
  const thu = "2026-10-29";
  d.events.push({ id: "cpt", title: "CPT Gr. 6-8 Science", date: thu, start: "08:35", end: "09:28", allDay: false, source: "google" });

  // Before school: homeroom is up next, then the CPT meeting in the Specials off period (shown once).
  const early = dayTimeline(d, thu, 6 * 60 + 50, thu);
  const work = early.items.filter((i) => i.kind === "work");
  assert.deepEqual(
    work.map((i) => i.title),
    ["Homeroom", "CPT Gr. 6-8 Science", "7B Science", "7D Science", "Off period", "Advisory", "Lunch", "7A Science", "7C Science", "Dismissal"],
  );
  assert.equal(early.items.filter((i) => i.title === "CPT Gr. 6-8 Science").length, 1);
  assert.equal(work[1].detail, "Period 1 · during Specials");
  const before = nowAndNext(early.items, 6 * 60 + 50);
  assert.equal(before.now?.title, "Homeroom");
  assert.equal(before.next?.title, "CPT Gr. 6-8 Science");

  // 9:40 on Thursday is Period 2 with 7B; 7D is next. Earlier blocks are done.
  const mid = dayTimeline(d, thu, 9 * 60 + 40, thu).items;
  const now = nowAndNext(mid, 9 * 60 + 40);
  assert.equal(now.now?.title, "7B Science");
  assert.equal(now.now?.section, "7B");
  assert.equal(now.now?.detail, "Period 2");
  assert.equal(now.next?.title, "7D Science");
  // RBR and Specials are off periods, labeled as such.
  const rbr = nowAndNext(dayTimeline(d, thu, 11 * 60 + 40, thu).items, 11 * 60 + 40).now;
  assert.equal(rbr?.title, "Off period");
  assert.equal(rbr?.detail, "Period 4 · RBR");
  assert.equal(rbr?.block, "off");
  assert.equal(mid.find((i) => i.title === "Homeroom")?.done, true);
  // In the 3 minutes between periods, the next class is up next.
  assert.equal(nowAndNext(dayTimeline(d, thu, 10 * 60 + 25, thu).items, 10 * 60 + 25).now?.title, "7D Science");

  // The week matches the bell schedule grid.
  assert.deepEqual(schoolBlocks(d, "2026-10-26").filter((b) => b.kind === "class").map((b) => b.section), ["7A", "7C", "7B", "7D"]);
  assert.equal(schoolBlocks(d, "2026-10-27").find((b) => b.period === 4)?.title, "7B Boost");
  assert.equal(schoolBlocks(d, "2026-10-30").find((b) => b.period === 4)?.title, "7C Boost");

  // No school day on weekends, closures, or with it turned off.
  assert.deepEqual(schoolBlocks(d, "2026-10-31"), []);
  d.events.push({ id: "closed", title: "No school", date: "2026-10-30", start: "00:00", end: "23:59", allDay: true, source: "hats", closure: true });
  assert.deepEqual(schoolBlocks(d, "2026-10-30"), []);
  d.preferences.school = { on: false };
  assert.deepEqual(schoolBlocks(d, thu), []);
  assert.equal(validData(d), true);

  // Editing a day keeps the bell times; bad entries say what's wrong.
  const f = dayFields(STANDARD_WEEK["2"]);
  assert.deepEqual(f, { p2: "7B", p3: "7D", p4: "7B Boost", p5: "Advisory", p6: "7A", p7: "7C" });
  const edited = dayFrom({ ...f, p2: "7c", p4: "rbr", p5: "recess" });
  assert.equal(edited.find((b) => b.period === 2)?.section, "7C");
  assert.equal(edited.find((b) => b.period === 4)?.title, "Off period");
  assert.equal(edited.find((b) => b.period === 4)?.note, "RBR");
  assert.equal(dayFields(edited).p4, "RBR");
  assert.throws(() => dayFrom({ ...f, p4: "lunch duty" }), /Period 4/);
  d.preferences.school = { on: true, week: { "4": edited } };
  assert.equal(validData(d), true);
  assert.equal(schoolBlocks(d, thu).find((b) => b.period === 2)?.title, "7C Science");
  d.preferences.school = { on: true, week: { "4": [{ start: "10:00", end: "09:00", title: "x", kind: "class" }] } };
  assert.equal(validData(d), false);
});

test("hat library: every hat is on a shelf, and names suggest hats that fit", async () => {
  const { HAT_ART_IDS, hatSvg } = await import("../hatArt");
  const { LIBRARY, SHELVES, suggestHats, searchHats } = await import("../hatLibrary");
  const arts = HAT_ART_IDS.filter((a) => a !== "stack");
  assert.ok(arts.length >= 40);
  assert.deepEqual([...LIBRARY.map((h) => h.art)].sort(), [...arts].sort());
  for (const h of LIBRARY) {
    assert.ok(SHELVES.includes(h.shelf));
    assert.match(hatSvg(h.art), /^<svg[^]*<\/svg>$/);
    assert.ok(!/NaN|undefined/.test(hatSvg(h.art)), h.art);
  }
  const first = (name: string) => suggestHats(name)[0]?.art;
  assert.equal(first("Garden"), "straw");
  assert.equal(first("Band"), "headphones");
  assert.equal(first("Side hustle"), "bowler");
  assert.equal(first("Science club"), "goggles");
  assert.ok(suggestHats("Coach").some((h) => h.art === "football"));
  assert.ok(suggestHats("Coach").some((h) => h.art === "captain"));
  assert.ok(suggestHats("Baking").some((h) => h.art === "chef"));
  assert.deepEqual(suggestHats(""), []);
  assert.equal(searchHats("cowboy")[0].art, "cowboy");
  assert.ok(searchHats("winter").some((h) => h.art === "earmuffs"));
  assert.equal(searchHats("").length, LIBRARY.length);
});

test("hats you add: saved, looked up, routed by name, and hung up without losing anything", async () => {
  const { understand } = await import("../understand");
  const { customHatId, hangUpHat, hatDef, allHats, setCustomHats } = await import("../model");
  const d = freshPersonal();
  const id = customHatId("Garden", []);
  assert.equal(id, "my-garden");
  d.customHats = [{ id, name: "Garden", art: "straw", createdAt: "2026-10-29T11:00:00.000Z" }];
  assert.equal(customHatId("Garden", d.customHats), "my-garden-2");
  assert.equal(customHatId("Dad’s band!", d.customHats), "my-dads-band");
  assert.equal(validData(d), true);

  const def = hatDef(id, d.customHats);
  assert.equal(def.name, "Garden");
  assert.equal(def.art, "straw");
  assert.equal(allHats(d.customHats).at(-1), id);
  // The store keeps the lookup in step, so screens can look hats up by id alone.
  setCustomHats(d.customHats);
  assert.equal(hatDef(id).name, "Garden");
  // A hat that's gone looks like Home instead of breaking a screen.
  assert.equal(hatDef("my-gone").name, "Home");

  // Saying the hat's name puts it under that hat.
  assert.equal(understand("water the garden tomorrow", d, today, "home")[0].hat, id);
  assert.equal(understand("buy tomato plants for the gardens", d, today, "home")[0].hat, id);
  assert.equal(captureTask("weed the garden", "home", today).hat, id);
  assert.notEqual(understand("laundry", d, today, "home")[0].hat, id);

  d.tasks.push(makeTask("Plant bulbs", id, today));
  d.notes.push({ id: "n1", hat: id, kind: "idea", text: "Raised beds", createdAt: "2026-10-29T11:00:00.000Z" });
  assert.equal(validData(d), true);
  hangUpHat(d, id);
  assert.deepEqual(d.customHats, []);
  assert.equal(d.tasks.at(-1)?.hat, "home");
  assert.equal(d.notes.at(-1)?.hat, "home");
  assert.equal(validData(d), true);
  setCustomHats([]);

  // Bad saved hats are refused instead of crashing the next launch.
  assert.equal(validData({ ...d, customHats: [{ id: "garden", name: "x", art: "cap", createdAt: "" }] } as never), false);
  assert.equal(validData({ ...d, customHats: [{ id: "my-x", name: "", art: "cap", createdAt: "" }] } as never), false);
  assert.equal(validData({ ...d, customHats: [{ id: "my-x", name: "X", art: "sombrero", createdAt: "" }] } as never), false);
  const twice = { id: "my-x", name: "X", art: "cap", createdAt: "" };
  assert.equal(validData({ ...d, customHats: [twice, twice] } as never), false);
  assert.equal(validData({ ...d, tasks: [makeTask("x", "office" as never, today)] }), false);
});

test("recipe library: every card is complete, drawn, and shoppable", async () => {
  const { RECIPES, AISLES, sameItem, isStaple, aisleFor, byAisle } = await import("../recipes");
  const { FOOD_ART_IDS } = await import("../foodArt");
  assert.ok(RECIPES.length >= 30);
  assert.equal(new Set(RECIPES.map((r) => r.id)).size, RECIPES.length);
  for (const r of RECIPES) {
    assert.ok(FOOD_ART_IDS.includes(r.art), r.id);
    assert.ok(r.ingredients.length >= 4 && r.steps.length >= 3 && r.kids.length > 5, r.id);
    assert.ok(r.minutes > 0 && r.serves > 0, r.id);
    for (const x of r.ingredients) assert.ok(AISLES.includes(x.aisle), `${r.id} ${x.item}`);
    if (r.tags.includes("slow-cooker")) assert.ok(r.wait, r.id);
  }
  assert.ok(sameItem("Eggs", "egg"));
  assert.ok(sameItem("baby spinach", "spinach"));
  assert.ok(sameItem("shredded cheese", "Cheese"));
  assert.ok(!sameItem("garlic", "garlic powder"));
  assert.ok(!sameItem("rice", "spaghetti or rice noodles"));
  assert.ok(isStaple("Salt") && isStaple("olive oil"));
  assert.ok(!isStaple("bell peppers"));
  assert.equal(aisleFor("milk"), "Dairy & eggs");
  assert.equal(aisleFor("Bananas"), "Produce");
  assert.equal(aisleFor("chicken breasts"), "Meat & fish");
  assert.equal(aisleFor("paper towels"), "Other");
  assert.deepEqual(
    byAisle(["paper towels", "milk", "bananas", "rice"]).map((g) => g.aisle),
    ["Produce", "Dairy & eggs", "Pantry", "Other"],
  );
});

test("dinner ideas: ranked for the night, planned in a tap, and shopped for", async () => {
  const { suggestRecipes, dinnerFor, findMeal, missingFor, planDinner, nextDinner, haveCount } = await import("../meals");
  const { planWeek } = await import("../auto");
  const { recipeById } = await import("../recipes");
  const d = freshPersonal();
  // With nothing saved, tonight still has an idea from the library, not a plan.
  const idea = dinnerFor(d, today);
  assert.equal(idea.planned, false);
  assert.ok(idea.meal && recipeById(idea.meal.id));
  // The deck changes with the filter and never shows hidden cards.
  const quick = suggestRecipes(d, today, "quick");
  assert.ok(quick.length && quick.every((r) => r.tags.includes("quick")));
  d.hiddenRecipes = [quick[0].id];
  assert.ok(!suggestRecipes(d, today, "quick", 40).some((r) => r.id === quick[0].id));
  assert.equal(validData(d), true);
  // What's in the kitchen moves a recipe up.
  const tacos = recipeById("r-turkey-tacos")!;
  d.pantry = tacos.ingredients.map((x) => x.item);
  assert.equal(haveCount(d, tacos).have, haveCount(d, tacos).of);
  assert.equal(suggestRecipes(d, today, "pantry")[0].id, "r-turkey-tacos");
  // Planning a library recipe adds only what's missing (no staples, nothing already home).
  d.pantry = ["Eggs", "milk"];
  const added = planDinner(d, today, "r-frittata");
  assert.ok(added.includes("shredded cheese") && !added.includes("eggs") && !added.includes("olive oil"));
  assert.equal(dinnerFor(d, today).planned, true);
  assert.equal(findMeal(d, "r-frittata")?.name, "Veggie frittata");
  assert.deepEqual(missingFor(d, "r-frittata").sort(), [...added].sort());
  assert.equal(validData(d), true);
  // Nearby nights don't repeat, and swapping skips what's already planned this week.
  assert.ok(!suggestRecipes(d, addDays(today, 1), "all", 5).some((r) => r.id === "r-frittata"));
  assert.notEqual(nextDinner(d, today, ["r-frittata"])?.id, "r-frittata");
  // Hats only fills the week from the library when asked.
  const e = freshPersonal();
  assert.equal(planWeek(e, today), 0);
  assert.equal(planWeek(e, today, true), 7);
  assert.equal(new Set(Object.values(e.dinners)).size, 7);
  assert.ok(e.groceries.length > 10);
  assert.equal(validData(e), true);
  // A lighter day leans quick.
  const f = freshPersonal();
  f.lowEnergyDays = [today];
  const easy = suggestRecipes(f, today, "all", 3);
  assert.ok(easy.every((r) => r.minutes <= 30), easy.map((r) => `${r.id} ${r.minutes}`).join(", "));
});

test("a week of dinner ideas never repeats a night", async () => {
  const { weekDinners } = await import("../meals");
  const d = freshPersonal();
  const dates = Array.from({ length: 7 }, (_, n) => addDays(today, n));
  d.dinners[dates[2]] = "r-turkey-tacos";
  const w = weekDinners(d, dates);
  assert.equal(w[2].planned, true);
  assert.equal(w.filter((x) => x.planned).length, 1);
  assert.equal(new Set(w.map((x) => x.meal?.id)).size, 7);
});

test("saying groceries puts them on the list, not the to-dos", async () => {
  const { groceryItems } = await import("../recipes");
  assert.deepEqual(groceryItems("We need milk and eggs"), ["milk", "eggs"]);
  assert.deepEqual(groceryItems("add bananas, some bread & coffee to the grocery list"), ["bananas", "bread", "coffee"]);
  assert.deepEqual(groceryItems("We're out of coffee."), ["coffee"]);
  assert.deepEqual(groceryItems("grocery list: paper towels, apples"), ["paper towels", "apples"]);
  assert.deepEqual(groceryItems("buy chicken thighs"), ["chicken thighs"]);
  assert.equal(groceryItems("buy a birthday gift for Mom"), null);
  assert.equal(groceryItems("pick up the kids at 3"), null);
  assert.equal(groceryItems("call the dentist"), null);
});

test("a slow-cooker dinner puts a start reminder on the morning", async () => {
  const { dayTimeline } = await import("../timeline");
  const d = freshPersonal();
  const thu = "2026-10-29";
  d.dinners[thu] = "r-slow-cooker-chili";
  const start = dayTimeline(d, thu, 6 * 60, thu).items.find((i) => i.key === "slowcook");
  assert.equal(start?.time, "07:00");
  assert.match(start?.title ?? "", /Start the slow cooker · Slow-cooker turkey chili/);
  d.dinners[thu] = "r-turkey-tacos";
  assert.equal(dayTimeline(d, thu, 6 * 60, thu).items.some((i) => i.key === "slowcook"), false);
});

test("birthdays show on the day and a week ahead, under the right hat", async () => {
  const { dayTimeline } = await import("../timeline");
  const d = freshPersonal();
  d.people.push({ id: "ava", name: "Ava", role: "child", interests: "", detail: "", birthday: "2019-11-05" });
  const on = dayTimeline(d, "2026-11-05", 600, "2026-11-05").allDay;
  assert.deepEqual(on.map((x) => [x.title, x.hat]), [["Ava’s birthday 🎂", "dad"]]);
  const soon = dayTimeline(d, "2026-10-29", 600, "2026-10-29").allDay;
  assert.equal(soon[0]?.title, "Ava’s birthday is in a week");
  assert.equal(dayTimeline(d, "2026-10-30", 600, "2026-10-30").allDay.length, 0);
});
