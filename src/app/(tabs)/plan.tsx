import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import {
  addDays,
  dayShort,
  fmtLong,
  fmtTime,
  fromISO,
} from "../../engine/dates";
import { planDay } from "../../personal/engine";
import { id } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Empty,
  Field,
  Header,
  Page,
  Panel,
  Row,
  Section,
  T,
  TaskCard,
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
  return (
    <Page>
      <Header
        title="Make room for life."
        subtitle="Google events stay read-only. Your flexible plans live here."
        hat="safari"
      />
      <Row>
        {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => (
          <Chip
            key={d}
            title={`${dayShort(d)} ${fromISO(d).getDate()}`}
            selected={date === d}
            onPress={() => setDate(d)}
          />
        ))}
      </Row>
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
      {events.map((e) => (
        <Panel key={e.id}>
          <T bold size={19}>
            {e.title}
          </T>
          <T muted>
            {e.allDay
              ? "All day"
              : `${fmtTime(e.start, true)}–${fmtTime(e.end, true)}`}{" "}
            ·{" "}
            {e.source === "google"
              ? "Google · read-only"
              : "Personal commitment"}
          </T>
          {e.location ? <T muted>{e.location}</T> : null}
          {e.source === "hats" ? (
            <Button
              title="Remove event"
              quiet
              onPress={() =>
                mutate((d) => {
                  d.events = d.events.filter((x) => x.id !== e.id);
                })
              }
            />
          ) : null}
        </Panel>
      ))}
      {plans
        .filter((x) => x.time)
        .map((x) => (
          <TaskCard key={x.task.id} task={x.task} plannedTime={x.time} />
        ))}
      {!events.length && !plans.some((x) => x.time) ? (
        <Empty
          title="A little breathing room"
          detail="No fixed events or scheduled next steps here yet."
          action="Capture something"
          onPress={() => router.push("/capture")}
        />
      ) : null}
      {plans.some((x) => !x.time) ? (
        <Panel>
          <T bold>Waiting for room</T>
          {plans
            .filter((x) => !x.time)
            .map((x) => (
              <T muted key={x.task.id}>
                {x.task.title} · {x.reason}
              </T>
            ))}
        </Panel>
      ) : null}
      <Button
        title="Calendar connections and school closures"
        quiet
        onPress={() => router.push("/settings")}
      />
    </Page>
  );
}
