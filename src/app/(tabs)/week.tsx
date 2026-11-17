import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { addDays, dayShort, fmtTime, fromISO, todayISO } from "../../engine/dates";
import { Food, Hat } from "../../personal/Hat";
import { haptic } from "../../personal/haptics";
import { planDinner, weekDinners } from "../../personal/meals";
import { hatDef, type PersonalData } from "../../personal/model";
import { recipeById } from "../../personal/recipes";
import { daySummary, schoolBlocks } from "../../personal/school";
import { usePersonal } from "../../personal/Store";
import { dayTimeline, type TimelineItem } from "../../personal/timeline";
import { Button, Chip, Header, HatTag, P, Page, Row, T, sticker , tone } from "../../personal/ui";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** What's worth seeing at week level: plans with a time and a reason, not the bedtime routine. */
function weekItems(data: PersonalData, date: string, nowMin: number, today: string) {
  const { items, allDay } = dayTimeline(data, date, nowMin, today);
  const shown = items.filter(
    (i) =>
      i.kind === "event" ||
      i.kind === "date" ||
      (i.kind === "task" && (i.fixed || i.time)) ||
      (i.kind === "routine" && i.key === "slowcook"),
  );
  const school = schoolBlocks(data, date);
  return { shown, allDay, school };
}

const openDay = (date: string) => router.push({ pathname: "/", params: { date } });

export default function Week() {
  const { data, today, nowMin, mutate, say } = usePersonal();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0);
  return (
    <Page>
      <Header
        title={mode === "week" ? "Your week." : "Your month."}
        subtitle="Every hat, day by day."
        hat="safari"
      />
      <Row>
        <Chip title="Week" selected={mode === "week"} onPress={() => { setMode("week"); setOffset(0); }} />
        <Chip title="Month" selected={mode === "month"} onPress={() => { setMode("month"); setOffset(0); }} />
      </Row>
      {mode === "week" ? (
        <WeekView offset={offset} setOffset={setOffset} data={data} today={today} nowMin={nowMin} onPlan={(date, id, name) => {
          mutate((d) => void planDinner(d, date, id));
          haptic("success");
          say(`${dayShort(date)}: ${name}`);
        }} />
      ) : (
        <MonthView offset={offset} setOffset={setOffset} data={data} today={today} nowMin={nowMin} />
      )}
    </Page>
  );
}

function Pager({ label, onPrev, onNext, onReset, showReset }: { label: string; onPrev: () => void; onNext: () => void; onReset: () => void; showReset: boolean }) {
  const btn = (text: string, a11y: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: P.paper, borderWidth: 2, borderColor: P.edge }}
    >
      <T bold size={18}>{text}</T>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {btn("‹", "Earlier", onPrev)}
      <View style={{ flex: 1, alignItems: "center" }}>
        <T bold size={16}>{label}</T>
        {showReset ? (
          <Pressable accessibilityRole="button" onPress={onReset} style={{ minHeight: 28 }}>
            <T size={12} bold color={P.blue}>Back to now</T>
          </Pressable>
        ) : null}
      </View>
      {btn("›", "Later", onNext)}
    </View>
  );
}

function WeekView({
  offset,
  setOffset,
  data,
  today,
  nowMin,
  onPlan,
}: {
  offset: number;
  setOffset: (n: number) => void;
  data: PersonalData;
  today: string;
  nowMin: number;
  onPlan: (date: string, id: string, name: string) => void;
}) {
  const start = addDays(today, offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dinners = weekDinners(data, days);
  const planned = dinners.filter((d) => d.planned).length;
  const label =
    offset === 0
      ? "Next 7 days"
      : `${dayShort(days[0])} ${fromISO(days[0]).getDate()} – ${dayShort(days[6])} ${fromISO(days[6]).getDate()}`;
  return (
    <View style={{ gap: 12 }}>
      <Pager label={label} onPrev={() => setOffset(offset - 1)} onNext={() => setOffset(offset + 1)} onReset={() => setOffset(0)} showReset={offset !== 0} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dinners planned: ${planned} of 7. Open meals and groceries.`}
        onPress={() => router.push("/meals")}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: 20,
          backgroundColor: tone("#FFE6D3"),
          ...sticker(pressed ? 2 : 4),
        })}
      >
        <Hat id="chef" size={38} tilt={-8} />
        <View style={{ flex: 1, gap: 4 }}>
          <T bold>Dinners planned · {planned} of 7</T>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: tone("#F3D2BC"), overflow: "hidden" }}>
            <View style={{ width: `${(planned / 7) * 100}%`, height: 8, backgroundColor: P.orange }} />
          </View>
          <T size={12} muted>
            Recipe cards and groceries ({data.groceries.length}) ›
          </T>
        </View>
      </Pressable>

      {days.map((date, i) => {
        const { shown, allDay, school } = weekItems(data, date, date === today ? nowMin : 0, today);
        const dinner = dinners[i];
        const r = recipeById(dinner.meal?.id);
        const isToday = date === today;
        return (
          <View
            key={date}
            style={{
              borderRadius: 22,
              backgroundColor: isToday ? tone("#FFF0C2") : P.paper,
              padding: 12,
              gap: 8,
              ...sticker(isToday ? 4 : 2),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isToday ? "Today" : dayShort(date)} ${MONTHS[fromISO(date).getMonth()]} ${fromISO(date).getDate()}. Open the day.`}
              onPress={() => openDay(date)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 40 }}
            >
              <View style={{ width: 46, alignItems: "center" }}>
                <T size={11} bold muted>{isToday ? "TODAY" : dayShort(date).toUpperCase()}</T>
                <T display size={22}>{fromISO(date).getDate()}</T>
              </View>
              <T size={13} muted style={{ flex: 1 }}>
                {shown.length + allDay.length
                  ? `${shown.length + allDay.length} ${shown.length + allDay.length === 1 ? "plan" : "plans"}${school.length ? " · school day" : ""}`
                  : school.length
                    ? "School day"
                    : "Wide open"}
              </T>
              <T bold color={P.blue}>›</T>
            </Pressable>
            {allDay.map((e) => (
              <Row key={e.id}>
                {e.hat ? <Hat id={hatDef(e.hat).art} size={18} /> : null}
                <T size={13} bold style={{ flex: 1 }}>{e.title}</T>
              </Row>
            ))}
            {school.length ? (
              <WeekRow
                time={`${fmtTime(school[0].start, true)}`}
                title={`School · ${daySummary(school)}`}
                item={{ tag: "work" } as TimelineItem}
                onPress={() => router.push({ pathname: "/hat/[id]", params: { id: "work" } })}
              />
            ) : null}
            {shown.map((it) => (
              <WeekRow
                key={it.id}
                time={fmtTime(it.time, true)}
                title={it.title}
                detail={it.detail}
                item={it}
                onPress={() =>
                  it.taskId
                    ? router.push({ pathname: "/task/[id]", params: { id: it.taskId } })
                    : it.tag
                      ? router.push({ pathname: "/hat/[id]", params: { id: it.tag } })
                      : openDay(date)
                }
              />
            ))}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4, borderTopWidth: 1.5, borderColor: tone("#EFE3CF") }}>
              <Food id={r?.art ?? "plate"} size={30} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dinner.meal ? `Dinner: ${dinner.planned ? "" : "idea, "}${dinner.meal.name}. Open the recipe.` : "Plan dinner"}
                onPress={() =>
                  dinner.meal
                    ? router.push({ pathname: "/recipe/[id]", params: { id: dinner.meal.id } })
                    : router.push("/meals")
                }
                style={{ flex: 1, minHeight: 40, justifyContent: "center" }}
              >
                <T size={13} bold color={dinner.planned ? P.ink : P.muted} numberOfLines={1}>
                  {dinner.meal ? `${dinner.planned ? "Dinner" : "Idea"} · ${dinner.meal.name}` : "Dinner · nothing yet"}
                </T>
              </Pressable>
              {!dinner.planned && dinner.meal ? (
                <Button title="Plan" small quiet onPress={() => onPlan(date, dinner.meal!.id, dinner.meal!.name)} />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function WeekRow({ time, title, detail, item, onPress }: { time: string; title: string; detail?: string; item: Partial<TimelineItem>; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${time}, ${title}${detail ? `, ${detail}` : ""}`}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 }}
    >
      <T size={12} muted style={{ width: 62, textAlign: "right" }}>{time}</T>
      <View style={{ flex: 1, gap: 2 }}>
        <T size={14} bold numberOfLines={1}>{title}</T>
        {detail ? <T size={11} muted numberOfLines={1}>{detail}</T> : null}
      </View>
      {item.tag ? <HatTag hat={item.tag} /> : null}
    </Pressable>
  );
}

function MonthView({ offset, setOffset, data, today, nowMin }: { offset: number; setOffset: (n: number) => void; data: PersonalData; today: string; nowMin: number }) {
  const base = fromISO(today);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const firstISO = todayISO(first);
  const lead = first.getDay();
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysIn }, (_, i) => addDays(firstISO, i)),
  ];
  while (cells.length % 7) cells.push(null);
  return (
    <View style={{ gap: 10 }}>
      <Pager
        label={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`}
        onPrev={() => setOffset(offset - 1)}
        onNext={() => setOffset(offset + 1)}
        onReset={() => setOffset(0)}
        showReset={offset !== 0}
      />
      <View style={{ borderRadius: 22, backgroundColor: P.paper, padding: 8, ...sticker(3) }}>
        <View style={{ flexDirection: "row" }}>
          {DOW.map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
              <T size={11} bold muted>{d}</T>
            </View>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row" }}>
            {cells.slice(row * 7, row * 7 + 7).map((date, col) => {
              if (!date) return <View key={col} style={{ flex: 1, aspectRatio: 0.82 }} />;
              const { shown, allDay } = weekItems(data, date, date === today ? nowMin : 0, today);
              const n = shown.length + allDay.length;
              const dinner = !!data.dinners[date];
              const bday = allDay.some((x) => x.id.startsWith("bday:"));
              const isToday = date === today;
              return (
                <Pressable
                  key={col}
                  accessibilityRole="button"
                  accessibilityLabel={`${MONTHS[fromISO(date).getMonth()]} ${fromISO(date).getDate()}: ${n ? `${n} ${n === 1 ? "plan" : "plans"}` : "nothing planned"}${dinner ? ", dinner planned" : ""}${bday ? ", a birthday" : ""}`}
                  onPress={() => openDay(date)}
                  style={{
                    flex: 1,
                    aspectRatio: 0.82,
                    margin: 2,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 4,
                    gap: 3,
                    backgroundColor: isToday ? P.sun : n ? tone("#F6EEDF") : "transparent",
                    borderWidth: isToday ? 2 : 0,
                    borderColor: P.edge,
                  }}
                >
                  <T size={13} bold={isToday || n > 0} color={isToday ? P.onSun : undefined}>{fromISO(date).getDate()}</T>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {Array.from({ length: Math.min(3, n) }, (_, k) => (
                      <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? P.onSun : P.ink }} />
                    ))}
                  </View>
                  {bday ? <T size={10}>🎂</T> : dinner ? <Food id="plate" size={14} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <T size={12} muted style={{ textAlign: "center" }}>
        Dots are plans; the little plate means dinner’s planned. Tap a day to open it.
      </T>
    </View>
  );
}
