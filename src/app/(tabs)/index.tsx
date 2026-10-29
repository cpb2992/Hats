import { router } from "expo-router";
import { Linking, Pressable, View } from "react-native";
import {
  addDays,
  daysBetween,
  fmtLong,
  fmtRelative,
  weekday,
} from "../../engine/dates";
import { activityFor, planDay, rotateActivity } from "../../personal/engine";
import { HATS } from "../../personal/model";
import { useFocusEnabled } from "../../personal/focus";
import { dayTimeline } from "../../personal/timeline";
import { NowCard, StreakStrip, Timeline } from "../../personal/TodayParts";
import { Hat } from "../../personal/Hat";
import { WhoopToday } from "../../personal/WhoopCard";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Empty,
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  sticker,
} from "../../personal/ui";

export default function Today() {
  const { data, mutate, today, nowMin, nowMs, error, say, celebrate } =
    usePersonal();
  const focusEnabled = useFocusEnabled() && data.preferences.focusConsent;
  const low = data.lowEnergyDays.includes(today);
  const plan = planDay(data, today, nowMin);
  const waiting = plan.filter((x) => !x.time).length;
  const activity = activityFor(data, today);
  const timeline = dayTimeline(data, today, nowMin, true);
  const evening = nowMin >= 15 * 60;
  const lastDate = [...data.dates]
    .filter((d) => d.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const upcomingDate = data.dates.some(
    (d) => d.date > today && d.date <= addDays(today, 14),
  );
  const daysSince = lastDate ? daysBetween(lastDate.date, today) : 0;
  const dateDue = !upcomingDate && (!lastDate || daysSince >= 12);
  const protectedNow =
    data.protectedUntil && new Date(data.protectedUntil).getTime() > nowMs;
  const startSession = (label: string) => {
    mutate((d) => {
      d.protectedLabel = label;
      d.protectedUntil = new Date(Date.now() + 30 * 60000).toISOString();
    });
    say(
      focusEnabled
        ? "30 minutes set aside. Selected distracting apps will return you to the home screen."
        : "30 minutes set aside. Configure distraction protection in Settings to limit selected apps.",
    );
  };
  if (error)
    return (
      <Page>
        <Header title="Your plan is protected." />
        <Empty
          title="We couldn’t open your saved plan"
          detail={error}
          action="Recovery and settings"
          onPress={() => router.push("/settings")}
        />
      </Page>
    );
  return (
    <Page>
      <Header
        title={`${nowMin < 720 ? "Good morning" : nowMin < 1020 ? "A little room for life" : "Home. Be here"}${data.preferences.name ? `, ${data.preferences.name}.` : "."}`}
        subtitle={fmtLong(today)}
        hat={nowMin < 1020 ? "sunhat" : "nightcap"}
      />
      <Row>
        <Chip
          title={low ? "Low-energy day" : "Keep today lighter"}
          selected={low}
          onPress={() =>
            mutate((d) => {
              d.lowEnergyDays = low
                ? d.lowEnergyDays.filter((x) => x !== today)
                : [...d.lowEnergyDays, today];
            })
          }
        />
      </Row>
      {protectedNow ? (
        <Panel dark>
          <Hat id="nightcap" size={56} wobble />
          <T size={12} bold color="#C8D7EA">
            TIME SET ASIDE
          </T>
          <T size={20} display color={P.paper}>
            {data.protectedLabel}
          </T>
          <T color="#D5DDE8">
            Until{" "}
            {new Date(data.protectedUntil!).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            . Keep the phone down; Hats will be here later.
          </T>
          <T size={12} color="#D5DDE8">
            {focusEnabled
              ? "Protection enabled for your selected apps."
              : "Timer only · distraction protection is not enabled."}
          </T>
          <Button
            title="End this session"
            quiet
            onPress={() =>
              mutate((d) => {
                d.protectedUntil = null;
              })
            }
          />
        </Panel>
      ) : null}
      <NowCard items={timeline.items} />
      {(data.habits ?? []).length ? (
        <View style={{ gap: 8 }}>
          <Section
            hat="crown"
            title="Your streaks"
            action="Manage"
            onPress={() => router.push("/hats")}
          />
          <StreakStrip />
        </View>
      ) : null}
      <WhoopToday />
      <Section
        hat={evening ? "nightcap" : "sunhat"}
        title={evening ? "Tonight" : "Today"}
        action="Add"
        onPress={() => router.push("/capture")}
      />
      <Timeline items={timeline.items} allDay={timeline.allDay} isToday />
      {waiting ? (
        <Pressable
          onPress={() => router.push("/hats")}
          accessibilityRole="link"
        >
          <T size={13} muted>
            {waiting} flexible {waiting === 1 ? "task is" : "tasks are"} waiting
            for room, not piled onto today. See them in My hats ›
          </T>
        </Pressable>
      ) : null}
      <Row>
        <Chip
          title="🛡 30 min with the kids"
          onPress={() => startSession("Time with the kids")}
        />
        <Chip
          title={`🛡 30 min with ${data.preferences.partner || "your partner"}`}
          onPress={() => startSession("Time together")}
        />
      </Row>
      <Panel tint="#FFF0C2">
        <Row>
          <Hat id="propeller" size={34} tilt={-8} />
          <T size={12} bold>
            {low ? "EASY WITH THE KIDS" : "SOMETHING FOR THE KIDS"}
          </T>
        </Row>
        <T size={19} display>
          {low ? "A short favorite story" : activity[1]}
        </T>
        <T muted size={14}>
          {low
            ? "Let them choose a familiar book. That’s plenty."
            : activity[2]}
        </T>
        <Row>
          <Button
            title="We’re doing this"
            small
            onPress={() => {
              mutate((d) => {
                d.activities[today] = activity[0];
                d.finishedActivities.push(activity[0]);
              });
              celebrate({ hat: "propeller" });
            }}
          />
          <Button
            title="Another idea"
            quiet
            small
            onPress={() =>
              mutate((d) => {
                rotateActivity(d, today);
              })
            }
          />
        </Row>
      </Panel>
      {dateDue ? (
        <Panel tint="#FCE1D8">
          <Row>
            <Hat id="fedora" size={34} tilt={-8} />
            <T size={12} bold>
              THE TWO OF YOU
            </T>
          </Row>
          <T size={19} display>
            {lastDate
              ? `${daysSince} days since your last date.`
              : "Time to plan a date."}
          </T>
          <T muted size={14}>
            A new restaurant or a movie · ${data.preferences.dateBudget} for the
            date, childcare and travel separate.
          </T>
          <Button
            title="Plan it now"
            small
            hat="fedora"
            onPress={() => router.push("/hat/husband")}
          />
        </Panel>
      ) : null}
      {data.groceries.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/hat/home")}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderRadius: 18,
            backgroundColor: P.paper,
            ...sticker(pressed ? 2 : 4),
          })}
        >
          <Hat id="chef" size={30} />
          <T bold style={{ flex: 1 }}>
            {data.groceries.length} on the grocery list
          </T>
          <T muted>›</T>
        </Pressable>
      ) : null}
      {today.slice(5) === "10-31" ? (
        <Panel tint="#EDE0FA">
          <Hat id="wizard" size={52} wobble />
          <T bold>Make room for Halloween</T>
          <T muted>
            Costumes, weather, and the time you’ll need to get ready. Nothing
            has been assumed or booked.
          </T>
        </Panel>
      ) : null}
      {[0, 6].includes(weekday(today)) ? (
        <Button
          title="Explore family outings nearby"
          quiet
          hat="safari"
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/${encodeURIComponent(`family activities near ${data.preferences.city || "me"}`)}`,
            )
          }
        />
      ) : null}
      {(data.moments ?? []).length ? (
        <Panel>
          <Row>
            <Hat id="crown" size={30} tilt={-8} />
            <T size={12} bold>
              MOMENTS YOU MADE ROOM FOR
            </T>
          </Row>
          {(data.moments ?? [])
            .slice(-3)
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
    </Page>
  );
}
