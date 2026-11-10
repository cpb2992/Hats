import { router } from "expo-router";
import { useEditor, required } from "./Editor";
import { addMissing } from "./meals";
import { mealPreferences, type MealPreferences as Prefs } from "./mealPreferences";
import { id, type Meal } from "./model";
import { usePersonal } from "./Store";
import { Button, Panel, T } from "./ui";

const parseTerms = (text: string, limit = 20) => {
  const terms = [...new Set(text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];
  if (terms.length > limit || terms.some((s) => s.length > 80)) throw new Error(`Use up to ${limit} short entries, separated by commas or new lines.`);
  return terms;
};
export function MealPreferences() {
  const { data, mutate, say } = usePersonal();
  const editor = useEditor();
  const prefs = mealPreferences(data);
  return <Panel>
    <T bold>Your kitchen, your call.</T>
    <T muted size={13}>{[
      prefs.likes.length ? `More of: ${prefs.likes.join(", ")}` : "Tell Hats what your family enjoys",
      prefs.avoid.length ? `Skip: ${prefs.avoid.join(", ")}` : "",
      prefs.maxActiveMinutes ? `Up to ${prefs.maxActiveMinutes} active minutes` : "",
      prefs.ownFirst ? "Your saved dinners first" : "Recipe ideas first",
    ].filter(Boolean).join(" · ")}</T>
    <Button title="Meal preferences" small quiet onPress={() => editor.open({
      title: "Make meals fit your family",
      detail: "Likes boost matching names and listed ingredients. Skip removes matching suggestions. Existing planned dinners stay where you put them.",
      fields: [
        { key: "likes", label: "Enjoy more of · comma-separated", value: prefs.likes.join(", "), placeholder: "Rice, curry, chicken, pasta" },
        { key: "avoid", label: "Skip in suggestions · comma-separated", value: prefs.avoid.join(", "), placeholder: "Mushrooms, salmon" },
        { key: "minutes", label: "Maximum active cooking minutes · blank for any", value: prefs.maxActiveMinutes ? String(prefs.maxActiveMinutes) : "", numeric: true },
        { key: "priority", label: "Where should Hats start?", options: ["My dinners first", "Recipe ideas first"], value: prefs.ownFirst ? "My dinners first" : "Recipe ideas first" },
      ],
      onSave: (v) => {
        const minutes = v.minutes.trim() ? Number(v.minutes) : undefined;
        if (minutes !== undefined && (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)) throw new Error("Choose 1–240 minutes, or leave the limit empty.");
        const next: Prefs = { likes: parseTerms(v.likes), avoid: parseTerms(v.avoid), ownFirst: v.priority === "My dinners first", ...(minutes !== undefined ? { maxActiveMinutes: minutes } : {}) };
        mutate((d) => { d.preferences.mealPreferences = next; });
        say("Meal suggestions now use your preferences.");
      },
    })} />
    {editor.node}
  </Panel>;
}

/** Direct entry and editing, using the existing portable saved-meal format. */
export function useMealEditor() {
  const { mutate, today, say } = usePersonal();
  const editor = useEditor();
  const open = (meal?: Meal) => editor.open({
    title: meal ? "Edit your dinner" : "Add your own dinner",
    detail: "Use your own ingredients, timing and cooking notes. One ingredient or direction per line works too.",
    fields: [
      { key: "name", label: "Meal name", value: meal?.name },
      { key: "ingredients", label: "Ingredients · commas or one per line", value: meal?.ingredients.join("\n"), multiline: true },
      { key: "minutes", label: "Active cooking minutes", value: String(meal?.minutes ?? 20), numeric: true },
      { key: "prep", label: "Your directions and prep notes · one step per line", value: meal?.prep, multiline: true },
    ],
    onSave: (v) => {
      const name = required(v.name, "a meal name");
      if (name.length > 80) throw new Error("Keep the meal name under 80 characters.");
      const ingredients = parseTerms(v.ingredients, 80);
      const minutes = Number(v.minutes);
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) throw new Error("Choose a cooking time from 1 to 240 minutes.");
      const mealId = meal?.id ?? id();
      mutate((d) => {
        const saved: Meal = { id: mealId, name, ingredients, minutes, prep: v.prep.trim(), favorite: meal?.favorite ?? true };
        const index = d.meals.findIndex((m) => m.id === mealId);
        if (index < 0) d.meals.push(saved); else d.meals[index] = saved;
        if (Object.entries(d.dinners).some(([date, planned]) => date >= today && planned === mealId)) addMissing(d, mealId);
      });
      say(meal ? "Your dinner updated." : "Your dinner saved. You can plan it for any night.");
      if (!meal) router.push({ pathname: "/recipe/[id]", params: { id: mealId } });
    },
  });
  return { open, node: editor.node };
}
