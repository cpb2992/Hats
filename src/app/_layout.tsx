import { BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold } from '@expo-google-fonts/inter-tight';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStoreProvider, useApp } from '../store/AppStore';
import { BootSplash } from '../ui/BootSplash';
import { C } from '../ui/theme';
import { Toast } from '../ui/Toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Opens the screen a reminder points to (morning plan, shutdown, Now). */
function useNotificationRoutes(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    const open = (url: unknown) => { if (typeof url === 'string' && url !== '/') router.push(url as never); };
    const last = Notifications.getLastNotificationResponse();
    if (last) open(last.notification.request.content.data?.url);
    const sub = Notifications.addNotificationResponseReceivedListener(r => open(r.notification.request.content.data?.url));
    return () => sub.remove();
  }, [enabled]);
}

function Shell({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useApp();
  const all = ready && fontsReady;
  useEffect(() => { if (all) SplashScreen.hide(); }, [all]);
  useNotificationRoutes(all);
  const modal = { presentation: 'modal' as const, animation: 'slide_from_bottom' as const };
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      {all ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'fade_from_bottom' }}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="focus" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="capture" options={modal} />
          <Stack.Screen name="task/[id]" options={modal} />
          <Stack.Screen name="event/[id]" options={modal} />
          <Stack.Screen name="student-edit" options={modal} />
          <Stack.Screen name="student-import" options={modal} />
          <Stack.Screen name="pulse-sort" options={modal} />
          <Stack.Screen name="kids" options={{ animation: 'fade', contentStyle: { backgroundColor: C.night } }} />
        </Stack>
      ) : null}
      {all ? <Toast /> : null}
      <BootSplash ready={all} fontsReady={fontsReady} />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Shell fontsReady={fontsLoaded || !!fontError} />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
