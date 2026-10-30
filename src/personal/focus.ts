import { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import Focus from "../../modules/hats-focus";
import { PUBLIC_BUILD } from "./flavor";
// The public Play Store build leaves the accessibility service out (see plugins/without-focus-service.js).
export const focusAvailable = Platform.OS === "android" && !!Focus && !PUBLIC_BUILD;
export function useFocusEnabled() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const read = () => setEnabled(focusAvailable ? Focus!.isEnabled() : false);
    read();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") read();
    });
    return () => sub.remove();
  }, []);
  return enabled;
}
export async function openFocusSettings() {
  if (!focusAvailable)
    throw new Error(
      "Native distraction protection is available in the Android build.",
    );
  await Focus!.openSettings();
}
export async function configureFocus(until: string | null, packages: string[]) {
  if (focusAvailable)
    await Focus!.configure(until ? new Date(until).getTime() : 0, packages);
}
export const DISTRACTIONS = [
  {
    name: "TikTok",
    packages: ["com.zhiliaoapp.musically", "com.ss.android.ugc.trill"],
  },
  { name: "Instagram", packages: ["com.instagram.android"] },
  { name: "YouTube", packages: ["com.google.android.youtube"] },
];
