import { Redirect } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonal } from "../../personal/Store";
import { haptic } from "../../personal/haptics";
import { P, T, sticker } from "../../personal/ui";
import { Hat } from "../../personal/Hat";
import type { HatArtId } from "../../personal/hatArt";

const tabs: Record<string, { title: string; hat: HatArtId }> = {
  index: { title: "Today", hat: "sunhat" },
  week: { title: "Week", hat: "safari" },
  capture: { title: "Capture", hat: "wizard" },
  family: { title: "Family", hat: "propeller" },
  hats: { title: "Hats", hat: "stack" },
};
const ORDER = ["index", "week", "capture", "family", "hats"];

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
                borderColor: selected ? P.edge : "transparent",
              }}
            >
              <Hat
                id={meta.hat}
                size={selected ? 32 : 28}
                tilt={selected ? -8 : 0}
              />
              <T size={11} bold color={selected ? P.onSun : P.ink}>
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
