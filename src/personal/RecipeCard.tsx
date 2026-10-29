import { router } from "expo-router";
import { useState } from "react";
import { Animated, Easing, Pressable, ScrollView, View } from "react-native";
import { Icon } from "../ui/icons";
import { useReduceMotion } from "./a11y";
import { Food, Hat } from "./Hat";
import { haptic } from "./haptics";
import { haveCount, inPantry, isGoTo } from "./meals";
import type { PersonalData } from "./model";
import { TAG_LABEL, type Recipe } from "./recipes";
import { P, T, sticker } from "./ui";

/** "25 min", or "20 min + 6–8 hours on low" for slow-cooker nights. */
export const timeLabel = (r: Pick<Recipe, "minutes" | "wait">) =>
  r.wait ? `${r.minutes} min + ${r.wait}` : `${r.minutes} min`;

function Pill({ text, tone = "paper" }: { text: string; tone?: "paper" | "ink" }) {
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: tone === "ink" ? P.ink : P.paper,
        borderWidth: 1.5,
        borderColor: P.ink,
      }}
    >
      <T size={11} bold color={tone === "ink" ? P.paper : P.ink}>
        {text}
      </T>
    </View>
  );
}

/** How much of the recipe is already at home, as words and a little bar. */
export function PantryMeter({ data, r }: { data: PersonalData; r: Recipe }) {
  const h = haveCount(data, r);
  const share = h.of ? h.have / h.of : 0;
  return (
    <View style={{ gap: 5 }}>
      <T size={12} bold color={P.muted}>
        {h.have === h.of
          ? "You have everything"
          : h.have
            ? `You have ${h.have} of ${h.of}`
            : `${h.of} things to pick up`}
      </T>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: "#EFE6D6", overflow: "hidden" }}>
        <View
          style={{
            width: `${Math.round(share * 100)}%`,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#5E9C6A",
          }}
        />
      </View>
    </View>
  );
}

/**
 * A recipe card that flips: the front sells it (sticker, name, time, what you have), the back
 * has the ingredients, the first steps, and the kids' job.
 */
export function RecipeFlipCard({
  r,
  data,
  width,
  height = 470,
}: {
  r: Recipe;
  data: PersonalData;
  width: number;
  height?: number;
}) {
  const reduce = useReduceMotion();
  const [back, setBack] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));
  const flip = () => {
    haptic("tap");
    const to = back ? 0 : 1;
    setBack(!back);
    if (reduce) turn.setValue(to);
    else
      Animated.timing(turn, {
        toValue: to,
        duration: 420,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
  };
  const frontStyle = {
    opacity: turn.interpolate({ inputRange: [0, 0.5, 0.501, 1], outputRange: [1, 1, 0, 0] }),
    transform: [
      { perspective: 1200 },
      { rotateY: turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", "90deg", "90deg"] }) },
    ],
  };
  const backStyle = {
    opacity: turn.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [0, 0, 1, 1] }),
    transform: [
      { perspective: 1200 },
      { rotateY: turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["-90deg", "-90deg", "0deg"] }) },
    ],
  };
  const face = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width,
    height,
    borderRadius: 28,
    backgroundColor: P.paper,
    overflow: "hidden" as const,
    ...sticker(5),
  };
  const goTo = isGoTo(data, r.id);
  return (
    <View style={{ width, height }}>
      <Animated.View
        style={[face, frontStyle]}
        pointerEvents={back ? "none" : "auto"}
        importantForAccessibility={back ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={back}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${r.name}. ${timeLabel(r)}. Serves ${r.serves}.`}
          accessibilityHint="Flips the card to show ingredients and steps"
          onPress={flip}
          style={{ flex: 1 }}
        >
          <View
            style={{
              height: height * 0.4,
              backgroundColor: r.tint,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 2,
              borderColor: P.ink,
            }}
          >
            <Food id={r.art} size={Math.min(140, height * 0.3)} tilt={-6} />
            <View style={{ position: "absolute", top: 12, left: 12, flexDirection: "row", gap: 6 }}>
              {r.tags.slice(0, 2).map((t) => (
                <Pill key={t} text={TAG_LABEL[t]} />
              ))}
            </View>
            {goTo ? (
              <View style={{ position: "absolute", top: 12, right: 12 }}>
                <Pill text="♥ Go-to" tone="ink" />
              </View>
            ) : null}
          </View>
          <View style={{ padding: 18, gap: 8, flex: 1 }}>
            <T display size={23} numberOfLines={2}>
              {r.name}
            </T>
            <T muted size={14} numberOfLines={2}>
              {r.blurb}
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="clock" size={15} color={P.ink} width={2} />
              <T size={13} bold>
                {timeLabel(r)}
              </T>
              <T size={13} muted>
                · Serves {r.serves}
              </T>
            </View>
            <PantryMeter data={data} r={r} />
            <View style={{ flex: 1 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" }}>
              <T size={12} bold color={P.blue}>
                Tap to flip for the recipe
              </T>
              <T size={14} color={P.blue}>
                ↻
              </T>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View
        style={[face, backStyle]}
        pointerEvents={back ? "auto" : "none"}
        importantForAccessibility={back ? "auto" : "no-hide-descendants"}
        accessibilityElementsHidden={!back}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Show the front of ${r.name}`}
          onPress={flip}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 14,
            backgroundColor: r.tint,
            borderBottomWidth: 2,
            borderColor: P.ink,
          }}
        >
          <Food id={r.art} size={40} />
          <View style={{ flex: 1 }}>
            <T bold size={16} numberOfLines={1}>
              {r.name}
            </T>
            <T size={12} muted>
              {timeLabel(r)} · Serves {r.serves}
            </T>
          </View>
          <T size={18} color={P.blue}>
            ↻
          </T>
        </Pressable>
        <ScrollView
          nestedScrollEnabled
          contentContainerStyle={{ padding: 16, gap: 6 }}
          showsVerticalScrollIndicator={false}
        >
          <T size={11} bold color={P.muted}>
            INGREDIENTS
          </T>
          {r.ingredients.map((x) => {
            const have = inPantry(data, x.item);
            return (
              <View key={x.item} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
                <T size={13} bold color={have ? "#3E7A4A" : P.ink} style={{ width: 14 }}>
                  {have ? "✓" : "•"}
                </T>
                <T size={13} style={{ flex: 1 }} color={have ? P.muted : P.ink}>
                  {x.amount ? `${x.amount} ` : ""}
                  {x.item}
                </T>
              </View>
            );
          })}
          <T size={11} bold color={P.muted} style={{ marginTop: 8 }}>
            HOW IT GOES
          </T>
          {r.steps.map((s, n) => (
            <View key={n} style={{ flexDirection: "row", gap: 8 }}>
              <T size={13} bold style={{ width: 16 }}>
                {n + 1}
              </T>
              <T size={13} style={{ flex: 1 }}>
                {s}
              </T>
            </View>
          ))}
          <View
            style={{
              marginTop: 8,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              padding: 10,
              borderRadius: 14,
              backgroundColor: "#FFF0C2",
            }}
          >
            <Hat id="propeller" size={28} />
            <T size={13} style={{ flex: 1 }}>
              <T size={13} bold>
                Kids can:{" "}
              </T>
              {r.kids}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: r.id } })}
            style={({ pressed }) => ({
              marginTop: 8,
              minHeight: 46,
              borderRadius: 16,
              backgroundColor: P.ink,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <T bold color={P.paper}>
              Open the full recipe
            </T>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
