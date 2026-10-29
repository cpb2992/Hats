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
import { HATS } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import { StreakStrip } from "../../personal/TodayParts";
import {
  Button,
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  sticker,
} from "../../personal/ui";
import { WhoopToday } from "../../personal/WhoopCard";

export default function Me() {
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
        title="You get room, too."
        subtitle="Streaks, rest, music, money."
        hat="pompom"
      />

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
                <Hat id={HATS[m.hat].art} size={24} />
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

      <Button
        title="All my hats"
        quiet
        hat="stack"
        onPress={() => router.push("/hats")}
      />
    </Page>
  );
}
