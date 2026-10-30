import { Redirect, router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { HatId } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Icon, type IconName } from '../../ui/icons';
import { CAP_PATH, CAP_SEAMS, tap, useWide } from '../../ui/kit';
import { C, F, shadow } from '../../ui/theme';

const TABS: Record<string, { label: string; icon: IconName | 'cap'; hat?: HatId }> = {
  index: { label: 'Hats', icon: 'cap' },
  caseload: { label: 'Caseload', icon: 'people', hat: 'sped' },
  pulse: { label: 'Pulse', icon: 'pulse', hat: 'teacher' },
  home: { label: 'Home', icon: 'home', hat: 'home' },
};

function CapLine({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d={`${CAP_PATH}`} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={CAP_SEAMS} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** The floating bar: four tabs in a dark pill, with the gold Say anything button beside it. */
function FloatingBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const { demo, endDemo, data } = useApp();
  // A tab shows only when its hat is worn: no Caseload for someone without a caseload.
  const worn = new Set(data.hats.filter(h => h.on).map(h => h.id));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center', paddingHorizontal: 16 }}>
      {demo ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); endDemo(); }} style={[{ marginBottom: 10, paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: '#2A2614', justifyContent: 'center' }, shadow]}>
          <Text style={{ fontFamily: F.semi, fontSize: 12.5, color: C.gold }}>Sample data · tap to leave</Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', width: '100%', maxWidth: wide ? 560 : 520 }}>
        <View accessibilityRole="tablist" style={[{ flex: 1, height: 64, borderRadius: 32, backgroundColor: C.glass, flexDirection: 'row', padding: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }, shadow]}>
          {state.routes.map((route, index) => {
            const meta = TABS[route.name];
            if (!meta || (meta.hat && !worn.has(meta.hat))) return null;
            const focused = state.index === index;
            const color = focused ? C.gold : C.ink2;
            const onPress = () => {
              tap();
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            };
            return (
              <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={meta.label} onPress={onPress} style={{ flex: 1, borderRadius: 26, backgroundColor: focused ? C.goldTab : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                {meta.icon === 'cap' ? <CapLine color={color} /> : <Icon name={meta.icon} size={22} color={color} width={1.8} />}
                <Text style={{ fontFamily: F.semi, fontSize: 11, color }}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Say anything" onPress={() => { tap(); router.push('/capture'); }} style={({ pressed }) => [{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }, shadow, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Icon name="mic" size={24} color={C.onGold} width={2} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { data } = useApp();
  if (!data.settings.onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs tabBar={props => <FloatingBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Hats' }} />
      <Tabs.Screen name="caseload" options={{ title: 'Caseload' }} />
      <Tabs.Screen name="pulse" options={{ title: 'Pulse' }} />
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
    </Tabs>
  );
}
