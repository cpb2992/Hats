import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { addDays, fmtTime } from "../engine/dates";
import { haptic } from "./haptics";
import {
  finishStep,
  mealFor,
  nextStep,
  reschedule,
  shoppingFor,
} from "./engine";
import { Hat } from "./Hat";
import { HATS, type Habit, type PersonalData } from "./model";
import { usePersonal } from "./Store";
import { streakFor } from "./streaks";
import {
  isFaded,
  minutesOfDay,
  nowAndNext,
  type TimelineItem,
} from "./timeline";
import { Button, P, Row, T, sticker } from "./ui";

const MILESTONES = [3, 7, 14, 21, 30, 50, 100];

type Actions = ReturnType<typeof usePersonal>;

/** Check in (or undo) a streak, celebrating milestones. */
export function toggleHabit(a: Actions, h: Habit) {
  const before = streakFor(h, a.today);
  a.mutate((d) => {
    const habit = d.habits?.find((x) => x.id === h.id);
    if (!habit) return;
    habit.checkins = before.done
      ? habit.checkins.filter((x) => x !== a.today)
      : [...habit.checkins, a.today];
  });
  if (before.done) {
    haptic("tap");
    a.say("Today’s check-in removed.");
    return;
  }
  const after = streakFor(
    { ...h, checkins: [...h.checkins, a.today] },
    a.today,
  );
  const unit = h.frequency === "weekly" ? "week" : "day";
  const milestone =
    after.current > before.current && MILESTONES.includes(after.current);
  const weekMet =
    h.frequency === "weekly" &&
    before.progress < h.target &&
    after.progress >= h.target;
  a.say(`Checked in · ${h.title}`);
  a.celebrate({
    hat: milestone ? "crown" : HATS[h.hat].art,
    big: milestone || weekMet,
    title: milestone
      ? `${after.current}-${unit} streak!`
      : weekMet
        ? "Week goal met!"
        : undefined,
  });
}

/** Today's streaks as one-tap stickers. */
export function StreakStrip() {
  const a = usePersonal();
  const habits = a.data.habits ?? [];
  if (!habits.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, paddingVertical: 2, paddingRight: 4 }}
    >
      {habits.map((h) => {
        const s = streakFor(h, a.today);
        const weekly = h.frequency === "weekly";
        return (
          <Pressable
            key={h.id}
            accessibilityRole="button"
            accessibilityState={{ checked: s.done }}
            accessibilityLabel={`${h.title}. ${s.current} ${s.unit}${s.current === 1 ? "" : "s"} running.${weekly ? ` ${s.progress} of ${s.target} this week.` : ""} ${s.done ? "Checked in today. Tap to undo." : "Tap to check in."}`}
            onPress={() => toggleHabit(a, h)}
            style={({ pressed }) => ({
              width: 148,
              padding: 12,
              borderRadius: 20,
              backgroundColor: s.done ? P.sun : P.paper,
              gap: 4,
              ...sticker(pressed ? 2 : 4),
              transform: [{ translateY: pressed ? 2 : 0 }],
            })}
          >
            <Row>
              <Hat id={HATS[h.hat].art} size={30} tilt={-8} />
              <T display size={26}>
                {s.current}
              </T>
              <T size={12} muted>
                {s.unit}
                {s.current === 1 ? "" : "s"}
              </T>
            </Row>
            <T size={13} bold style={{ minHeight: 34 }}>
              {h.title}
            </T>
            {weekly ? (
              <Row>
                {Array.from({ length: s.target }, (_, n) => (
                  <View
                    key={n}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      borderWidth: 1.5,
                      borderColor: P.ink,
                      backgroundColor: n < s.progress ? P.ink : "transparent",
                    }}
                  />
                ))}
                <T size={12} muted>
                  this week
                </T>
              </Row>
            ) : (
              <T size={12} bold muted={!s.done}>
                {s.done ? "✓ Done today" : "Not yet today"}
              </T>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function toggleRoutine(a: Actions, item: TimelineItem) {
  const was = item.done;
  a.mutate((d) => {
    d.routineDone ??= {};
    const list = d.routineDone[a.today] ?? [];
    d.routineDone[a.today] = was
      ? list.filter((k) => k !== item.key)
      : [...list, item.key!];
    // Keep a short history only.
    for (const day of Object.keys(d.routineDone))
      if (day < addDays(a.today, -21)) delete d.routineDone[day];
  });
  if (was) haptic("tap");
  a.say(was ? `${item.title} · not done` : `${item.title} · done`);
  if (!was)
    a.celebrate({
      hat: item.hat,
      big: item.key === "bedtime",
      title: item.key === "bedtime" ? "Kids down. Nice work." : undefined,
    });
}

function finishTaskStep(a: Actions, taskId: string) {
  const task = a.data.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const lastStep = task.steps.filter((s) => !s.done).length <= 1;
  a.mutate((d) => {
    const t = d.tasks.find((x) => x.id === taskId);
    if (t) finishStep(t);
  });
  a.say(lastStep ? `${task.title} · all done` : `${nextStep(task)} · done`);
  a.celebrate({
    hat: HATS[task.hat].art,
    big: lastStep,
    title: lastStep ? "All the way done!" : undefined,
  });
}

/** One big answer to "what now?" */
export function NowCard({ items }: { items: TimelineItem[] }) {
  const a = usePersonal();
  const { now, next } = nowAndNext(items, a.nowMin);
  if (!now)
    return (
      <View
        style={{
          backgroundColor: P.dark,
          borderRadius: 24,
          padding: 18,
          gap: 8,
          alignItems: "center",
        }}
      >
        <Hat id="nightcap" size={64} />
        <T display size={22} color={P.paper}>
          That’s the day.
        </T>
        <T color="#D5DDE8">Nothing left that needs you. Rest counts too.</T>
      </View>
    );
  const started = minutesOfDay(now.time) <= a.nowMin;
  const task = now.taskId
    ? a.data.tasks.find((t) => t.id === now.taskId)
    : null;
  const meal = now.key === "dinner" ? mealFor(a.data, a.today) : null;
  const dinnerChosen = !!a.data.dinners[a.today];
  return (
    <View
      style={{
        backgroundColor: P.dark,
        borderRadius: 24,
        padding: 18,
        gap: 10,
      }}
    >
      <Row>
        <View
          style={{
            backgroundColor: started ? P.sun : "#2F4466",
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <T size={12} bold color={started ? P.ink : P.paper}>
            {started ? "NOW" : `UP NEXT · ${fmtTime(now.time, true)}`}
          </T>
        </View>
        {next ? (
          <T size={12} color="#C8D7EA" style={{ flexShrink: 1 }}>
            then {next.title} · {fmtTime(next.time, true)}
          </T>
        ) : null}
      </Row>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Hat id={now.hat} size={64} tilt={-6} />
        <View style={{ flex: 1, gap: 2 }}>
          <T display size={24} color={P.paper}>
            {task ? task.title : now.title}
          </T>
          {now.detail ? (
            <T size={14} color="#D5DDE8">
              {task && task.steps.length
                ? `Next: ${nextStep(task)}`
                : now.detail}
            </T>
          ) : null}
        </View>
      </View>
      <Row>
        {now.kind === "routine" &&
        now.key === "dinner" &&
        !dinnerChosen &&
        meal ? (
          <Button
            title={`Make ${meal.name}`}
            small
            tone="sun"
            onPress={() => {
              a.mutate((d) => {
                d.dinners[a.today] = meal.id;
                for (const item of shoppingFor(d, meal.id))
                  if (!d.groceries.includes(item)) d.groceries.push(item);
              });
              a.say(`Dinner tonight · ${meal.name}`);
              a.celebrate({ hat: "chef" });
            }}
          />
        ) : now.kind === "routine" ? (
          <Button
            title="Done"
            small
            tone="sun"
            onPress={() => toggleRoutine(a, now)}
          />
        ) : task ? (
          <Button
            title={task.steps.length ? `Done: ${nextStep(task)}` : "Done"}
            small
            tone="sun"
            onPress={() => finishTaskStep(a, task.id)}
          />
        ) : null}
        {now.key === "bath" ? (
          <Button
            title="Not tonight"
            small
            quiet
            onPress={() => {
              a.mutate((d) => {
                d.preferences.bathAnchor = addDays(a.today, 1);
              });
              a.say("Bath night moved to tomorrow.");
            }}
          />
        ) : null}
        {now.key === "dinner" ? (
          <Button
            title={dinnerChosen ? "Meals" : "Something else"}
            small
            quiet
            hat="chef"
            onPress={() => router.push("/hat/home")}
          />
        ) : null}
        {task && !task.fixed ? (
          <Button
            title="Later"
            small
            quiet
            onPress={() => {
              let moved = false;
              a.mutate((d) => {
                moved = reschedule(d, task.id, a.today, a.nowMin);
              });
              a.say(
                moved
                  ? "Moved to your next opening."
                  : "No opening soon. Edit it when you can.",
              );
            }}
          />
        ) : null}
      </Row>
    </View>
  );
}

/** A day as a gentle vertical timeline. Tap the circle to check things off. */
export function Timeline({
  items,
  allDay,
  isToday,
}: {
  items: TimelineItem[];
  allDay: { id: string; title: string }[];
  isToday: boolean;
}) {
  const a = usePersonal();
  const [showEarlier, setShowEarlier] = useState(false);
  const earlier = isToday
    ? items.filter(
        (i) =>
          (i.done || isFaded(i, a.nowMin)) && minutesOfDay(i.time) < a.nowMin,
      )
    : [];
  const hidden = showEarlier
    ? new Set<string>()
    : new Set(earlier.map((i) => i.id));
  const shown = items.filter((i) => !hidden.has(i.id));
  const nowIndex = isToday
    ? shown.findIndex((i) => minutesOfDay(i.time) > a.nowMin)
    : -1;
  const rows: (TimelineItem | "now")[] = [...shown];
  if (isToday) rows.splice(nowIndex === -1 ? rows.length : nowIndex, 0, "now");
  return (
    <View style={{ gap: 0 }}>
      {allDay.length ? (
        <Row>
          {allDay.map((e) => (
            <View
              key={e.id}
              style={{
                backgroundColor: P.sky,
                borderRadius: 14,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <T size={12} bold>
                All day · {e.title}
              </T>
            </View>
          ))}
        </Row>
      ) : null}
      {earlier.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showEarlier }}
          onPress={() => setShowEarlier(!showEarlier)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 36,
          }}
        >
          <T size={12} muted style={{ width: 62, textAlign: "right" }}>
            Earlier
          </T>
          <View style={{ width: 10, alignItems: "center" }}>
            <View style={{ width: 2, height: 16, backgroundColor: P.line }} />
          </View>
          <T size={13} bold muted>
            {showEarlier
              ? "Hide earlier"
              : `${earlier.length} earlier ${earlier.length === 1 ? "step" : "steps"} · show`}
          </T>
        </Pressable>
      ) : null}
      {rows.map((row, i) => {
        if (row === "now")
          return (
            <View
              key="now"
              accessibilityLabel="Now"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginVertical: 2,
              }}
            >
              <T
                size={11}
                bold
                color={P.orange}
                style={{ width: 62, textAlign: "right" }}
              >
                NOW
              </T>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: P.orange,
                }}
              />
              <View style={{ flex: 1, height: 2, backgroundColor: P.orange }} />
            </View>
          );
        const item = row;
        const checkable =
          isToday && (item.kind === "routine" || item.kind === "task");
        return (
          <View
            key={item.id}
            style={{
              flexDirection: "row",
              gap: 8,
              opacity:
                item.done || (isToday && isFaded(item, a.nowMin)) ? 0.5 : 1,
            }}
          >
            <T
              size={12}
              muted
              style={{ width: 62, textAlign: "right", paddingTop: 12 }}
            >
              {fmtTime(item.time, true)}
            </T>
            <View style={{ alignItems: "center", width: 10 }}>
              <View
                style={{
                  width: 2,
                  flex: 1,
                  backgroundColor: i === 0 ? "transparent" : P.line,
                }}
              />
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: item.done ? P.ink : P.paper,
                  borderWidth: 2,
                  borderColor: P.ink,
                }}
              />
              <View
                style={{
                  width: 2,
                  flex: 1,
                  backgroundColor:
                    i === rows.length - 1 ? "transparent" : P.line,
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.title}${item.done ? ", done" : ""}`}
              onPress={() =>
                item.taskId
                  ? router.push({
                      pathname: "/task/[id]",
                      params: { id: item.taskId },
                    })
                  : item.key === "dinner"
                    ? router.push("/hat/home")
                    : undefined
              }
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 7,
                minHeight: 48,
              }}
            >
              <Hat id={item.hat} size={30} tilt={-6} />
              <View style={{ flex: 1 }}>
                <T
                  bold
                  size={15}
                  style={{
                    textDecorationLine: item.done ? "line-through" : "none",
                  }}
                >
                  {item.title}
                </T>
                {item.detail ? (
                  <T size={12} muted numberOfLines={1}>
                    {item.detail}
                  </T>
                ) : null}
              </View>
              {checkable ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}
                  accessibilityLabel={`Mark ${item.title} ${item.done ? "not done" : "done"}`}
                  hitSlop={8}
                  onPress={() =>
                    item.kind === "routine"
                      ? toggleRoutine(a, item)
                      : item.taskId && finishTaskStep(a, item.taskId)
                  }
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: item.done ? P.ink : "#9AA5B5",
                    backgroundColor: item.done ? P.sun : P.paper,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <T bold size={15}>
                    {item.done ? "✓" : ""}
                  </T>
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export type { PersonalData };
