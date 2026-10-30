import assert from "node:assert/strict";
import { test } from "node:test";
import { freshPersonal, hangUpHat } from "../model";
import {
  addPack, addPackItem, countdown, deletePackItem, finishPackItem, PACK_KINDS, PACKS, packSummary,
  removePack, sourceFor, suggestPacks, syncPacks,
} from "../packs";

const TODAY = "2026-10-22";
const NOW = "2026-10-22T11:00:00.000Z";
const settle = (d: ReturnType<typeof freshPersonal>) => { for (let i = 0; i < 20 && syncPacks(d, NOW); i++); };

test("every pack has words to be suggested by and a to-do title", () => {
  for (const k of PACK_KINDS) {
    assert.ok(PACKS[k].words.length > 3, k);
    assert.ok(PACKS[k].task({ title: "X", who: "" } as never).includes("X"), k);
  }
});

test("packs are suggested from a hat's name and its library hat", () => {
  const list = [
    { id: "my-side-hustle" as const, name: "Side hustle", art: "bowler" as never, createdAt: NOW },
    { id: "my-soccer" as const, name: "Soccer", art: "baseball" as never, createdAt: NOW },
    { id: "my-grad-school" as const, name: "Grad school", art: "mortarboard" as never, createdAt: NOW },
  ];
  assert.equal(suggestPacks("my-side-hustle", list)[0], "money");
  assert.equal(suggestPacks("my-soccer", list)[0], "schedule");
  assert.equal(suggestPacks("my-grad-school", list)[0], "deadlines");
  assert.ok(suggestPacks("work", list).includes("people"));
});

test("a 1:1 becomes a to-do on its day; checking it off on Today logs it and books the next", () => {
  const d = freshPersonal();
  addPack(d, "work", "people");
  const p = addPackItem(d, { hat: "work", kind: "people", title: "Priya", date: TODAY, time: "14:00" }, NOW);
  assert.equal(p.repeatDays, 14);
  const t = d.tasks.find((x) => x.source === sourceFor(p))!;
  assert.equal(t.title, "Check in with Priya");
  assert.equal(t.time, "14:00");
  assert.equal(t.fixed, true);

  t.doneAt = NOW; // checked off on Today
  settle(d);
  assert.equal(p.last, TODAY);
  assert.equal(p.date, "2026-11-05");
  const next = d.tasks.filter((x) => x.source?.startsWith(`pack:${p.id}`) && !x.doneAt);
  assert.equal(next.length, 1);
  assert.equal(next[0].date, "2026-11-05");
});

test("a late repeating refill counts from today; a deadline finishes for good", () => {
  const d = freshPersonal();
  addPack(d, "friends", "care");
  const r = addPackItem(d, { hat: "friends", kind: "care", title: "Mom’s refill", date: "2026-10-18", repeatDays: 30 }, NOW);
  finishPackItem(d, r.id, TODAY, NOW);
  assert.equal(r.date, "2026-11-21");

  addPack(d, "myself", "deadlines");
  const due = addPackItem(d, { hat: "myself", kind: "deadlines", title: "Lit review", date: "2026-10-30" }, NOW);
  finishPackItem(d, due.id, TODAY, NOW);
  assert.ok(due.doneAt);
  assert.equal(d.tasks.filter((t) => t.source === sourceFor(due) && !t.doneAt).length, 0);
  assert.equal(countdown("2026-10-25", TODAY), "in 3 days");
  assert.equal(countdown("2026-10-20", TODAY), "2 days late");
});

test("taking a pack off a hat clears its open to-dos; deleting an item does too", () => {
  const d = freshPersonal();
  addPack(d, "work", "issues");
  const a = addPackItem(d, { hat: "work", kind: "issues", title: "Coverage pay", date: TODAY }, NOW);
  const b = addPackItem(d, { hat: "work", kind: "issues", title: "Class size", date: TODAY }, NOW);
  assert.equal(d.tasks.filter((t) => t.source?.startsWith("pack:")).length, 2);
  deletePackItem(d, a.id);
  assert.equal(d.tasks.filter((t) => t.source?.startsWith("pack:")).length, 1);
  removePack(d, "work", "issues");
  assert.equal(d.tasks.filter((t) => t.source?.startsWith("pack:")).length, 0);
  assert.ok(d.packItems?.some((p) => p.id === b.id), "the list is kept");
});

test("money and sessions summaries", () => {
  const d = freshPersonal();
  addPack(d, "home", "money");
  const a = addPackItem(d, { hat: "home", kind: "money", title: "Tutoring, October", amount: 240 }, NOW);
  addPackItem(d, { hat: "home", kind: "money", title: "Logo", amount: 150.5 }, NOW);
  finishPackItem(d, a.id, TODAY, NOW);
  assert.equal(packSummary(d, "home", "money", TODAY), "$240 paid this month · $150.50 still owed");

  addPack(d, "myself", "projects");
  const book = addPackItem(d, { hat: "myself", kind: "projects", title: "Picture book", who: "Thumbnails" }, NOW);
  finishPackItem(d, book.id, TODAY, NOW);
  finishPackItem(d, book.id, TODAY, NOW);
  assert.equal(book.doneAt, null);
  assert.equal(packSummary(d, "myself", "projects", TODAY), "2 sessions this week");
});

test("hanging up a hat moves its packs and lists to Home", () => {
  const d = freshPersonal();
  d.customHats = [{ id: "my-band", name: "Band", art: "beret" as never, createdAt: NOW }];
  addPack(d, "my-band", "projects");
  addPackItem(d, { hat: "my-band", kind: "projects", title: "New EP" }, NOW);
  hangUpHat(d, "my-band");
  assert.ok(d.packs?.home?.includes("projects"));
  assert.equal(d.packItems?.[0].hat, "home");
});

test("saved data with packs still loads", async () => {
  const { validData } = await import("../model");
  const d = freshPersonal();
  addPack(d, "work", "people");
  addPackItem(d, { hat: "work", kind: "people", title: "Priya", date: TODAY }, NOW);
  assert.equal(validData(JSON.parse(JSON.stringify(d))), true);
});

test("rating prompt: only after real use, and not again for four months", async () => {
  const { shouldAskForReview } = await import("../review");
  const { makeTask } = await import("../engine");
  const { addDays } = await import("../../engine/dates");
  const d = freshPersonal();
  assert.equal(shouldAskForReview(d, TODAY, null), false);
  for (let i = 0; i < 15; i++) d.tasks.push(makeTask(`Task ${i}`, "home", TODAY, { doneAt: `${TODAY}T10:00:00.000Z` }));
  assert.equal(shouldAskForReview(d, TODAY, null), false, "all on one day");
  for (let i = 0; i < 15; i++) d.tasks[i].doneAt = `${addDays(TODAY, -(i % 5))}T10:00:00.000Z`;
  assert.equal(shouldAskForReview(d, TODAY, null), true);
  assert.equal(shouldAskForReview(d, TODAY, addDays(TODAY, -30)), false);
  assert.equal(shouldAskForReview(d, TODAY, addDays(TODAY, -121)), true);
});
