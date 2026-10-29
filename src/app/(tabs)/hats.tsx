import { router } from "expo-router";
import { Pressable, View } from "react-native";
import {
  addDays,
  dayShort,
  fmtRelative,
  fmtTime,
  weekday,
} from "../../engine/dates";
import { budgetSummary } from "../../personal/engine";
import { Hat } from "../../personal/Hat";
import {
  HATS,
  allHats,
  hatDef,
  type PersonalData,
  type PersonalHat,
} from "../../personal/model";
import { eventsOn } from "../../personal/repeat";
import { usePersonal } from "../../personal/Store";
import { StreakStrip } from "../../personal/TodayParts";
import { dateTime } from "../../personal/timeline";
import {
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  sticker,
  tone,
} from "../../personal/ui";
import { WhoopToday } from "../../personal/WhoopCard";

/** The next thing under a hat in the coming two weeks: an event, a date night, or a to-do. */
function nextFor(data: PersonalData, hat: PersonalHat, today: string) {
  for (let i = 0; i < 14; i++) {
    const date = addDays(today, i);
    const when = (t?: string) =>
      `${i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayShort(date)}${t ? ` ${fmtTime(t, true)}` : ""}`;
    const ev = eventsOn(data, date)
      .filter((e) => e.hat === hat)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    if (ev) return `${ev.title} · ${when(ev.allDay ? undefined : ev.start)}`;
    if (hat === "husband") {
      const d = data.dates.find((x) => x.date === date);
      if (d) return `Date night · ${when(dateTime(d))}`;
    }
    const t = data.tasks.find((x) => x.hat === hat && !x.doneAt && x.date === date);
    if (t) return `${t.title} · ${when(t.time ?? undefined)}`;
  }
  return null;
}

export default function Hats() {
  const { data, today } = usePersonal();
  const p = data.preferences;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const gym = week.filter((d) => p.gymDays.includes(weekday(d)));
  const month = today.slice(0, 7);
  const money = (["takeout", "dates", "gifts", "family"] as const)
    .map((c) => ({ c, b: budgetSummary(data, c, month) }))
    .filter((x) => x.b.limit > 0);
  return (
    <Page>
      <Header
        title="Your hats."
        subtitle="What’s next under each one."
        hat="stack"
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {allHats(data.customHats).map((id, index) => {
          const hat = hatDef(id, data.customHats);
          const open = data.tasks.filter((t) => t.hat === id && !t.doneAt).length;
          const next = nextFor(data, id, today);
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${hat.name}. ${next ? `Next: ${next}.` : ""} ${open} open.`}
              onPress={() => router.push({ pathname: "/hat/[id]", params: { id } })}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: 145,
                maxWidth: 340,
                minHeight: 150,
                backgroundColor: tone(hat.tint),
                borderRadius: 24,
                padding: 16,
                gap: 6,
                ...sticker(pressed ? 3 : 5),
                transform: [
                  { translateY: pressed ? 2 : 0 },
                  { rotate: pressed ? "0deg" : index % 2 ? "0.8deg" : "-0.8deg" },
                ],
              })}
            >
              <Hat id={hat.art} size={52} tilt={index % 2 ? 8 : -8} />
              <T size={hat.name.length > 12 ? 17 : 19} display numberOfLines={2}>
                {hat.name}
              </T>
              <T size={12} muted numberOfLines={2}>
                {next ? `Next: ${next}` : hat.subtitle}
              </T>
              <T size={12} bold color={hat.color}>
                {open ? `${open} open` : "All clear"}
              </T>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a hat"
          onPress={() => router.push("/hat-new")}
          style={({ pressed }) => ({
            flexGrow: 1,
            flexBasis: 145,
            maxWidth: 340,
            minHeight: 150,
            backgroundColor: P.paper,
            borderRadius: 24,
            padding: 16,
            gap: 6,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2.5,
            borderStyle: "dashed",
            borderColor: P.edge,
            transform: [{ translateY: pressed ? 2 : 0 }],
          })}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: P.sun,
              alignItems: "center",
              justifyContent: "center",
              ...sticker(4),
            }}
          >
            <T display size={30} color={P.onSun} style={{ lineHeight: 34 }}>
              +
            </T>
          </View>
          <T size={18} display>
            Add a hat
          </T>
          <T size={12} muted style={{ textAlign: "center" }}>
            Name it and pick one from the library.
          </T>
        </Pressable>
      </View>

      <Section hat="pompom" title="Room for you" />
      <Section
        hat="crown"
        title="Streaks"
        action="Manage"
        onPress={() => router.push("/hat/myself")}
      />
      {(data.habits ?? []).length ? (
        <StreakStrip />
      ) : (
        <T muted>
          Optional. Add one in Myself if you want a streak to keep alive.
        </T>
      )}

      <WhoopToday />

      <Panel tint={HATS.myself.tint}>
        <Row>
          <Hat id="pompom" size={32} tilt={-8} />
          <T size={12} bold>
            GYM & GUITAR · PLACED FOR YOU
          </T>
        </Row>
        {gym.length ? (
          gym.map((d) => {
            const low = data.lowEnergyDays.includes(d);
            return (
              <Row key={d}>
                <T bold style={{ width: 92 }}>
                  {d === today
                    ? "Today"
                    : fmtRelative(d, today) === "Tomorrow"
                      ? "Tomorrow"
                      : dayShort(d)}
                </T>
                <T style={{ flex: 1 }}>
                  {low
                    ? "Rest instead · lighter day"
                    : `Gym ${fmtTime(p.gymStart, true)} · ${p.gymMinutes} min`}
                </T>
              </Row>
            );
          })
        ) : (
          <T muted>No gym days set. Pick them in Settings › Your rhythm.</T>
        )}
        <T size={13} muted>
          Guitar fits into open evenings once the kids are down.
        </T>
      </Panel>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/hat/myself")}
        style={({ pressed }) => ({
          padding: 14,
          gap: 8,
          borderRadius: 22,
          backgroundColor: P.paper,
          ...sticker(pressed ? 2 : 4),
        })}
      >
        <Row>
          <Hat id="tophat" size={32} tilt={-8} />
          <T size={12} bold style={{ flex: 1 }}>
            MONEY THIS MONTH
          </T>
          <T muted>›</T>
        </Row>
        {money.length ? (
          money.map(({ c, b }) => (
            <View key={c} style={{ gap: 4 }}>
              <Row>
                <T bold style={{ flex: 1 }}>
                  {c[0].toUpperCase() + c.slice(1)}
                </T>
                <T size={13} bold>
                  ${Math.round(b.spent)} of ${b.limit}
                </T>
              </Row>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: P.line,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.min(100, (b.spent / b.limit) * 100)}%`,
                    height: 8,
                    backgroundColor: b.spent > b.limit ? P.orange : P.ink,
                  }}
                />
              </View>
            </View>
          ))
        ) : (
          <T muted>Set monthly targets in Myself to see them here.</T>
        )}
      </Pressable>

      {(data.moments ?? []).length ? (
        <Panel>
          <Row>
            <Hat id="crown" size={30} tilt={-8} />
            <T size={12} bold>
              MOMENTS YOU MADE ROOM FOR
            </T>
          </Row>
          {(data.moments ?? [])
            .slice(-4)
            .reverse()
            .map((m) => (
              <Row key={m.id}>
                <Hat id={hatDef(m.hat).art} size={24} />
                <T size={14} style={{ flex: 1 }}>
                  {m.title}
                </T>
                <T size={12} muted>
                  {fmtRelative(m.date, today).replace("Today", "today")}
                </T>
              </Row>
            ))}
        </Panel>
      ) : null}

    </Page>
  );
}
