import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from "@expo-google-fonts/inter-tight";
import { useFonts } from "expo-font";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, AppState } from "react-native";
import Focus from "../../modules/hats-focus";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PersonalProvider, usePersonal } from "../personal/Store";
import { Loading, P, T } from "../personal/ui";

SplashScreen.preventAutoHideAsync().catch(() => {});
function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { ready, message } = usePersonal();
  useEffect(() => {
    if (!ready || !fontsReady || !Focus) return;
    const focus=Focus;
    const consume = async () => {
      const text = await focus.consumeSharedText();
      if (text)
        router.push({ pathname: "/capture", params: { text, kind: "idea" } });
    };
    Promise.resolve()
      .then(consume)
      .catch(() => {});
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") consume().catch(() => {});
    });
    return () => sub.remove();
  }, [ready, fontsReady]);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (ready && fontsReady) SplashScreen.hide();
  }, [ready, fontsReady]);
  if (!ready || !fontsReady) return <Loading />;
  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: P.bg },
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="task/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="hat/[id]" />
        <Stack.Screen name="settings" />
      </Stack>
      {message ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: insets.bottom + 102,
            left: 20,
            right: 20,
            padding: 16,
            borderRadius: 18,
            backgroundColor: P.ink,
          }}
        >
          <T color={P.paper} size={14}>
            {message}
          </T>
        </View>
      ) : null}
    </View>
  );
}
export default function Root() {
  const [loaded, error] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });
  return (
    <SafeAreaProvider>
      <PersonalProvider>
        <Shell fontsReady={loaded || !!error} />
      </PersonalProvider>
    </SafeAreaProvider>
  );
}
