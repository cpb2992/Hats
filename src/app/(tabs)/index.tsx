import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addDays,
  daysBetween,
  dayShort,
  fmtLong,
  fromISO,
} from "../../engine/dates";
import { didToday, undoEntry } from "../../personal/auto";
import { planDay } from "../../personal/engine";
import { Hat } from "../../personal/Hat";
import { type PersonalData, type PersonalHat, hatDef } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  dayTimeline,
  nowAndNext,
  type TimelineItem,
} from "../../personal/timeline";
import { NowCard, Timeline } from "../../personal/TodayParts";
import { Button, Empty, P, T, sticker , tone } from "../../personal/ui";
import { useWhoop } from "../../personal/WhoopCard";
import { band, whoopToday } from "../../personal/whoop";

const BACK = 7;
const AHEAD = 42;
const GUTTER = 22;
const GAP = 8;

/** A short sentence for the day: "Pickups, then dance." */
function headline(
  items: TimelineItem[],
  isToday: boolean,
  nowMin: number,
  names: string[],
) {
  const name = (i: TimelineItem, first: boolean) => {
    const t = i.title.replace(/^Dinner · /, "");
    // Reads as a sentence ("then dinner"); people's names stay capitalized.
    const proper =
      i.key === "partner" ||
      names.some((n) => n && t.toLowerCase().startsWith(n.toLowerCase())) ||
      /^[A-Z]{2}/.test(t);
    return first || proper ? t : t[0].toLowerCase() + t.slice(1);
  };
  const say = (list: TimelineItem[]) =>
    list.length >= 2
      ? `${name(list[0], true)}, then ${name(list[1], false)}.`
      : `${name(list[0], true)}.`;
  if (isToday) {
    const { now, next } = nowAndNext(items, nowMin);
    const list = [now, next].filter((x): x is TimelineItem => !!x);
    return list.length ? say(list) : "That’s the day. Rest counts.";
  }
  // Events say more about a day than recurring chores do.
  const special = [
    ...items.filter((i) => i.kind === "event"),
    ...items.filter((i) => i.kind === "task"),
  ];
  if (special.length >= 2) return say(special);
  if (special.length === 1) return `${name(special[0], true)}, plus the usual.`;
  return items.length ? "The usual rhythm." : "Wide open.";
}

/** Hats that show up on this day, for the card header. */
function hatsOn(items: TimelineItem[]) {
  const counts = new Map<PersonalHat, number>();
  for (const i of items)
    if (i.tag && i.kind !== "routine" && i.kind !== "work")
      counts.set(i.tag, (counts.get(i.tag) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

/** Weekend (or a bare Monday): fewer than three of the next seven dinners are planned. */
function weekNeedsDinners(data: PersonalData, today: string) {
  const day = new Date(`${today}T12:00:00`).getDay();
  if (![0, 1, 6].includes(day)) return false;
  let planned = 0;
  for (let i = 0; i < 7; i++) if (data.dinners[addDays(today, i)]) planned++;
  return planned < 3;
}

export default function Home() {
  const a = usePersonal();
  const { data, today, nowMin, error } = a;
  const params = useLocalSearchParams<{ date?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardW = Math.min(width, 620) - GUTTER * 2;
  const step = cardW + GAP;
  const days = useMemo(
    () =>
      Array.from({ length: BACK + AHEAD + 1 }, (_, i) =>
        addDays(today, i - BACK),
      ),
    [today],
  );
  const [index, setIndex] = useState(BACK);
  const list = useRef<FlatList<string>>(null);
  const date = days[index] ?? today;
  const go = useCallback(
    (i: number, animated = true) => {
      const n = Math.max(0, Math.min(days.length - 1, i));
      setIndex(n);
      list.current?.scrollToOffset({ offset: n * step, animated });
    },
    [days.length, step],
  );
  // Arriving with ?date= (from Capture) jumps to that day.
  useEffect(() => {
    if (!params.date || !/^\d{4}-\d{2}-\d{2}$/.test(params.date)) return;
    const i = days.indexOf(params.date);
    if (i >= 0) setTimeout(() => go(i), 60);
  }, [params.date, days, go]);
  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / step);
    if (i !== index) setIndex(Math.max(0, Math.min(days.length - 1, i)));
  };
  const { summary } = useWhoop();
  const whoop = whoopToday(summary, today);
  const did = didToday(data, today, nowMin);
  const selected = dayTimeline(data, date, nowMin, today);
  const offset = daysBetween(today, date);

  if (error)
    return (
      <View style={{ flex: 1, padding: 20, paddingTop: insets.top + 20 }}>
        <Empty
          title="We couldn’t open your saved plan"
          detail={error}
          action="Recovery and settings"
          onPress={() => router.push("/settings")}
        />
      </View>
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: P.bg,
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 96,
      }}
    >
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: GUTTER - 4,
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
          }}
        >
          <Hat id="cap" size={28} tilt={-10} />
          <T display size={22}>
            hats.
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`What Hats did: ${did} things today`}
          onPress={() => router.push("/log")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 38,
            paddingLeft: 4,
            paddingRight: 12,
            borderRadius: 19,
            backgroundColor: P.paper,
            borderWidth: 2,
            borderColor: P.edge,
            transform: [{ translateY: pressed ? 1 : 0 }],
          })}
        >
          <Hat id="stack" size={28} />
          <T size={13} bold>
            {did
              ? `Hats did ${did} ${did === 1 ? "thing" : "things"}`
              : "What Hats did"}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings and connections"
          onPress={() => router.push("/settings")}
          style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: P.sun,
            alignItems: "center",
            justifyContent: "center",
            ...sticker(pressed ? 2 : 4),
          })}
        >
          <Hat id="hardhat" size={30} />
        </Pressable>
      </View>

      {/* Day heading */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          paddingHorizontal: GUTTER,
          paddingTop: 10,
          paddingBottom: 10,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T size={13} bold muted>
            {offset === 0
              ? fmtLong(date)
              : offset === 1
                ? `Tomorrow · ${fmtLong(date)}`
                : offset === -1
                  ? `Yesterday · ${fmtLong(date)}`
                  : fmtLong(date)}
          </T>
          <T display size={26} numberOfLines={2}>
            {headline(selected.items, date === today, nowMin, [
              data.preferences.partner,
              data.preferences.name,
              ...data.people.map((x) => x.name),
            ])}
          </T>
        </View>
        {offset !== 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to today"
            onPress={() => go(BACK)}
            style={{
              paddingHorizontal: 12,
              height: 38,
              justifyContent: "center",
              borderRadius: 19,
              backgroundColor: P.sun,
              borderWidth: 2,
              borderColor: P.edge,
            }}
          >
            <T size={13} bold color={P.onSun}>
              {offset > 0 ? "‹ Today" : "Today ›"}
            </T>
          </Pressable>
        ) : whoop?.recovery != null ? (
          <View
            accessibilityLabel={`Recovery ${Math.round(whoop.recovery)} percent`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 5,
              paddingLeft: 6,
              paddingRight: 10,
              borderRadius: 16,
              backgroundColor: P.mint,
              borderWidth: 1.5,
              borderColor: P.edge,
            }}
          >
            <Hat id="pompom" size={26} />
            <View>
              <T size={13} bold>
                {Math.round(whoop.recovery)}%
              </T>
              <T size={10} bold>
                {band(whoop.recovery) === "low"
                  ? "low"
                  : band(whoop.recovery) === "steady"
                    ? "steady"
                    : "strong"}
              </T>
            </View>
          </View>
        ) : null}
      </View>

      {/* Day cards */}
      <FlatList
        ref={list}
        data={days}
        horizontal
        keyExtractor={(d) => d}
        showsHorizontalScrollIndicator={false}
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        initialScrollIndex={BACK}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={(e) => {
          // Web has no momentum events.
          if (process.env.EXPO_OS === "web") onEnd(e);
        }}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        contentContainerStyle={{ paddingHorizontal: GUTTER }}
        style={{ flex: 1 }}
        renderItem={({ item: d, index: i }) => (
          <View style={{ width: cardW, marginRight: GAP }}>
            <DayCard date={d} active={i === index} />
          </View>
        )}
      />

      {/* Where you are in the week */}
      <View
        accessibilityLabel={`Day ${offset >= 0 ? "+" : ""}${offset} from today`}
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          paddingTop: 10,
        }}
      >
        {[-2, -1, 0, 1, 2].map((k) => {
          const d = days[index + k];
          if (!d) return <View key={k} style={{ width: 30 }} />;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={fmtLong(d)}
              onPress={() => go(index + k)}
              style={{
                minWidth: 30,
                height: 30,
                paddingHorizontal: 6,
                borderRadius: 15,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: k === 0 ? P.ink : "transparent",
              }}
            >
              <T size={11} bold color={k === 0 ? P.paper : P.muted}>
                {d === today
                  ? "Today"
                  : `${dayShort(d)} ${fromISO(d).getDate()}`}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DayCard({ date, active }: { date: string; active: boolean }) {
  const a = usePersonal();
  const { data, today, nowMin, mutate, say } = a;
  const isToday = date === today;
  const { items, allDay } = dayTimeline(data, date, nowMin, today);
  const low = data.lowEnergyDays.includes(date);
  const lighterEntry = (data.log ?? [])
    .slice()
    .reverse()
    .find(
      (e) => e.undo?.t === "notLighter" && e.undo.date === date && !e.undone,
    );
  const waiting = isToday
    ? planDay(data, date, nowMin).filter((x) => !x.time).length
    : 0;
  const tags = hatsOn(items);
  const label =
    date === today
      ? "TODAY"
      : date === addDays(today, 1)
        ? "TOMORROW"
        : date === addDays(today, -1)
          ? "YESTERDAY"
          : "";
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 28,
        backgroundColor: P.paper,
        overflow: "hidden",
        ...(active ? sticker(5) : { borderWidth: 2, borderColor: P.line }),
      }}
    >
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <T size={12} bold style={{ letterSpacing: 0.6, flex: 1 }}>
            {label ? `${label} · ` : ""}
            {dayShort(date).toUpperCase()} {fromISO(date).getDate()}
          </T>
          {tags.map(([hat, n]) => (
            <Pressable
              key={hat}
              accessibilityRole="button"
              accessibilityLabel={`${hatDef(hat).name}: ${n} today`}
              accessibilityHint={`Opens ${hatDef(hat).name}`}
              hitSlop={8}
              onPress={() => router.push({ pathname: "/hat/[id]", params: { id: hat } })}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
                paddingLeft: 2,
                paddingRight: 7,
                paddingVertical: 1,
                borderRadius: 10,
                backgroundColor: tone(hatDef(hat).tint),
                borderWidth: 1.5,
                borderColor: P.edge,
              }}
            >
              <Hat id={hatDef(hat).art} size={16} />
              <T size={11} bold>
                {n}
              </T>
            </Pressable>
          ))}
        </View>

        {low ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 18,
              backgroundColor: tone("#FFF0C2"),
              borderWidth: 2,
              borderColor: P.edge,
            }}
          >
            <Hat id="nightcap" size={34} tilt={-8} />
            <View style={{ flex: 1 }}>
              <T size={14} bold>
                {lighterEntry ? "Hats made this day lighter" : "A lighter day"}
              </T>
              <T size={12} muted>
                Fewer to-dos · easier dinner · rest instead of gym
              </T>
            </View>
            <Button
              title={lighterEntry ? "Undo" : "Normal"}
              small
              quiet
              onPress={() => {
                mutate((d) => {
                  if (lighterEntry) undoEntry(d, lighterEntry.id);
                  else
                    d.lowEnergyDays = d.lowEnergyDays.filter((x) => x !== date);
                });
                say("Back to a normal day.");
              }}
            />
          </View>
        ) : null}

        {isToday ? <NowCard items={items} /> : null}

        <Timeline items={items} allDay={allDay} date={date} />

        {isToday && weekNeedsDinners(data, today) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plan this week’s dinners"
            accessibilityHint="Opens Meals"
            onPress={() => router.push("/meals")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 18,
              backgroundColor: tone("#FFE6D3"),
              borderWidth: 2,
              borderColor: P.edge,
              transform: [{ translateY: pressed ? 1 : 0 }],
            })}
          >
            <Hat id="chef" size={34} tilt={-8} />
            <View style={{ flex: 1 }}>
              <T size={14} bold>
                Plan this week’s dinners
              </T>
              <T size={12} muted>
                Flip through recipe cards · the grocery list builds itself
              </T>
            </View>
            <T bold color={P.blue}>
              ›
            </T>
          </Pressable>
        ) : null}

        {waiting ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/hats")}
          >
            <T size={13} muted>
              {waiting} flexible {waiting === 1 ? "to-do is" : "to-dos are"}{" "}
              waiting for room instead of piling onto today ›
            </T>
          </Pressable>
        ) : null}

        {!low && date >= today ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              mutate((d) => {
                if (!d.lowEnergyDays.includes(date)) d.lowEnergyDays.push(date);
              });
              say(
                "Made lighter: fewer to-dos, easier dinner, rest instead of gym.",
              );
            }}
            style={{
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              minHeight: 40,
              borderRadius: 20,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: P.muted,
            }}
          >
            <Hat id="nightcap" size={22} />
            <T size={13} bold muted>
              Low on energy? Make this day lighter
            </T>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
