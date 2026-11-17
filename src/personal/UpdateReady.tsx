import * as Updates from "expo-updates";
import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Hat } from "./Hat";
import { P, T } from "./ui";

/** How often coming back to Hats checks for a new version. */
const CHECK_EVERY_MS = 15 * 60 * 1000;

/**
 * Over-the-air updates: Hats checks when it opens and when you come back to it, downloads a new
 * version in the background, then offers a one-tap restart. Ignoring it is fine: the new version
 * starts the next time Hats opens fresh. Render only when Updates.isEnabled.
 */
export function UpdateReady() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const check = async () => {
      if (Date.now() - last.current < CHECK_EVERY_MS) return;
      last.current = Date.now();
      try {
        const found = await Updates.checkForUpdateAsync();
        if (found.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or the update server is busy: try again next time.
      }
    };
    // The launch itself already checks; start the clock so returning soon after doesn't repeat it.
    last.current = Date.now();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => sub.remove();
  }, []);

  if (!isUpdatePending || hidden) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 8,
        left: 16,
        right: 16,
        paddingVertical: 8,
        paddingLeft: 10,
        paddingRight: 8,
        borderRadius: 20,
        backgroundColor: P.dark,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Hat id="party" size={30} tilt={-10} />
      <T color={P.onDark} size={14} style={{ flex: 1 }}>
        A new version of Hats is ready.
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Later"
        onPress={() => setHidden(true)}
        style={{ paddingHorizontal: 8, minHeight: 40, justifyContent: "center" }}
      >
        <T size={13} color="#C8D7EA">
          Later
        </T>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restart Hats to update"
        onPress={() => {
          Updates.reloadAsync().catch(() => setHidden(true));
        }}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          minHeight: 40,
          justifyContent: "center",
          borderRadius: 14,
          backgroundColor: pressed ? "#E9A93A" : P.sun,
        })}
      >
        <T bold color={P.onSun}>
          Restart
        </T>
      </Pressable>
    </View>
  );
}

const when = (d: Date | null) =>
  d
    ? `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "an earlier update";

/** Settings: which version of Hats is running, and a button to check for a newer one. */
export function ThisCopy() {
  const [state, setState] = useState<"idle" | "checking" | "current" | "ready" | "offline">("idle");
  if (!Updates.isEnabled || __DEV__)
    return (
      <T size={13} muted>
        This copy of Hats doesn’t get over-the-air updates (a preview or developer build).
      </T>
    );
  const check = async () => {
    setState("checking");
    try {
      const found = await Updates.checkForUpdateAsync();
      if (!found.isAvailable) return setState("current");
      await Updates.fetchUpdateAsync();
      setState("ready");
    } catch {
      setState("offline");
    }
  };
  return (
    <View style={{ gap: 8 }}>
      <T bold>
        {Updates.isEmbeddedLaunch
          ? "Running the version that came with this install"
          : `Running the update from ${when(Updates.createdAt)}`}
      </T>
      <T size={13} muted>
        {state === "checking"
          ? "Checking…"
          : state === "current"
            ? "You’re up to date."
            : state === "ready"
              ? "A new version is downloaded and ready."
              : state === "offline"
                ? "Couldn’t reach the update server. Try again on Wi-Fi or data."
                : "New versions download in the background; Hats offers a restart when one is ready."}
      </T>
      {state === "ready" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => Updates.reloadAsync().catch(() => setState("offline"))}
          style={{ minHeight: 46, borderRadius: 16, backgroundColor: P.sun, borderWidth: 2, borderColor: P.edge, alignItems: "center", justifyContent: "center" }}
        >
          <T bold color={P.onSun}>Restart Hats to update</T>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={state === "checking"}
          onPress={check}
          style={{ minHeight: 46, borderRadius: 16, backgroundColor: P.soft, borderWidth: 2, borderColor: P.edge, alignItems: "center", justifyContent: "center", opacity: state === "checking" ? 0.6 : 1 }}
        >
          <T bold>Check for updates</T>
        </Pressable>
      )}
    </View>
  );
}
