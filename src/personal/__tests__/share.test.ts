import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal, validData, type PersonalData, type PersonalEvent } from "../model";
import {
  changesToSend,
  eventShared,
  markSent,
  mergeRemote,
  newest,
  sharedFromLocal,
  type Member,
  type OutRow,
  type RemoteRow,
  type ShareState,
} from "../share";

const today = "2026-10-29";
const members: Member[] = [
  { id: "chris", name: "Chris" },
  { id: "jess", name: "Jess" },
];

/** A tiny stand-in for the server: one row per id, stamped in order. */
function server() {
  const rows = new Map<string, RemoteRow>();
  let clock = Date.parse("2026-10-29T12:00:00Z");
  return {
    rows,
    push(out: OutRow[], by: string) {
      for (const r of out) {
        clock += 1000;
        rows.set(r.id, { id: r.id, kind: r.kind, payload: r.payload, deleted: r.deleted, updated_at: new Date(clock).toISOString(), updated_by: by });
      }
    },
    pull(since: string) {
      return [...rows.values()].filter((r) => r.updated_at > since).sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1));
    },
  };
}
type Server = ReturnType<typeof server>;
interface Phone {
  me: string;
  data: PersonalData;
  state: ShareState;
}
const phone = (me: string): Phone => {
  const data = freshPersonal();
  data.preferences.onboarded = true;
  return { me, data, state: { householdId: "h1", lastPull: "1970-01-01T00:00:00Z", synced: {} } };
};
/** One sync, the way FamilySync does it. Returns [changed here, sent]. */
function sync(p: Phone, s: Server): [number, number] {
  const since = new Date(Math.max(0, Date.parse(p.state.lastPull) - 120000)).toISOString();
  const rows = s.pull(since);
  const changed = mergeRemote(p.data, rows, p.state, p.me, members);
  p.state.lastPull = newest(rows, p.state.lastPull);
  const out = changesToSend(p.data, p.state, today);
  s.push(out, p.me);
  markSent(p.state, out);
  assert.equal(validData(p.data), true, "merged data stays valid");
  return [changed, out.length];
}
const event = (over: Partial<PersonalEvent>): PersonalEvent => ({
  id: `e-${Math.random().toString(36).slice(2, 8)}`,
  title: "Thing",
  date: "2026-11-02",
  start: "16:00",
  end: "17:00",
  allDay: false,
  source: "hats",
  ...over,
});

test("the grocery list is shared: added on one phone, checked off on the other", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  a.data.groceries.push("Milk", "eggs");
  sync(a, s);
  sync(b, s);
  assert.deepEqual(b.data.groceries.sort(), ["Milk", "eggs"].sort());
  // Jess buys the milk: off the list, into the kitchen.
  b.data.groceries = b.data.groceries.filter((g) => g !== "Milk");
  b.data.pantry.push("Milk");
  sync(b, s);
  sync(a, s);
  assert.deepEqual(a.data.groceries, ["eggs"]);
  assert.deepEqual(a.data.pantry, ["Milk"]);
  // Nothing left to say, both ways.
  assert.deepEqual(sync(a, s), [0, 0]);
  assert.deepEqual(sync(b, s), [0, 0]);
});

test("the dinner plan is shared, and a saved dinner comes along with it", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  a.data.meals.push({ id: "m-nana", name: "Nana's meatballs", ingredients: ["beef", "breadcrumbs"], minutes: 50, prep: "", favorite: true });
  a.data.dinners["2026-11-02"] = "m-nana";
  a.data.dinners["2026-11-03"] = "r-turkey-tacos";
  a.data.dinners["2026-09-01"] = "r-turkey-tacos"; // long ago: stays home
  sync(a, s);
  sync(b, s);
  assert.equal(b.data.dinners["2026-11-02"], "m-nana");
  assert.equal(b.data.dinners["2026-11-03"], "r-turkey-tacos");
  assert.equal(b.data.dinners["2026-09-01"], undefined);
  assert.equal(b.data.meals.find((m) => m.id === "m-nana")?.name, "Nana's meatballs");
  assert.deepEqual(sync(b, s), [0, 0]);
});

test("family events are shared; work, Myself, Google and closures aren't unless you say so", () => {
  const violin = event({ title: "Ami violin", hat: "dad", repeat: { freq: "week", every: 1, days: [4] } });
  const meeting = event({ title: "IEP meeting", hat: "work" });
  const run = event({ title: "Long run", hat: "myself" });
  const google = event({ title: "Dentist", hat: "dad", source: "google" });
  const yoga = event({ title: "Yoga", hat: "myself", shared: true });
  const vet = event({ title: "Vet", hat: "pets", shared: false });
  assert.deepEqual(
    [violin, meeting, run, google, yoga, vet].map(eventShared),
    [true, false, false, false, true, false],
  );
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  a.data.events.push(violin, meeting, run, google, yoga, vet);
  sync(a, s);
  sync(b, s);
  assert.deepEqual(b.data.events.map((e) => e.title).sort(), ["Ami violin", "Yoga"]);
  const got = b.data.events.find((e) => e.title === "Ami violin")!;
  assert.equal(got.hat, "dad");
  assert.equal(got.sharedBy, "Chris");
  assert.deepEqual(got.repeat, violin.repeat);
  // Chris's Myself thing is about him: on Jess's phone it's under the partner hat, and that
  // difference doesn't bounce back and forth.
  assert.equal(b.data.events.find((e) => e.title === "Yoga")!.hat, "husband");
  assert.deepEqual(sync(b, s), [0, 0]);
  assert.deepEqual(sync(a, s), [0, 0]);
  assert.equal(a.data.events.find((e) => e.title === "Yoga")!.hat, "myself");
});

test("a shared to-do can be checked off by either of you", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  a.data.tasks.push(
    {
      id: "t-1",
      title: "Sign Ami's field trip form",
      hat: "dad",
      date: "2026-10-30",
      time: null,
      minutes: 5,
      essential: false,
      fixed: false,
      doneAt: null,
      steps: [],
      repeat: "none",
      createdAt: "2026-10-29T10:00:00Z",
      deferred: 0,
      shared: true,
      assignee: "jess",
    },
    {
      id: "t-2",
      title: "Grade labs",
      hat: "work",
      date: "2026-10-30",
      time: null,
      minutes: 60,
      essential: false,
      fixed: false,
      doneAt: null,
      steps: [],
      repeat: "none",
      createdAt: "2026-10-29T10:00:00Z",
      deferred: 0,
    },
  );
  sync(a, s);
  sync(b, s);
  assert.deepEqual(b.data.tasks.map((t) => t.title), ["Sign Ami's field trip form"]);
  assert.equal(b.data.tasks[0].assignee, "jess");
  b.data.tasks[0].doneAt = "2026-10-29T18:00:00Z";
  sync(b, s);
  sync(a, s);
  assert.equal(a.data.tasks.find((t) => t.id === "t-1")!.doneAt, "2026-10-29T18:00:00Z");
  assert.equal(a.data.tasks.find((t) => t.id === "t-1")!.sharedBy, undefined, "still Chris's own");
});

test("both phones change the same dinner offline: they end up agreeing", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  a.data.dinners["2026-11-02"] = "r-turkey-tacos";
  sync(a, s);
  sync(b, s);
  a.data.dinners["2026-11-02"] = "r-slow-cooker-chili";
  b.data.dinners["2026-11-02"] = "r-sheet-pan-gnocchi";
  sync(a, s);
  sync(b, s); // Jess's change was made here too, so hers goes out
  sync(a, s);
  assert.equal(a.data.dinners["2026-11-02"], b.data.dinners["2026-11-02"]);
  assert.deepEqual(sync(a, s), [0, 0]);
  assert.deepEqual(sync(b, s), [0, 0]);
});

test("date nights are shared, unless it's a surprise", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  const plan = (id: string, title: string, surprise?: boolean) => ({
    id,
    date: "2026-11-05",
    time: "19:00",
    title,
    budget: 120,
    childcare: 60,
    transport: 0,
    steps: [{ title: "Book sitter", done: true }],
    note: "",
    ...(surprise ? { surprise } : {}),
  });
  a.data.dates.push(plan("d1", "Dinner at Pammy's"), plan("d2", "Concert tickets", true));
  sync(a, s);
  sync(b, s);
  assert.deepEqual(b.data.dates.map((d) => d.title), ["Dinner at Pammy's"]);
  assert.equal(b.data.dates[0].time, "19:00");
  assert.equal(b.data.dates[0].sharedBy, "Chris");
});

test("something removed on one phone is removed on the other, and un-sharing removes it there", () => {
  const s = server();
  const a = phone("chris"),
    b = phone("jess");
  const soccer = event({ title: "Soccer", hat: "dad" });
  a.data.events.push(soccer);
  sync(a, s);
  sync(b, s);
  assert.equal(b.data.events.length, 1);
  a.data.events[0].shared = false;
  sync(a, s);
  sync(b, s);
  assert.equal(b.data.events.length, 0);
  assert.equal(a.data.events.length, 1, "still on Chris's phone");
});

test("anything malformed from the server is ignored, not merged", () => {
  const a = phone("chris");
  const state = a.state;
  const bad: RemoteRow[] = [
    { id: "event:x", kind: "event", payload: { id: "x", title: "Bad", date: "2026-13-45", start: "9", end: "10", allDay: false }, deleted: false, updated_at: "2026-10-29T12:00:00Z", updated_by: "jess" },
    { id: "grocery:milk", kind: "task", payload: { name: "milk" }, deleted: false, updated_at: "2026-10-29T12:00:01Z", updated_by: "jess" },
    { id: "pantry:rice", kind: "pantry", payload: { name: 42 }, deleted: false, updated_at: "2026-10-29T12:00:02Z", updated_by: "jess" },
  ];
  assert.equal(mergeRemote(a.data, bad, state, "chris", members), 0);
  assert.equal(validData(a.data), true);
  assert.equal(a.data.events.length + a.data.groceries.length + a.data.pantry.length, 0);
});

test("after a reinstall, your shared things come back instead of being deleted", () => {
  const s = server();
  const a = phone("chris");
  a.data.groceries.push("Coffee");
  a.data.events.push(event({ title: "Pumpkin patch", hat: "dad" }));
  sync(a, s);
  const fresh = phone("chris");
  sync(fresh, s);
  assert.deepEqual(fresh.data.groceries, ["Coffee"]);
  assert.equal(fresh.data.events[0]?.title, "Pumpkin patch");
  assert.equal(fresh.data.events[0]?.sharedBy, undefined);
  assert.equal([...s.rows.values()].filter((r) => r.deleted).length, 0);
});

test("only family things are in the shared set at all", () => {
  const d = freshPersonal();
  d.notes.push({ id: "n1", hat: "husband", kind: "gift", text: "Earrings", createdAt: today });
  d.spending.push({ id: "s1", amount: 40, category: "gifts", title: "Earrings", date: today });
  d.groceries.push("Bananas");
  assert.deepEqual([...sharedFromLocal(d).keys()], ["grocery:bananas"]);
});
