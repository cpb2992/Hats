import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { fmtLong, fmtTime } from "../engine/dates";
import { DAY_CHANGES, applyDayChange, previewDayChange, type DayChange } from "../personal/dayChange";
import { parseClock } from "../personal/clock";
import { validDate } from "../personal/model";
import { recordUse } from "../personal/productUse";
import { usePersonal } from "../personal/Store";
import { Button, Chip, Field, Header, Page, Panel, Row, T } from "../personal/ui";

export default function DayChangeScreen() {
  const { date: requested } = useLocalSearchParams<{ date?: string }>();
  const { data, today, nowMin, mutate, say } = usePersonal();
  const date = validDate(requested) ? requested : today;
  const [choice, setChoice] = useState<DayChange>("essentials");
  const [after, setAfter] = useState("6:00 PM");
  const time = parseClock(after);
  const preview = choice !== "late" || time ? previewDayChange(data, date, choice, time ?? undefined, date === today ? nowMin : 0) : null;
  const description = DAY_CHANGES.find(c => c.id === choice)!;
  return <Page tabs={false}>
    <Header title="My day changed." subtitle={fmtLong(date)} hat="cap" back />
    <T muted>Choose what changed. Review the result before applying it.</T>
    <Row>{DAY_CHANGES.map(c => <Chip key={c.id} title={c.title} selected={choice === c.id} onPress={() => setChoice(c.id)} />)}</Row>
    <T>{description.detail}</T>
    {choice === "late" ? <Field label="Available after" value={after} onChangeText={setAfter} placeholder="6:00 PM" /> : null}
    <Panel>
      <T bold>Preview for this date</T>
      {!preview ? <T>Enter a time like 6:00 PM to see the preview.</T> : <>
        <T>{preview.kept} saved commitments stay in place.</T>
        {preview.schoolRemoved > 0 ? <T>{preview.schoolRemoved} work blocks removed for this date.</T> : null}
        {preview.changes.length ? preview.changes.map(c => <T key={c.id} size={14}>{c.title}: {c.before ? fmtTime(c.before, true) : "waiting"} → {c.after ? fmtTime(c.after, true) : "waits for another opening"}</T>) : <T muted>No flexible task times change.</T>}
        <T size={13} muted>Fixed plans are never moved. If a fixed plan no longer works, open it from the schedule and edit it yourself. You can Undo after applying.</T>
      </>}
    </Panel>
    <Button title="Apply day change" disabled={!preview} onPress={() => {
      if (!preview) return;
      mutate(d => { applyDayChange(d, date, choice, time ?? undefined); recordUse(d, today, "dayChanges"); });
      say(`${description.title} applied to ${fmtLong(date)}. Undo is available.`);
      router.back();
    }} />
    <Button title="Cancel" quiet onPress={() => router.back()} />
  </Page>;
}
