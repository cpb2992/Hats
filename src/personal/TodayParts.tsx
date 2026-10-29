import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
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
import { setSkipped } from "./auto";
import { Button, HatTag, P, Row, T, sticker } from "./ui";

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

/**
 * Routines run themselves. Tapping a step that counts as done means it was
 * skipped; tapping a skipped one puts it back; tapping an upcoming one marks
 * it done early.
 */
export function toggleRoutine(a: Actions, item: TimelineItem, date = a.today) {
  const passed =
    date < a.today ||
    (date === a.today && minutesOfDay(item.end ?? item.time) <= a.nowMin);
  const key = item.key!;
  a.mutate((d) => {
    d.routineDone ??= {};
    const list = d.routineDone[date] ?? [];
    if (item.skipped) {
      setSkipped(d, date, key, false);
      if (!passed) d.routineDone[date] = [...list, key];
    } else if (item.done) {
      if (passed) setSkipped(d, date, key, true);
      else d.routineDone[date] = list.filter((k) => k !== key);
    } else d.routineDone[date] = [...list, key];
    for (const day of Object.keys(d.routineDone))
      if (day < addDays(a.today, -21)) delete d.routineDone[day];
  });
  if (item.done) {
    haptic("tap");
    a.say(
      passed ? `${item.title} · marked skipped` : `${item.title} · not done`,
    );
    return;
  }
  a.say(
    item.skipped ? `${item.title} · done after all` : `${item.title} · done`,
  );
  if (!item.skipped)
    a.celebrate({
      hat: item.hat,
      big: key === "bedtime",
      title: key === "bedtime" ? "Kids down. Nice work." : undefined,
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
  const work = now.kind === "work";
  // School blocks: how much of this period is left.
  const left = work && started ? minutesOfDay(now.end ?? now.time) - a.nowMin : 0;
  const length = work ? minutesOfDay(now.end ?? now.time) - minutesOfDay(now.time) : 0;
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
            {started
              ? work
                ? `${now.block === "off" ? "OFF" : "NOW"} · UNTIL ${fmtTime(now.end ?? now.time, true)}`
                : "NOW"
              : `UP NEXT · ${fmtTime(now.time, true)}`}
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
          {now.detail || work ? (
            <T size={14} color="#D5DDE8">
              {task && task.steps.length
                ? `Next: ${nextStep(task)}`
                : work && started
                  ? [now.detail, `${left} min left`].filter(Boolean).join(" · ")
                  : now.detail}
            </T>
          ) : null}
        </View>
      </View>
      {work && started && length > 0 ? (
        <View
          accessibilityLabel={`${left} of ${length} minutes left`}
          style={{ height: 8, borderRadius: 4, backgroundColor: "#2F4466", overflow: "hidden" }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max(0, ((length - left) / length) * 100))}%`,
              height: "100%",
              borderRadius: 4,
              backgroundColor: P.sun,
            }}
          />
        </View>
      ) : null}
      <Row>
        {work && now.section ? (
          <Button
            title={`${now.section} attendance in Desk`}
            small
            tone="sun"
            onPress={() =>
              Linking.openURL(
                `desk://attendance?section=${encodeURIComponent(now.section!)}`,
              ).catch(() => a.say("Desk isn’t on this phone yet."))
            }
          />
        ) : null}
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

/**
 * A day as a vertical timeline. Hats are tags. Routines check themselves off
 * as their time passes; tap the circle if one was skipped.
 */
export function Timeline({
  items,
  allDay,
  date,
}: {
  items: TimelineItem[];
  allDay: { id: string; title: string; hat?: Habit["hat"] }[];
  date: string;
}) {
  const a = usePersonal();
  const isToday = date === a.today;
  const past = date < a.today;
  const [showEarlier, setShowEarlier] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const earlier = isToday
    ? items.filter(
        (i) =>
          (i.done || isFaded(i, a.nowMin)) &&
          minutesOfDay(i.end ?? i.time) <= a.nowMin,
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
    <View>
      {allDay.length ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 6,
          }}
        >
          {allDay.map((e) => (
            <View
              key={e.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: P.sky,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: P.ink,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              {e.hat ? <Hat id={HATS[e.hat].art} size={16} /> : null}
              <T size={12} bold>
                All day · {e.title}
              </T>
            </View>
          ))}
        </View>
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
            minHeight: 40,
          }}
        >
          <View style={{ width: 58 }} />
          <View style={{ width: 12, alignItems: "center" }}>
            <View style={{ width: 2, height: 18, backgroundColor: P.line }} />
          </View>
          <T size={13} bold muted>
            {showEarlier
              ? "Hide earlier"
              : `✓ ${earlier.length} earlier · show`}
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
                marginVertical: 3,
              }}
            >
              <T
                size={11}
                bold
                color={P.orange}
                style={{ width: 58, textAlign: "right" }}
              >
                NOW
              </T>
              <View style={{ width: 12, alignItems: "center" }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: P.orange,
                  }}
                />
              </View>
              <View style={{ flex: 1, height: 2, backgroundColor: P.orange }} />
            </View>
          );
        const item = row;
        const checkable =
          (item.kind === "routine" && !(date > a.today)) ||
          (item.kind === "task" && isToday);
        const faded =
          item.done || item.skipped || (isToday && isFaded(item, a.nowMin));
        const detail = item.skipped
          ? "Skipped · tap the circle if it happened"
          : item.auto
            ? "Done automatically · tap if skipped"
            : item.detail;
        const removable = item.kind === "event" && item.source === "hats";
        return (
          <View key={item.id}>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                opacity: faded ? 0.55 : 1,
              }}
            >
              <T
                size={12}
                muted
                style={{ width: 58, textAlign: "right", paddingTop: 14 }}
              >
                {fmtTime(item.time, true)}
              </T>
              <View style={{ alignItems: "center", width: 12 }}>
                <View
                  style={{
                    width: 2,
                    height: 16,
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
                accessibilityLabel={`${item.title}${item.done ? ", done" : item.skipped ? ", skipped" : ""}`}
                onPress={() =>
                  item.taskId
                    ? router.push({
                        pathname: "/task/[id]",
                        params: { id: item.taskId },
                      })
                    : item.key === "dinner"
                      ? router.push("/meals")
                      : removable
                        ? setOpen(open === item.id ? null : item.id)
                        : undefined
                }
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 8,
                  minHeight: 54,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <T
                    bold
                    size={15}
                    style={{
                      textDecorationLine: item.done ? "line-through" : "none",
                    }}
                  >
                    {item.title}
                  </T>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {item.tag ? <HatTag hat={item.tag} /> : null}
                    {detail ? (
                      <T
                        size={12}
                        muted
                        numberOfLines={1}
                        style={{ flexShrink: 1 }}
                      >
                        {detail}
                      </T>
                    ) : null}
                  </View>
                </View>
                {checkable ? (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: item.done }}
                    accessibilityLabel={
                      item.kind === "routine" &&
                      item.done &&
                      (past || item.auto)
                        ? `${item.title} was skipped`
                        : `Mark ${item.title} ${item.done ? "not done" : "done"}`
                    }
                    hitSlop={10}
                    onPress={() =>
                      item.kind === "routine"
                        ? toggleRoutine(a, item, date)
                        : item.taskId && finishTaskStep(a, item.taskId)
                    }
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      borderWidth: 2,
                      borderColor: item.done ? P.ink : "#9AA5B5",
                      backgroundColor: item.done ? P.sun : P.paper,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <T bold size={15}>
                      {item.done ? "✓" : item.skipped ? "–" : ""}
                    </T>
                  </Pressable>
                ) : (
                  <View style={{ width: 30 }} />
                )}
              </Pressable>
            </View>
            {open === item.id && removable ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  paddingLeft: 78,
                  paddingBottom: 8,
                }}
              >
                <Button
                  title="Remove event"
                  small
                  quiet
                  onPress={() => {
                    a.mutate((d) => {
                      d.events = d.events.filter((e) => e.id !== item.eventId);
                    });
                    a.say(`Removed ${item.title}`);
                    setOpen(null);
                  }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {!items.length && !allDay.length ? (
        <T muted style={{ paddingVertical: 12, textAlign: "center" }}>
          Wide open. Tap the mic to add something.
        </T>
      ) : null}
    </View>
  );
}

export type { PersonalData };
