import assert from "node:assert/strict";
import test from "node:test";
import { freshPersonal, validData, type Meal } from "../model";
import { asMeal, dinnerFor, findMeal, nextDinner, suggestRecipes, weekDinners } from "../meals";
import { matchesFood, mealAllowed } from "../mealPreferences";
import { planWeek } from "../auto";
import { RECIPES } from "../recipes";
import { sharedFromLocal } from "../share";
import { parseBackup } from "../profile";

const date = "2026-11-03";
const own = (extra: Partial<Meal> = {}): Meal => ({ id: "mine", name: "My rice bowl", ingredients: ["rice", "tomatoes"], minutes: 15, prep: "Cook rice\nAdd tomatoes", favorite: true, ...extra });
test("one saved dinner is enough to guide tonight, with an explicit recipe-first option", () => {
  const d = freshPersonal(); d.meals.push(own());
  assert.equal(dinnerFor(d, date).meal?.id, "mine");
  d.preferences.mealPreferences = { likes: [], avoid: [], ownFirst: false };
  assert.notEqual(dinnerFor(d, date).meal?.id, "mine");
});
test("ingredient words and phrases match plurals without substring mistakes", () => {
  assert.equal(matchesFood(own({ ingredients: ["sliced mushrooms"] }), "mushroom"), true);
  assert.equal(matchesFood(own({ ingredients: ["eggs"] }), "egg"), true);
  assert.equal(matchesFood(own({ name: "Rice bowl", ingredients: ["eggplant"] }), "egg"), false);
  assert.equal(matchesFood(own({ ingredients: ["peanut butter"] }), "peanut butter"), true);
});
test("likes actually change the recipe ranking", () => {
  const d = freshPersonal();
  d.preferences.mealPreferences = { likes: ["salmon"], avoid: [], ownFirst: false };
  assert.equal(matchesFood(asMeal(suggestRecipes(d, date)[0]), "salmon"), true);
});
test("skip terms and the active-time limit apply to both saved and library suggestions", () => {
  const d = freshPersonal(); d.meals.push(own({ ingredients: ["mushrooms"], minutes: 60 }));
  d.preferences.mealPreferences = { likes: [], avoid: ["mushrooms"], maxActiveMinutes: 20, ownFirst: true };
  const recipes = suggestRecipes(d, date);
  assert.ok(recipes.length > 0);
  assert.ok(recipes.every((r) => r.minutes <= 20 && !matchesFood(asMeal(r), "mushrooms")));
  assert.notEqual(dinnerFor(d, date).meal?.id, "mine");
});
test("new preferences preserve a dinner the user already planned", () => {
  const d = freshPersonal(); d.meals.push(own({ ingredients: ["mushrooms"] }));
  d.dinners[date] = "mine";
  d.preferences.mealPreferences = { likes: [], avoid: ["mushroom"], ownFirst: true };
  assert.equal(dinnerFor(d, date).planned, true);
  assert.equal(weekDinners(d, [date])[0].meal?.id, "mine");
});
test("an impossible preference match stays empty instead of ignoring the user's input", () => {
  const d = freshPersonal(); d.meals.push(own({ ingredients: ["mushrooms"] }));
  d.hiddenRecipes = RECIPES.map((r) => r.id);
  d.preferences.mealPreferences = { likes: [], avoid: ["mushroom"], ownFirst: true };
  assert.equal(dinnerFor(d, date).meal, null);
  assert.equal(nextDinner(d, date, []), null);
  assert.equal(planWeek(d, date, false), 0);
  assert.equal(planWeek(d, date, true), 0);
});
test("automatic weekly planning and swaps respect the same preferences", () => {
  const d = freshPersonal(); d.meals.push(own(), own({ id: "skip", name: "Mushroom bowl", ingredients: ["mushrooms"] }));
  d.preferences.mealPreferences = { likes: ["rice"], avoid: ["mushroom"], maxActiveMinutes: 30, ownFirst: true };
  const n = planWeek(d, date, true);
  assert.ok(n > 0);
  assert.ok(Object.values(d.dinners).every((id) => mealAllowed(d, findMeal(d, id)!)));
  const swapped = nextDinner(d, date, ["mine"]);
  assert.ok(!swapped || mealAllowed(d, swapped));
  assert.ok(!swapped || swapped.id !== "mine");
});
test("meal preferences round-trip in private backups and stay out of household sharing", () => {
  const d = freshPersonal(), before = [...sharedFromLocal(d)];
  d.preferences.mealPreferences = { likes: ["rice"], avoid: ["mushroom"], maxActiveMinutes: 30, ownFirst: true };
  assert.equal(validData(d), true);
  assert.deepEqual(parseBackup(JSON.stringify(d)).preferences.mealPreferences, d.preferences.mealPreferences);
  assert.deepEqual([...sharedFromLocal(d)], before);
});
test("bad imported meal preferences are rejected", () => {
  for (const bad of [null, { likes: "rice", avoid: [], ownFirst: true }, { likes: [], avoid: [], ownFirst: "yes" },
    { likes: [], avoid: [], ownFirst: true, maxActiveMinutes: -1 }, { likes: [""], avoid: [], ownFirst: true }]) {
    const d = freshPersonal(); d.preferences.mealPreferences = bad as never;
    assert.equal(validData(d), false);
  }
});
