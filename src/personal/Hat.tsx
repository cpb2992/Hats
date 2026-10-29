import { useEffect, useState } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useReduceMotion } from "./a11y";
import { isDark } from "./palette";
import { foodShapes, type FoodArtId } from "./foodArt";
import { hatShapes, type HatArtId, type Shape } from "./hatArt";

/** At night, stickers get a light die-cut edge so dark hats (a bowler, a top hat) still show. */
const HALO = "#E8E0D0";
const HALO_W = 3.4;

function draw(s: Shape, key: number, halo?: string): React.ReactElement | null {
  if (s.t === "g")
    return (
      <G key={key} transform={s.transform}>
        {s.children.map((c, k) => draw(c, k, halo))}
      </G>
    );
  // Highlights and see-through bits don't get an edge of their own.
  if (halo && s.o !== undefined && s.o < 1) return null;
  const paint = halo
    ? {
        fill: s.fill && s.fill !== "none" ? halo : "none",
        stroke: halo,
        strokeWidth: (s.stroke ? (s.w ?? 1) : 0) + HALO_W,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
      }
    : {
        fill: s.fill ?? "none",
        stroke: s.stroke,
        strokeWidth: s.stroke ? s.w : undefined,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        opacity: s.o,
      };
  switch (s.t) {
    case "path":
      return <Path key={key} d={s.d} {...paint} />;
    case "circle":
      return <Circle key={key} cx={s.cx} cy={s.cy} r={s.r} {...paint} />;
    case "ellipse":
      return (
        <Ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...paint} />
      );
    case "rect":
      return (
        <Rect
          key={key}
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          rx={s.rx}
          {...paint}
        />
      );
  }
}

/** A hat sticker. Decorative: screen readers skip it, so pair it with a text label. */
export function Hat({
  id,
  size = 40,
  wobble = false,
  tilt = 0,
  style,
}: {
  id: HatArtId;
  size?: number;
  wobble?: boolean;
  tilt?: number;
  style?: ViewStyle;
}) {
  const [t] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!wobble || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      // A few playful wobbles, then rest (saves battery, lets the screen go idle).
      { iterations: 3 },
    );
    loop.start();
    return () => loop.stop();
  }, [wobble, reduce, t]);
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: [`${tilt - 5}deg`, `${tilt + 5}deg`],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const art = (
    <Svg width={size} height={size} viewBox={isDark() ? "-2 -2 68 68" : "0 0 64 64"}>
      {isDark() ? hatShapes(id).map((s, k) => draw(s, k, HALO)) : null}
      {hatShapes(id).map((s, k) => draw(s, k))}
    </Svg>
  );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      {wobble && !reduce ? (
        <Animated.View style={{ transform: [{ rotate }, { translateY }] }}>
          {art}
        </Animated.View>
      ) : (
        <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>{art}</View>
      )}
    </View>
  );
}

/** A food sticker, drawn like the hats. Decorative: pair it with a text label. */
export function Food({
  id,
  size = 40,
  tilt = 0,
  style,
}: {
  id: FoodArtId;
  size?: number;
  tilt?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size, transform: [{ rotate: `${tilt}deg` }] }, style]}
    >
      <Svg width={size} height={size} viewBox={isDark() ? "-2 -2 68 68" : "0 0 64 64"}>
        {isDark() ? foodShapes(id).map((s, k) => draw(s, k, HALO)) : null}
        {foodShapes(id).map((s, k) => draw(s, k))}
      </Svg>
    </View>
  );
}
