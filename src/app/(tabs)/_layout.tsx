import { Redirect } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonal } from "../../personal/Store";
import { haptic } from "../../personal/haptics";
import { P, T, sticker } from "../../personal/ui";
import { Hat } from "../../personal/Hat";
import type { HatArtId } from "../../personal/hatArt";

const tabs: Record<string, { title: string; hat: HatArtId }> = {
  index: { title: "Home", hat: "sunhat" },
  meals: { title: "Meals", hat: "chef" },
  family: { title: "Family", hat: "propeller" },
  me: { title: "Me", hat: "pompom" },
};
const ORDER = ["index", "meals", "capture", "family", "me"];

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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tell Hats: talk, type, or snap a flyer"
                  onPress={() => press(route.key)}
                  style={({ pressed }) => ({
                    width: 64,
                    height: 64,
                    marginTop: -34,
                    borderRadius: 32,
                    backgroundColor: P.ink,
                    borderWidth: 3,
                    borderColor: P.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  })}
                >
                  <Mic />
                </Pressable>
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
      <Tabs.Screen name="meals" />
      <Tabs.Screen name="capture" />
      <Tabs.Screen name="family" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
