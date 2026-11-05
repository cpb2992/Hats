import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, View } from "react-native";
import { fmtTime } from "../engine/dates";
import { editDatePlan, editHatsEvent } from "../personal/editPlan";
import { usePersonal } from "../personal/Store";
import { Button, Chip, Field, Header, Page, Panel, Row, T } from "../personal/ui";

type PlanKind = "date" | "event";

export default function PlanEditScreen() {
  const params = useLocalSearchParams<{ kind: PlanKind; id: string }>();
  const kind: PlanKind = params.kind === "date" ? "date" : "event";
  const id = typeof params.id === "string" ? params.id : "";
  // Reset form fields when navigating between different plans.
  return <PlanEditor key={kind + ":" + id} kind={kind} id={id} />;
}

/** A single, predictable editor for the Today, Week and Month schedule paths. */
function PlanEditor({ kind, id }: { kind: PlanKind; id: string }) {
  const a = usePersonal();
  const datePlan = kind === "date" ? a.data.dates.find((p) => p.id === id) : undefined;
  const event = kind === "event" ? a.data.events.find((e) => e.id === id) : undefined;
  const plan = datePlan ?? event;
  const [title, setTitle] = useState(plan?.title ?? "");
  const [date, setDate] = useState(plan?.date ?? a.today);
  const [start, setStart] = useState(datePlan?.time ?? event?.start ?? "19:00");
  const [end, setEnd] = useState(event?.end ?? "20:00");
  const [note, setNote] = useState(datePlan?.note ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [error, setError] = useState("");
  const google = !!event && event.source === "google";
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (!plan || google || saving) return;
    setError("");
    try {
      // Validate a copy first. An invalid time must not create an Undo step.
      if (kind === "date" && datePlan) {
        const copy = JSON.parse(JSON.stringify(datePlan)) as typeof datePlan;
        editDatePlan(copy, { title, date, time: start, note });
        a.mutate((data) => {
          const current = data.dates.find((p) => p.id === id);
          if (current) editDatePlan(current, { title, date, time: start, note });
        });
      } else if (event) {
        const copy = { ...event };
        editHatsEvent(copy, { title, date, start, end, location, allDay });
        a.mutate((data) => {
          const current = data.events.find((e) => e.id === id);
          if (current) editHatsEvent(current, { title, date, start, end, location, allDay });
        });
      }
      setSaving(true);
      a.say("Plan updated. Your Hats schedule has the new time.");
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes.");
    }
  };

  return (
    <Page tabs={false}>
      <Header title="Edit your plan." subtitle="Make a change here. See it everywhere in Hats." hat="safari" />
      {!plan ? (
        <Panel>
          <T bold>This plan is no longer here.</T>
          <Button title="Back to my schedule" quiet onPress={() => router.back()} />
        </Panel>
      ) : google ? (
        <Panel>
          <T bold size={17}>{event.title}</T>
          <T muted>This event came from Google Calendar. Hats only reads Google events, so changing it here would be overwritten at the next sync. Edit it in Google Calendar instead.</T>
          <Button title="Open Google Calendar" onPress={() => Linking.openURL("https://calendar.google.com/calendar/u/0/r")} />
          <Button title="Back" quiet onPress={() => router.back()} />
        </Panel>
      ) : (
        <Panel>
          <T bold size={18}>{kind === "date" ? "Date night" : "Calendar event"}</T>
          <Field label={kind === "date" ? "Date idea" : "Event title"} value={title} onChangeText={setTitle} />
          <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-11-05" />
          {event ? (
            <View style={{ gap: 8 }}>
              <T bold size={13}>When?</T>
              <Row>
                <Chip title="Set times" selected={!allDay} onPress={() => setAllDay(false)} />
                <Chip title="All day" selected={allDay} onPress={() => setAllDay(true)} />
              </Row>
            </View>
          ) : null}
          {!allDay || kind === "date" ? (
            <Field label="Start time" value={fmtTime(start, true)} onChangeText={setStart} placeholder="6:30 PM" />
          ) : null}
          {event && !allDay ? (
            <Field label="End time" value={fmtTime(end, true)} onChangeText={setEnd} placeholder="8:00 PM" />
          ) : null}
          {event ? (
            <Field label="Location (optional)" value={location} onChangeText={setLocation} />
          ) : (
            <Field label="Notes, restaurant, or plans" value={note} onChangeText={setNote} multiline />
          )}
          {event?.repeat ? (
            <T muted size={12}>This change updates the repeating series, not just one occurrence.</T>
          ) : null}
          {datePlan ? (
            <T muted size={12}>If the date or time changes, Hats will ask you to reconfirm childcare.</T>
          ) : null}
          {error ? <T color="#B33D20" bold>{error}</T> : null}
          <Row>
            <Button title={saving ? "Saving…" : "Save changes"} onPress={save} disabled={saving} />
            <Button title="Cancel" quiet onPress={() => router.back()} />
          </Row>
        </Panel>
      )}
    </Page>
  );
}
