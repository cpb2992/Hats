/**
 * Dinner planning: library recipes and your own go-to dinners, ranked for each day, plus the
 * grocery math. Pure, so it can be tested.
 */
import { daysBetween } from "../engine/dates";
import type { Meal, PersonalData } from "./model";
import {
  RECIPES,
  isStaple,
  recipeById,
  sameItem,
  type Recipe,
  type RecipeTag,
} from "./recipes";

/** A library recipe in the shape of a saved dinner. */
export const asMeal = (r: Recipe): Meal => ({
  id: r.id,
  name: r.name,
  ingredients: r.ingredients.map((x) => x.item),
  minutes: r.minutes,
  prep: "",
  favorite: false,
});

/** Any dinner by id: one you saved, or one from the library. */
export function findMeal(data: PersonalData, id: string | undefined): Meal | undefined {
  if (!id) return undefined;
  const saved = data.meals.find((m) => m.id === id);
  if (saved) return saved;
  const r = recipeById(id);
  return r ? asMeal(r) : undefined;
}

export const inPantry = (data: PersonalData, item: string) =>
  isStaple(item) || data.pantry.some((p) => sameItem(p, item));

/** What a dinner still needs from the store. */
export function missingFor(data: PersonalData, mealId: string): string[] {
  const meal = findMeal(data, mealId);
  if (!meal) return [];
  return meal.ingredients.filter((i) => !inPantry(data, i));
}

/** How much of a recipe is already in the kitchen: { have: 4, of: 7 } (staples don't count). */
export function haveCount(data: PersonalData, r: Recipe) {
  const real = r.ingredients.filter((x) => !isStaple(x.item));
  return {
    have: real.filter((x) => data.pantry.some((p) => sameItem(p, x.item))).length,
    of: real.length,
  };
}

/** Adds a dinner's missing ingredients to the grocery list; returns what was added. */
export function addMissing(data: PersonalData, mealId: string): string[] {
  const added: string[] = [];
  for (const item of missingFor(data, mealId))
    if (!data.groceries.some((g) => sameItem(g, item))) {
      data.groceries.push(item);
      added.push(item);
    }
  return added;
}

/** Plans a dinner for a date and adds what it needs to the list. */
export function planDinner(data: PersonalData, date: string, mealId: string) {
  data.dinners[date] = mealId;
  return addMissing(data, mealId);
}

export const isGoTo = (data: PersonalData, id: string) =>
  data.meals.some((m) => m.id === id);

const hash = (s: string) => {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (h >>> 0) / 4294967295;
};

export type MealFilter = RecipeTag | "pantry" | "all";

/**
 * Library recipes ranked for a date: what's already in the kitchen, your go-tos, kid-friendly
 * when there are kids, quick on busy or low-energy days, and not a repeat of nearby nights.
 * The order shifts a little each day so the deck stays fresh.
 */
export function suggestRecipes(
  data: PersonalData,
  date: string,
  filter: MealFilter = "all",
  limit = 12,
): Recipe[] {
  const hidden = new Set(data.hiddenRecipes ?? []);
  const kids = data.people.some((p) => p.role === "child");
  const low = data.lowEnergyDays.includes(date);
  const weekday = ![0, 6].includes(new Date(`${date}T12:00:00`).getDay());
  const nearby = Object.entries(data.dinners)
    .filter(([d]) => d !== date && Math.abs(daysBetween(d, date)) <= 3)
    .map(([, id]) => id);
  const nearbyArt = nearby.map((id) => recipeById(id)?.art).filter(Boolean);
  return RECIPES.filter((r) => !hidden.has(r.id))
    .filter((r) => {
      if (filter === "all") return true;
      if (filter === "pantry") {
        const h = haveCount(data, r);
        return h.of > 0 && h.have / h.of >= 0.4;
      }
      return r.tags.includes(filter);
    })
    .map((r) => {
      const h = haveCount(data, r);
      let score = (h.of ? h.have / h.of : 0) * 6;
      if (isGoTo(data, r.id)) score += 4;
      if (kids && r.tags.includes("kid-friendly")) score += 2.5;
      if (low && (r.tags.includes("quick") || r.tags.includes("low-effort"))) score += 4;
      if (low) score -= r.minutes / 15;
      if (weekday && r.minutes <= 30) score += 1;
      if (nearby.includes(r.id)) score -= 8;
      if (nearbyArt.includes(r.art)) score -= 2;
      score += hash(r.id + date) * 3;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Tonight's (or any night's) dinner: the one you planned, else the best fit. */
export function dinnerFor(data: PersonalData, date: string): { meal: Meal | null; planned: boolean } {
  const planned = findMeal(data, data.dinners[date]);
  if (planned) return { meal: planned, planned: true };
  const mine = [...data.meals]
    .filter((m) => !(data.hiddenRecipes ?? []).includes(m.id))
    .sort((a, b) => {
      const score = (m: Meal) =>
        m.ingredients.filter((i) => inPantry(data, i)).length * 4 +
        (m.favorite ? 2 : 0) -
        (data.lowEnergyDays.includes(date) ? m.minutes / 10 : 0) -
        (Object.entries(data.dinners).some(
          ([d, id]) => id === m.id && Math.abs(daysBetween(d, date)) <= 3,
        )
          ? 10
          : 0);
      return score(b) - score(a);
    });
  // Your own dinners first when you have a few; otherwise the library fills in.
  if (mine.length >= 3) return { meal: mine[0], planned: false };
  const lib = suggestRecipes(data, date, "all", 1)[0];
  return { meal: lib ? asMeal(lib) : (mine[0] ?? null), planned: false };
}

/**
 * The next dinner to try for a date when you swap: your own go-tos first if you have a few,
 * then library ideas, skipping anything in `exclude` (tonight's pick, the rest of the week).
 */
export function nextDinner(data: PersonalData, date: string, exclude: string[]): Meal | null {
  const hidden = new Set(data.hiddenRecipes ?? []);
  const mine = data.meals.filter((m) => !hidden.has(m.id) && !exclude.includes(m.id));
  const lib = suggestRecipes(data, date, "all", 40)
    .filter((r) => !exclude.includes(r.id) && !data.meals.some((m) => m.id === r.id))
    .map(asMeal);
  const order = data.meals.length >= 3 ? [...mine, ...lib] : [...lib, ...mine];
  return order[0] ?? null;
}

/** A week of dinners: what's planned, and a different idea for each open night. */
export function weekDinners(data: PersonalData, dates: string[]) {
  const used = new Set(dates.map((d) => data.dinners[d]).filter(Boolean));
  return dates.map((date) => {
    const planned = findMeal(data, data.dinners[date]);
    if (planned) return { date, meal: planned as Meal | null, planned: true };
    let meal = dinnerFor(data, date).meal;
    if (meal && used.has(meal.id)) meal = nextDinner(data, date, [...used]);
    if (meal) used.add(meal.id);
    return { date, meal, planned: false };
  });
}
