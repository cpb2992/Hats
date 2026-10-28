import { Redirect } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonal } from "../../personal/Store";
import { P, T, sticker } from "../../personal/ui";
import { Hat } from "../../personal/Hat";
import type { HatArtId } from "../../personal/hatArt";

const tabs: Record<string, { title: string; hat: HatArtId }> = {
  index: { title: "Today", hat: "sunhat" },
  hats: { title: "My hats", hat: "stack" },
  plan: { title: "Plan", hat: "safari" },
  capture: { title: "Capture", hat: "wizard" },
};
function Bar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const inset = useSafeAreaInsets();
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: inset.bottom + 12,
        alignItems: "center",
      }}
    >
      <View
        style={{
          maxWidth: 560,
          width: "100%",
          flexDirection: "row",
          backgroundColor: P.paper,
          borderRadius: 28,
          padding: 6,
          ...sticker(5),
        }}
      >
        {state.routes.map((route, i) => {
          const meta = tabs[route.name];
          if (!meta) return null;
          const selected = i === state.index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={meta.title}
              onPress={() => {
                const e = emitter.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!e.defaultPrevented) navigateToTab(route.key);
              }}
              style={{
                flex: 1,
                minHeight: 64,
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                borderRadius: 22,
                backgroundColor: selected ? P.sun : "transparent",
                borderWidth: 2,
                borderColor: selected ? P.ink : "transparent",
              }}
            >
              <Hat
                id={meta.hat}
                size={selected ? 38 : 32}
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
      <Tabs.Screen name="hats" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="capture" />
    </Tabs>
  );
}
