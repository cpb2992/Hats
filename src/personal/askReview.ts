/** Shows Google's in-app rating sheet when review.ts says it's a good moment. Public builds only. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";
import { PUBLIC_BUILD } from "./flavor";
import type { PersonalData } from "./model";
import { shouldAskForReview } from "./review";

const KEY = "hats.reviewAsked";

export async function maybeAskForReview(data: PersonalData, today: string): Promise<void> {
  if (Platform.OS !== "android" || !PUBLIC_BUILD) return;
  try {
    const last = await AsyncStorage.getItem(KEY);
    if (!shouldAskForReview(data, today, last)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(KEY, today);
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error.
  }
}
