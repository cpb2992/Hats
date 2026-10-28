import { Redirect } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePersonal } from "../../personal/Store";
import { P, T } from "../../personal/ui";
import { Icon, type IconName } from "../../ui/icons";

const tabs: Record<string, { title: string; icon: IconName }> = {
  index: { title: "Today", icon: "home" },
  hats: { title: "My hats", icon: "groups" },
  plan: { title: "Plan", icon: "calendar" },
  capture: { title: "Capture", icon: "mic" },
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
          borderRadius: 25,
          padding: 6,
          borderWidth: 1,
          borderColor: P.line,
          elevation: 6,
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
                minHeight: 60,
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 19,
                backgroundColor: selected ? P.ink : "transparent",
              }}
            >
              <Icon
                name={meta.icon}
                color={selected ? P.paper : P.muted}
                size={21}
              />
              <T size={11} bold color={selected ? P.paper : P.muted}>
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
