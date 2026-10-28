import { useState } from "react";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import {
  addDays,
  dayShort,
  fmtLong,
  fmtTime,
  fromISO,
} from "../../engine/dates";
import { planDay } from "../../personal/engine";
import { dayTimeline } from "../../personal/timeline";
import { Timeline } from "../../personal/TodayParts";
import { id } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Field,
  Header,
  Page,
  Panel,
  Row,
  Section,
  T,
} from "../../personal/ui";

export default function Plan() {
  const { data, today, nowMin, mutate, say } = usePersonal();
  const [date, setDate] = useState(today);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("19:00");
  const [closure, setClosure] = useState(false);
  const plans = planDay(data, date, date === today ? nowMin : 0);
  const events = data.events.filter((e) => e.date === date);
  const timeline = dayTimeline(data, date, nowMin, date === today);
  return (
    <Page>
      <Header
        title="Make room for life."
        subtitle="Google events stay read-only. Your flexible plans live here."
        hat="safari"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {Array.from({ length: 14 }, (_, i) => addDays(today, i)).map((d) => {
          const busy = data.events.some((e) => e.date === d);
          return (
            <Chip
              key={d}
              title={`${d === today ? "Today" : dayShort(d)} ${fromISO(d).getDate()}${busy ? " •" : ""}`}
              selected={date === d}
              onPress={() => setDate(d)}
            />
          );
        })}
      </ScrollView>
      <Section
        title={fmtLong(date)}
        action={adding ? "Close" : "Add event"}
        onPress={() => setAdding(!adding)}
      />
      {adding ? (
        <Panel>
          <Field
            label="What’s happening?"
            value={title}
            onChangeText={setTitle}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <Field
                label="Start · HH:MM"
                value={start}
                onChangeText={setStart}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="End · HH:MM" value={end} onChangeText={setEnd} />
            </View>
          </Row>
          <Chip
            title="Confirmed day off / school closure"
            selected={closure}
            onPress={() => setClosure(!closure)}
          />
          <T muted>
            Only mark a closure you’ve confirmed. Daycare may follow a different
            calendar.
          </T>
          <Button
            title="Save personal event"
            onPress={() => {
              if (!title.trim()) {
                say("Add an event title.");
                return;
              }
              if (
                !closure &&
                (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
                  !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) ||
                  end <= start)
              ) {
                say("Use valid times, with the end after the start.");
                return;
              }
              mutate((d) => {
                d.events.push({
                  id: id(),
                  title: title.trim(),
                  date,
                  start,
                  end,
                  allDay: closure,
                  closure,
                  source: "hats",
                });
              });
              setTitle("");
              setAdding(false);
            }}
          />
        </Panel>
      ) : null}
      <Timeline
        items={timeline.items}
        allDay={timeline.allDay}
        isToday={date === today}
      />
      {plans.some((x) => !x.time) ? (
        <Panel>
          <T bold>Waiting for room</T>
          <T size={13} muted>
            Not piled onto this day. Hats places them at your next real opening.
          </T>
          {plans
            .filter((x) => !x.time)
            .map((x) => (
              <T key={x.task.id}>· {x.task.title}</T>
            ))}
        </Panel>
      ) : null}
      {events.filter((e) => e.source === "hats").length ? (
        <View style={{ gap: 6 }}>
          <T size={13} bold muted>
            Your events this day
          </T>
          {events
            .filter((e) => e.source === "hats")
            .map((e) => (
              <Row key={e.id}>
                <T style={{ flex: 1 }}>
                  {e.title} ·{" "}
                  {e.allDay
                    ? "all day"
                    : `${fmtTime(e.start, true)}–${fmtTime(e.end, true)}`}
                </T>
                <Button
                  title="Remove"
                  small
                  quiet
                  onPress={() =>
                    mutate((d) => {
                      d.events = d.events.filter((x) => x.id !== e.id);
                    })
                  }
                />
              </Row>
            ))}
        </View>
      ) : null}
      <Button
        title="Calendar connections and school closures"
        quiet
        onPress={() => router.push("/settings")}
      />
    </Page>
  );
}
