import { File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { todayISO } from "../engine/dates";
import type { PersonalData } from "./model";
import { parseBackup } from "./profile";

export { parseBackup };

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
