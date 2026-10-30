import { useState } from "react";
import { View } from "react-native";
import { usePersonal } from "./Store";
import { Button, Chip, Field, Panel, Row, T, P } from "./ui";
import { newWorkShift, shiftsFromWeek, workWeek, WORK_DAYS, type WorkShift } from "./workSchedule";

export function WorkScheduleFields({ shifts, onChange }: { shifts: WorkShift[]; onChange: (shifts: WorkShift[]) => void }) {
  const patch = (i: number, fields: Partial<WorkShift>) => onChange(shifts.map((s, n) => n === i ? { ...s, ...fields } : s));
  return <>
    <T muted>Choose days for each set of hours. Add another shift for different days, split shifts, or another job. An end before the start means overnight.</T>
    {shifts.map((shift, i) => <Panel key={i}>
      <T bold>Shift {i + 1}</T>
      <Field label="Job or commitment" value={shift.title} maxLength={60} onChangeText={(title) => patch(i, { title })} placeholder="Work, classes, second job…" />
      <Row>{WORK_DAYS.map((day, n) => <Chip key={day} title={day} selected={shift.days.includes(n)} onPress={() => patch(i, { days: shift.days.includes(n) ? shift.days.filter((d) => d !== n) : [...shift.days, n] })} />)}</Row>
      <Row>
        <View style={{ flex: 1, minWidth: 130 }}><Field label="Starts" value={shift.start} onChangeText={(start) => patch(i, { start })} placeholder="9 AM" /></View>
        <View style={{ flex: 1, minWidth: 130 }}><Field label="Ends" value={shift.end} onChangeText={(end) => patch(i, { end })} placeholder="5 PM" /></View>
      </Row>
      {shift.end === "24:00" ? <T muted size={13}>24:00 means midnight at the end of this day.</T> : null}
      <Button title={`Remove shift ${i + 1}`} quiet small onPress={() => onChange(shifts.filter((_, n) => n !== i))} />
    </Panel>)}
    <Button title="Add a shift or different hours" quiet onPress={() => onChange([...shifts, newWorkShift()])} />
    {!shifts.length ? <T muted>No fixed hours. Hats will use your calendar commitments; you can add a weekly schedule later.</T> : null}
  </>;
}

/** Also available after onboarding, so changing jobs never requires resetting the app. */
export function WorkScheduleSettings() {
  const { data, mutate, say } = usePersonal();
  const [shifts, setShifts] = useState(() => shiftsFromWeek(data.preferences.school?.week ?? {}));
  const [problem, setProblem] = useState("");
  return <>
    <WorkScheduleFields shifts={shifts} onChange={(next) => { setShifts(next); setProblem(""); }} />
    {problem ? <T color={P.orange}>{problem}</T> : null}
    <Button title="Save work schedule" onPress={() => {
      try {
        const week = workWeek(shifts);
        mutate((d) => {
          d.preferences.school = { on: shifts.length > 0, week };
          d.preferences.unavailableDays = Object.keys(week).map(Number).sort();
        });
        setProblem("");
        say("Work schedule saved.");
      } catch (error) { setProblem(error instanceof Error ? error.message : "Check your hours."); }
    }} />
  </>;
}
