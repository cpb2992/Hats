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
import { useCallback, useEffect, useState } from "react";
import { View, AppState, Pressable } from "react-native";
import Focus from "../../modules/hats-focus";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PersonalProvider, usePersonal } from "../personal/Store";
import { Loading, P, T } from "../personal/ui";
import { Hat } from "../personal/Hat";
import { Intro } from "../personal/Intro";
import { CelebrationLayer } from "../personal/Celebrate";
import { Automations } from "../personal/Automate";
import * as Updates from "expo-updates";
import { UpdateReady } from "../personal/UpdateReady";

SplashScreen.preventAutoHideAsync().catch(() => {});
// The hat-tower intro plays once per app launch, not on every remount.
let introPlayed = false;
function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { ready, message, messageUndoable, undo, celebration } = usePersonal();
  const [intro, setIntro] = useState(() => !introPlayed);
  const endIntro = useCallback(() => {
    introPlayed = true;
    setIntro(false);
  }, []);
  useEffect(() => {
    if (!ready || !fontsReady || !Focus) return;
    const focus = Focus;
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
    // The intro covers data loading, so the native splash can step aside early.
    if (fontsReady && (ready || intro)) SplashScreen.hide();
  }, [ready, fontsReady, intro]);
  const overlay = intro && fontsReady ? <Intro onDone={endIntro} /> : null;
  if (!ready || !fontsReady)
    return (
      <View style={{ flex: 1, backgroundColor: P.bg }}>
        <Loading />
        {overlay}
      </View>
    );
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
        <Stack.Screen name="hat-new" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="log" />
        <Stack.Screen name="hats" />
      </Stack>
      <Automations />
      {message ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            bottom: insets.bottom + 100,
            left: 16,
            right: 16,
            paddingVertical: 8,
            paddingLeft: 10,
            paddingRight: 8,
            borderRadius: 20,
            backgroundColor: P.ink,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Hat id="cap" size={32} tilt={-12} />
          <T color={P.paper} size={14} style={{ flex: 1 }}>
            {message}
          </T>
          {messageUndoable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Undo"
              onPress={() => {
                undo();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                minHeight: 40,
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: pressed ? "#F7C94833" : "transparent",
              })}
            >
              <T bold color={P.sun}>
                Undo
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {Updates.isEnabled && !__DEV__ ? <UpdateReady /> : null}
      <CelebrationLayer c={celebration} />
      {overlay}
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
