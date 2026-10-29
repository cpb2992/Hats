import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/** Light tap for presses, success buzz for finished things. Silent on web. */
export function haptic(kind: "tap" | "success") {
  if (Platform.OS === "web") return;
  (kind === "success"
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  ).catch(() => {});
}
