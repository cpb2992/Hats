import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { Hat } from "./Hat";
import type { HatArtId } from "./hatArt";
import { P, T } from "./ui";

/**
 * Start-up intro: "all the hats you wear" stack into a wobbly tower, one per space,
 * each landing with a squish; the tower sways, the party hat pops confetti, and the
 * wordmark bounces in. About two seconds; tap to skip; still frame for reduce-motion.
 */
const TOWER: { id: HatArtId; tilt: number; nudge: number }[] = [
  { id: "cap", tilt: -4, nudge: 0 },
  { id: "tophat", tilt: 5, nudge: 6 },
  { id: "fedora", tilt: -6, nudge: -8 },
  { id: "pompom", tilt: 4, nudge: 5 },
  { id: "propeller", tilt: -3, nudge: -4 },
  { id: "party", tilt: 6, nudge: 3 },
];
const SIZE = 112;
const STEP = 50; // vertical overlap between stacked hats
const CONFETTI = [
  "#F7C948",
  "#E8735A",
  "#8DB8EA",
  "#C8A6E6",
  "#5DBFAE",
  "#F08A4B",
];
const PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (Math.PI * (i + 0.5)) / 14; // fan upward
  const speed = 70 + ((i * 37) % 60);
  return {
    dx: Math.cos(angle) * speed * (i % 2 ? 1 : -1),
    up: -Math.sin(angle) * speed - 30,
    color: CONFETTI[i % CONFETTI.length],
    spin: (i % 2 ? 1 : -1) * (180 + i * 25),
    w: i % 3 ? 7 : 5,
    h: i % 3 ? 11 : 5,
  };
});

export function Intro({ onDone }: { onDone: () => void }) {
  const { height } = useWindowDimensions();
  const [drops] = useState(() => TOWER.map(() => new Animated.Value(0)));
  const [squash] = useState(() => TOWER.map(() => new Animated.Value(1)));
  const [sway] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [word] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [still, setStill] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let running: Animated.CompositeAnimation | null = null;
    const finish = () => {
      if (cancelled) return;
      Animated.timing(fade, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => !cancelled && onDone());
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          setStill(true);
          drops.forEach((d) => d.setValue(1));
          word.setValue(1);
          setTimeout(finish, 700);
          return;
        }
        const land = (i: number) =>
          Animated.sequence([
            Animated.timing(drops[i], {
              toValue: 1,
              duration: 300,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
            // Cartoon landing: squish, overshoot, settle (fixed timing, no long springs).
            Animated.timing(squash[i], {
              toValue: 0.78,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(squash[i], {
              toValue: 1.08,
              duration: 110,
              useNativeDriver: true,
            }),
            Animated.timing(squash[i], {
              toValue: 0.97,
              duration: 90,
              useNativeDriver: true,
            }),
            Animated.timing(squash[i], {
              toValue: 1,
              duration: 80,
              useNativeDriver: true,
            }),
          ]);
        running = Animated.sequence([
          Animated.stagger(
            150,
            TOWER.map((_, i) => land(i)),
          ),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(sway, {
                toValue: 1,
                duration: 140,
                useNativeDriver: true,
              }),
              Animated.timing(sway, {
                toValue: -1,
                duration: 220,
                useNativeDriver: true,
              }),
              Animated.timing(sway, {
                toValue: 0.4,
                duration: 160,
                useNativeDriver: true,
              }),
              Animated.timing(sway, {
                toValue: 0,
                duration: 140,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(pop, {
              toValue: 1,
              duration: 900,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.delay(120),
              Animated.timing(word, {
                toValue: 1,
                duration: 420,
                easing: Easing.out(Easing.back(2.2)),
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.delay(250),
        ]);
        running.start(({ finished }) => finished && finish());
      });
    return () => {
      cancelled = true;
      running?.stop();
    };
  }, [drops, squash, sway, pop, word, fade, onDone]);

  const towerHeight = SIZE + STEP * (TOWER.length - 1);
  const topY = towerHeight - SIZE - STEP * (TOWER.length - 1);
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: P.bg,
        alignItems: "center",
        justifyContent: "center",
        opacity: fade,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip the intro"
        onPress={() => {
          fade.stopAnimation();
          onDone();
        }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View pointerEvents="none" style={{ alignItems: "center", gap: 18 }}>
        <Animated.View
          style={{
            width: 180,
            height: towerHeight,
            transformOrigin: "bottom",
            transform: [
              {
                rotate: sway.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ["-4deg", "4deg"],
                }),
              },
            ],
          }}
        >
          {TOWER.map((hat, i) => (
            <Animated.View
              key={hat.id}
              style={{
                position: "absolute",
                left: 90 - SIZE / 2 + hat.nudge,
                bottom: STEP * i,
                width: SIZE,
                height: SIZE,
                zIndex: i,
                transformOrigin: "bottom",
                transform: [
                  {
                    translateY: drops[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [still ? 0 : -height, 0],
                    }),
                  },
                  { scaleY: squash[i] },
                  {
                    scaleX: squash[i].interpolate({
                      inputRange: [0.78, 1],
                      outputRange: [1.14, 1],
                    }),
                  },
                ],
              }}
            >
              <Hat id={hat.id} size={SIZE} tilt={hat.tilt} />
            </Animated.View>
          ))}
          {PIECES.map((c, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: 90 + TOWER[TOWER.length - 1].nudge - c.w / 2,
                top: topY + 6,
                width: c.w,
                height: c.h,
                borderRadius: 2,
                backgroundColor: c.color,
                opacity: pop.interpolate({
                  inputRange: [0, 0.05, 0.75, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, c.dx],
                    }),
                  },
                  {
                    translateY: pop.interpolate({
                      inputRange: [0, 0.45, 1],
                      outputRange: [0, c.up, c.up + 120],
                    }),
                  },
                  {
                    rotate: pop.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", `${c.spin}deg`],
                    }),
                  },
                ],
              }}
            />
          ))}
        </Animated.View>
        <Animated.View
          style={{
            alignItems: "center",
            opacity: word,
            transform: [
              {
                scale: word.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          }}
        >
          <T display size={48}>
            hats.
          </T>
          <T muted size={15} style={{ textAlign: "center" }}>
            You wear a lot of hats.{"\n"}Keep them all in one place.
          </T>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
