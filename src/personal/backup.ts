import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { todayISO } from "../engine/dates";
import { installRoutines } from "./engine";
import {
  freshPersonal,
  validData,
  type PersonalData,
  type Person,
} from "./model";

export async function exportPersonal(data: PersonalData) {
  const text = JSON.stringify(data, null, 2);
  const name = `Hats-personal-backup-${todayISO()}.json`;
  if (Platform.OS === "web") {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: "Keep your private Hats backup",
  });
}
export function parseBackup(text: string): PersonalData {
  const parsed = JSON.parse(text);
  if (validData(parsed)) return parsed;
  if (parsed.format !== "hats-personal-profile")
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
          typeof n.text === "string" &&
          ["husband", "dad", "pets", "home", "friends", "myself"].includes(
            String(n.hat),
          ),
      )
      .map((n: object, index: number) => ({
        ...n,
        id: `profile-note-${index}`,
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
          target?: number;
        }) =>
          typeof h.title === "string" &&
          ["husband", "dad", "pets", "home", "friends", "myself"].includes(
            String(h.hat),
          ) &&
          ["daily", "weekly"].includes(String(h.frequency)) &&
          Number.isInteger(h.target) &&
          Number(h.target) > 0 &&
          Number(h.target) <= 7,
      )
      .map((h: object, index: number) => ({
        ...h,
        id: `profile-habit-${index}`,
        checkins: [],
      }));
  installRoutines(data, todayISO());
  return data;
}
export async function pickBackup(): Promise<PersonalData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = result.assets[0];
  if ((file.size ?? 0) > 5 * 1024 * 1024)
    throw new Error("This file is too large for a Hats setup file.");
  return parseBackup(await new File(file.uri).text());
}
