import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../store/AppStore';
import { CAP_PATH, tap } from './kit';
import { C, F, shadow } from './theme';

/** One floating message at a time. Wins tip the cap; info shows a check and an optional action like Undo. */
export function Toast() {
  const { toast, hideToast } = useApp();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-80));
  const [opacity] = useState(() => new Animated.Value(0));
  const [tip] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    y.setValue(-40);
    opacity.setValue(0);
    tip.setValue(0);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    if (toast.kind === 'win') {
      Animated.sequence([
        Animated.delay(180),
        Animated.timing(tip, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(tip, { toValue: -0.3, duration: 220, useNativeDriver: true }),
        Animated.timing(tip, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => hideToast());
    }, toast.action ? 3200 : 2400);
    return () => clearTimeout(timer);
  }, [toast, y, opacity, tip, hideToast]);

  if (!toast) return null;
  const rotate = tip.interpolate({ inputRange: [-1, 1], outputRange: ['22deg', '-22deg'] });
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, alignItems: 'center', opacity, transform: [{ translateY: y }], zIndex: 50 }}>
      <View accessibilityLiveRegion="polite" style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingLeft: 16, paddingRight: toast.action ? 6 : 20, borderRadius: 26, backgroundColor: toast.kind === 'win' ? '#2A2614' : C.raised2 }, shadow]}>
        {toast.kind === 'win' ? (
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Svg width={28} height={17} viewBox="3 6.5 20 12"><Path d={CAP_PATH} fill={C.gold} /></Svg>
          </Animated.View>
        ) : (
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M20 6 9 17l-5-5" fill="none" stroke={C.gold} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        )}
        <Text style={{ fontFamily: F.semi, fontSize: 15, color: toast.kind === 'win' ? C.gold : C.ink, fontVariant: ['tabular-nums'], flexShrink: 1 }}>{toast.text}</Text>
        {toast.action ? (
          <Pressable accessibilityRole="button" onPress={() => { tap(); toast.action?.onPress(); hideToast(); }} style={{ height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.gold }}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
