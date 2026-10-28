import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { freshPersonal, validData, type PersonalData } from "./model";

export const PERSONAL_KEY = "hats.personal.v2";
const VAULT_KEY = "hats.personal.encryption-key";
let keyPromise: Promise<AESEncryptionKey> | null = null;
export async function secretGet(name: string): Promise<string | null> {
  if (Platform.OS === "web")
    return typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem(name);
  const count = Number((await SecureStore.getItemAsync(`${name}.count`)) ?? 0);
  if (!count) return null;
  let result = "";
  for (let n = 0; n < count; n++)
    result += (await SecureStore.getItemAsync(`${name}.${n}`)) ?? "";
  return result;
}
export async function secretSet(name: string, value: string | null) {
  if (Platform.OS === "web") {
    if (typeof sessionStorage !== "undefined") {
      if (value == null) sessionStorage.removeItem(name);
      else sessionStorage.setItem(name, value);
    }
    return;
  }
  const previous = Number(
    (await SecureStore.getItemAsync(`${name}.count`)) ?? 0,
  );
  const count = value == null ? 0 : Math.ceil(value.length / 1500);
  for (let n = 0; n < count; n++)
    await SecureStore.setItemAsync(
      `${name}.${n}`,
      value!.slice(n * 1500, (n + 1) * 1500),
    );
  await SecureStore.setItemAsync(`${name}.count`, String(count));
  for (let n = count; n < previous; n++)
    await SecureStore.deleteItemAsync(`${name}.${n}`);
}
async function vaultKey() {
  if (!keyPromise)
    keyPromise = (async () => {
      let raw = await SecureStore.getItemAsync(VAULT_KEY);
      if (raw) return AESEncryptionKey.import(raw, "hex");
      const key = await AESEncryptionKey.generate(AESKeySize.AES256);
      raw = await key.encoded("hex");
      await SecureStore.setItemAsync(VAULT_KEY, raw);
      return key;
    })();
  return keyPromise;
}
export async function encodeLocal(data: PersonalData): Promise<string> {
  if (Platform.OS === "web") return JSON.stringify(data);
  const sealed = await aesEncryptAsync(
    new TextEncoder().encode(JSON.stringify(data)),
    await vaultKey(),
  );
  return JSON.stringify({
    encrypted: 1,
    data: await sealed.combined("base64"),
  });
}
export async function decodeLocal(raw: string): Promise<PersonalData> {
  const parsed = JSON.parse(raw);
  const value =
    parsed.encrypted === 1
      ? JSON.parse(
          new TextDecoder().decode(
            await aesDecryptAsync(
              AESSealedData.fromCombined(parsed.data),
              await vaultKey(),
            ),
          ),
        )
      : parsed;
  if (!validData(value))
    throw new Error("This file is not a supported Hats personal backup.");
  return value;
}
let writeQueue = Promise.resolve();
export async function savePersonal(data: PersonalData) {
  // Capture the immutable snapshot now, then serialize both encryption and disk writes.
  const snapshot = JSON.parse(JSON.stringify(data)) as PersonalData;
  const operation = writeQueue
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.setItem(PERSONAL_KEY, await encodeLocal(snapshot));
    });
  writeQueue = operation;
  await operation;
}
export async function loadPersonal(): Promise<PersonalData> {
  await writeQueue.catch(() => {});
  const raw = await AsyncStorage.getItem(PERSONAL_KEY);
  return raw ? decodeLocal(raw) : freshPersonal();
}
export async function preserveBeforeImport(data: PersonalData) {
  await AsyncStorage.setItem(
    `${PERSONAL_KEY}.before-import`,
    await encodeLocal(data),
  );
}
export async function legacyHomeTasks() {
  const raw = await AsyncStorage.getItem("hats.data.v1");
  if (!raw) return [];
  const legacy = JSON.parse(raw);
  return Array.isArray(legacy.tasks)
    ? legacy.tasks.filter(
        (t: { hat?: string; student?: unknown }) =>
          t.hat === "home" && !t.student,
      )
    : [];
}
