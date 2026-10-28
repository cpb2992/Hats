import { useEffect, useState } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { hatShapes, type HatArtId, type Shape } from "./hatArt";

function draw(s: Shape, key: number): React.ReactElement {
  if (s.t === "g")
    return (
      <G key={key} transform={s.transform}>
        {s.children.map(draw)}
      </G>
    );
  const paint = {
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
  useEffect(() => {
    if (!wobble) return;
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
  }, [wobble, t]);
  const rotate = t.interpolate({
    inputRange: [0, 1],
    outputRange: [`${tilt - 5}deg`, `${tilt + 5}deg`],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const art = (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {hatShapes(id).map(draw)}
    </Svg>
  );
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    >
      {wobble ? (
        <Animated.View style={{ transform: [{ rotate }, { translateY }] }}>
          {art}
        </Animated.View>
      ) : (
        <View style={{ transform: [{ rotate: `${tilt}deg` }] }}>{art}</View>
      )}
    </View>
  );
}
