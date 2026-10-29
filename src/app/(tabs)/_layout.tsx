import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonal } from "../../personal/Store";
import { haptic } from "../../personal/haptics";
import { voiceBus } from "../../personal/voiceBus";
import { P, T, sticker } from "../../personal/ui";
import { Hat } from "../../personal/Hat";
import type { HatArtId } from "../../personal/hatArt";

const tabs: Record<string, { title: string; hat: HatArtId }> = {
  index: { title: "Today", hat: "sunhat" },
  week: { title: "Week", hat: "safari" },
  family: { title: "Family", hat: "propeller" },
  hats: { title: "Hats", hat: "stack" },
};
const ORDER = ["index", "week", "capture", "family", "hats"];

function Mic() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4"
        stroke={P.sun}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * The mic really is a mic: tap to start talking (tap again to stop), or hold
 * it, speak, and let go. Either way the words land in Capture.
 */
function TalkButton({ onCapture }: { onCapture: boolean }) {
  const [holding, setHolding] = useState(false);
  const held = useRef(false);
  const open = () =>
    router.navigate({
      pathname: "/capture",
      params: { listen: String(Date.now()) },
    });
  return (
    <View style={{ alignItems: "center" }}>
      {holding ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 52,
            width: 190,
            alignItems: "center",
            paddingVertical: 8,
            borderRadius: 16,
            backgroundColor: P.ink,
          }}
        >
          <T size={13} bold color={P.paper}>
            Listening… let go when done
          </T>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Talk to Hats"
        accessibilityHint="Tap to start talking, or hold, speak, and let go"
        delayLongPress={280}
        onPress={() => {
          if (held.current) return;
          haptic("tap");
          if (onCapture) voiceBus.emit("toggle");
          else open();
        }}
        onLongPress={() => {
          held.current = true;
          setHolding(true);
          haptic("success");
          if (onCapture) voiceBus.emit("start");
          else open();
        }}
        onPressOut={() => {
          if (!held.current) return;
          // Let the screen open and start before asking it to stop.
          setTimeout(() => {
            held.current = false;
            voiceBus.emit("stop");
          }, 250);
          setHolding(false);
        }}
        style={({ pressed }) => ({
          width: 64,
          height: 64,
          marginTop: -34,
          borderRadius: 32,
          backgroundColor: holding ? P.orange : P.ink,
          borderWidth: 3,
          borderColor: holding ? P.sun : P.bg,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: holding ? 1.15 : pressed ? 0.94 : 1 }],
        })}
      >
        <Mic />
      </Pressable>
    </View>
  );
}

function Bar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const inset = useSafeAreaInsets();
  const press = (key: string) => {
    haptic("tap");
    const e = emitter.emit({
      type: "tabPress",
      target: key,
      canPreventDefault: true,
    });
    if (!e.defaultPrevented) navigateToTab(key);
  };
  const routes = ORDER.map((name) =>
    state.routes.find((r) => r.name === name),
  ).filter((r): r is (typeof state.routes)[number] => !!r);
  const current = state.routes[state.index]?.name;
  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: inset.bottom + 10,
        alignItems: "center",
      }}
    >
      <View
        style={{
          maxWidth: 560,
          width: "100%",
          height: 70,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: P.paper,
          borderRadius: 26,
          paddingHorizontal: 4,
          ...sticker(5),
        }}
      >
        {routes.map((route) => {
          if (route.name === "capture")
            return (
              <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
                <TalkButton onCapture={current === "capture"} />
              </View>
            );
          const meta = tabs[route.name];
          if (!meta) return null;
          const selected = current === route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={meta.title}
              onPress={() => press(route.key)}
              style={{
                flex: 1,
                height: 58,
                marginHorizontal: 2,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: selected ? P.sun : "transparent",
                borderWidth: 2,
                borderColor: selected ? P.ink : "transparent",
              }}
            >
              <Hat
                id={meta.hat}
                size={selected ? 32 : 28}
                tilt={selected ? -8 : 0}
              />
              <T size={11} bold color={P.ink}>
                {meta.title}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export default function Layout() {
  const { data, error } = usePersonal();
  if (!data.preferences.onboarded && !error)
    return <Redirect href="/welcome" />;
  return (
    <Tabs
      tabBar={(props) => <Bar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: P.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="week" />
      <Tabs.Screen name="capture" />
      <Tabs.Screen name="family" />
      <Tabs.Screen name="hats" />
    </Tabs>
  );
}
