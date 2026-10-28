import { todayISO } from "../engine/dates";
import { installRoutines } from "./engine";
import {
  freshPersonal,
  validData,
  type Habit,
  type PersonalData,
  type PersonalHat,
  type Person,
} from "./model";

const HATS: PersonalHat[] = [
  "husband",
  "dad",
  "pets",
  "home",
  "friends",
  "myself",
];
const isHat = (x: unknown): x is PersonalHat =>
  HATS.includes(String(x) as PersonalHat);

/**
 * Turns a full personal backup or a private `hats-personal-profile` setup file into app data.
 * Pure (no React Native imports) so it can be tested. Only known fields are copied from a
 * setup file; anything else in it is ignored.
 */
export function parseBackup(text: string, today = todayISO()): PersonalData {
  const parsed = JSON.parse(text);
  if (validData(parsed)) return parsed;
  if (parsed?.format !== "hats-personal-profile")
    throw new Error("Choose a Hats personal backup or setup file.");
  const data = freshPersonal();
  const p = parsed.preferences;
  if (!p || typeof p.name !== "string" || typeof p.partner !== "string")
    throw new Error("This setup file is incomplete.");
  data.preferences.name = p.name;
  data.preferences.partner = p.partner;
  if (typeof p.city === "string") data.preferences.city = p.city;
  if (Number.isFinite(p.travelMinutes) && p.travelMinutes > 0)
    data.preferences.travelMinutes = p.travelMinutes;
  if (Number.isFinite(p.dateBudget) && p.dateBudget > 0)
    data.preferences.dateBudget = p.dateBudget;
  if (Array.isArray(parsed.people))
    for (const person of parsed.people) {
      if (
        person &&
        typeof person.name === "string" &&
        ["child", "pet", "friend"].includes(person.role)
      )
        data.people.push({
          id: String(person.id ?? person.name),
          name: person.name,
          role: person.role as Person["role"],
          interests:
            typeof person.interests === "string" ? person.interests : "",
          detail: typeof person.detail === "string" ? person.detail : "",
          ...(typeof person.birthday === "string"
            ? { birthday: person.birthday }
            : {}),
        });
    }
  if (Array.isArray(parsed.notes))
    data.notes = parsed.notes
      .filter(
        (n: { text?: unknown; hat?: unknown }) =>
          n && typeof n.text === "string" && isHat(n.hat),
      )
      .map((n: { text: string; hat: PersonalHat }, index: number) => ({
        id: `profile-note-${index}`,
        hat: n.hat,
        text: n.text,
        createdAt: new Date().toISOString(),
        kind: "idea",
      })) as PersonalData["notes"];
  data.preferences.onboarded = true;
  if (Array.isArray(parsed.habits))
    data.habits = parsed.habits
      .filter(
        (h: {
          title?: unknown;
          hat?: unknown;
          frequency?: unknown;
          target?: unknown;
        }) =>
          h &&
          typeof h.title === "string" &&
          isHat(h.hat) &&
          ["daily", "weekly"].includes(String(h.frequency)) &&
          Number.isInteger(h.target) &&
          Number(h.target) > 0 &&
          Number(h.target) <= 7,
      )
      .map(
        (
          h: Pick<Habit, "title" | "hat" | "frequency" | "target"> & {
            taskSource?: unknown;
          },
          index: number,
        ): Habit => ({
          id: `profile-habit-${index}`,
          title: h.title,
          hat: h.hat,
          frequency: h.frequency,
          target: h.frequency === "daily" ? 1 : h.target,
          ...(typeof h.taskSource === "string"
            ? { taskSource: h.taskSource }
            : {}),
          checkins: [],
        }),
      );
  installRoutines(data, today);
  if (!validData(data)) throw new Error("This setup file could not be read.");
  return data;
}
