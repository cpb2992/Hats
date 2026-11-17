import type { Meal, PersonalData } from "./model";

export interface MealPreferences {
  likes: string[];
  avoid: string[];
  maxActiveMinutes?: number;
  ownFirst: boolean;
}
export const mealPreferences = (data: PersonalData): MealPreferences =>
  data.preferences.mealPreferences ?? { likes: [], avoid: [], ownFirst: true };
export function foodWords(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/ies$/, "y").replace(/oes$/, "o").replace(/s$/, "")).join(" ");
}
/** Match whole words/phrases in names and listed ingredients, not arbitrary substrings. */
export function matchesFood(meal: Pick<Meal, "name" | "ingredients">, phrase: string) {
  const needle = foodWords(phrase);
  return !!needle && [meal.name, ...meal.ingredients].some((text) => ` ${foodWords(text)} `.includes(` ${needle} `));
}
export function mealAllowed(data: PersonalData, meal: Pick<Meal, "name" | "ingredients" | "minutes">) {
  const prefs = mealPreferences(data);
  return (!prefs.maxActiveMinutes || meal.minutes <= prefs.maxActiveMinutes) &&
    !prefs.avoid.some((phrase) => matchesFood(meal, phrase));
}
export function mealLikeScore(data: PersonalData, meal: Pick<Meal, "name" | "ingredients">) {
  return mealPreferences(data).likes.filter((phrase) => matchesFood(meal, phrase)).length * 6;
}
