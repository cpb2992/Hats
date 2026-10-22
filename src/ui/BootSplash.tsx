import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CAP_PATH, CAP_SEAMS } from './kit';
import { C, F } from './theme';

const MIN_SHOW_MS = 800;

/**
 * Sits on top of the app right after the native splash (same ink background, same gold cap),
 * tips the cap once, then fades into the app when data and fonts are ready.
 */
export function BootSplash({ ready, fontsReady }: { ready: boolean; fontsReady: boolean }) {
  const [fade] = useState(() => new Animated.Value(1));
  const [tip] = useState(() => new Animated.Value(0));
  const [gone, setGone] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.timing(tip, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(tip, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [tip]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 320, useNativeDriver: true }).start(() => setGone(true));
    }, MIN_SHOW_MS);
    return () => clearTimeout(t);
  }, [ready, fade]);

  if (gone) return null;
  const rotate = tip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-16deg'] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessibilityLabel="Hats is loading">
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Svg width={120} height={72} viewBox="3 6.5 20 12">
            <Path d={CAP_PATH} fill={C.gold} />
            <Path d={CAP_SEAMS} fill="none" stroke={C.seam} strokeWidth={0.4} strokeDasharray="0.6 0.45" strokeLinecap="round" />
          </Svg>
        </Animated.View>
        <Text style={[styles.word, fontsReady ? { fontFamily: F.display } : { fontWeight: '600' }]}>Hats</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  center: { alignItems: 'center', gap: 10 },
  word: { color: C.ink, fontSize: 34, letterSpacing: -1 },
});
