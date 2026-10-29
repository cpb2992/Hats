import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { haptic } from "./haptics";
import { Hat } from "./Hat";
import type { HatArtId } from "./hatArt";
import { P, T } from "./ui";

export interface Celebration {
  /** Unique per celebration so repeats replay. */
  id: number;
  hat: HatArtId;
  /** Short line in a pill, e.g. "7-day streak!" — big celebrations only. */
  title?: string;
  big?: boolean;
}

const COLORS = [
  "#F7C948",
  "#E8735A",
  "#8DB8EA",
  "#C8A6E6",
  "#5DBFAE",
  "#F08A4B",
];
function pieces(n: number, spread: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n + (i % 3) * 0.2;
    const r = spread * (0.6 + ((i * 53) % 40) / 100);
    return {
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r - spread * 0.35,
      color: COLORS[i % COLORS.length],
      spin: (i % 2 ? 1 : -1) * (200 + i * 30),
      w: i % 3 ? 8 : 6,
      h: i % 3 ? 12 : 6,
    };
  });
}
const SMALL = pieces(12, 90);
const BIG = pieces(26, 170);

/** A quick, non-blocking burst: hat pops, confetti flies, a buzz. Never steals taps. */
export function CelebrationLayer({ c }: { c: Celebration | null }) {
  const [t] = useState(() => new Animated.Value(0));
  const [finished, setFinished] = useState(0);
  const shown = c && c.id !== finished ? c : null;
  useEffect(() => {
    if (!c) return;
    let live = true;
    haptic("success");
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!live) return;
        t.setValue(reduce ? 0.6 : 0);
        Animated.timing(t, {
          toValue: 1,
          duration: reduce ? 900 : c.big ? 1500 : 950,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => live && setFinished(c.id));
      });
    return () => {
      live = false;
    };
  }, [c, t]);
  if (!shown) return null;
  const set = shown.big ? BIG : SMALL;
  const size = shown.big ? 110 : 72;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {set.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            width: p.w,
            height: p.h,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: t.interpolate({
              inputRange: [0, 0.05, 0.7, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateX: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, p.dx],
                }),
              },
              {
                translateY: t.interpolate({
                  inputRange: [0, 0.4, 1],
                  outputRange: [0, p.dy, p.dy + 140],
                }),
              },
              {
                rotate: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", `${p.spin}deg`],
                }),
              },
            ],
          }}
        />
      ))}
      <Animated.View
        style={{
          alignItems: "center",
          gap: 10,
          opacity: t.interpolate({
            inputRange: [0, 0.1, 0.75, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 0.18, 0.3, 1],
                outputRange: [0.3, 1.18, 1, 1],
              }),
            },
            {
              translateY: t.interpolate({
                inputRange: [0, 1],
                outputRange: [10, -24],
              }),
            },
          ],
        }}
      >
        <Hat id={shown.hat} size={size} tilt={-8} />
        {shown.title ? (
          <View
            style={{
              backgroundColor: P.ink,
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <T bold color={P.paper} size={16}>
              {shown.title}
            </T>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
