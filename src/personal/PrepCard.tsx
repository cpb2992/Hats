import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { fmtTime, timeOf, todayISO, nowMinutes } from "../engine/dates";
import { finishStep, nextStep } from "./engine";
import { Hat } from "./Hat";
import { PREP_BUFFER, prepWindow } from "./prep";
import { usePersonal } from "./Store";
import { Button, P, Panel, Row, T } from "./ui";

/** Runs off the real minute clock; no separate setup or additional notifications. */
export function PrepCard() {
  const { data, today, nowMin, mutate, say, celebrate } = usePersonal();
  const [choice, setChoice] = useState({ key: "", id: "" });
  const window = prepWindow(data, today, nowMin);
  if (!window) return null;
  const task = window.candidates.find((t) => choice.key === window.key && t.id === choice.id) ?? window.candidates[0];
  const wrapUp = window.usableMinutes < 5;
  const add = () => router.push({ pathname: "/capture", params: { hat: "work", kind: "task" } });
  return <View testID="prep-mode"><Panel tint={P.soft}>
    <Row>
      <Hat id="wizard" size={38} />
      <View style={{ flex: 1 }}>
        <T bold size={12}>PREP MODE · {window.label}</T>
        <T display size={22}>{wrapUp ? "Time to wrap up." : `${window.usableMinutes} usable minutes.`}</T>
      </View>
    </Row>
    <T muted size={13}>{window.next ? `Next: ${window.next.title} · ${fmtTime(window.next.time, true)}. ` : `Prep ends ${fmtTime(timeOf(window.endsAt), true)}. `}{PREP_BUFFER} minutes kept clear to wrap up.</T>
    {wrapUp ? <T>Save where you got to and get ready for what’s next.</T> : task ? <>
      <T size={18} bold>{task.title}</T>
      {task.steps.length ? <T>Next: {nextStep(task)}</T> : null}
      <T size={13} muted>{task.minutes} min estimate · {task.essential ? "Essential work first" : task.date < today ? "An overdue task that fits" : window.lowEnergy ? "A smaller fit for a lighter day" : "Fits before your next commitment"}</T>
      <Row>
        <Button title={task.steps.length ? "Step done" : "Done"} small onPress={() => {
          // Recheck on tap: a class or meeting may have begun since the last render.
          let completed = false;
          mutate((d) => {
            const current = prepWindow(d, todayISO(), nowMinutes());
            const candidate = current?.candidates.find((t) => t.id === task.id);
            if (candidate) { finishStep(candidate); completed = true; }
          });
          if (completed) { say("One less thing to take home."); celebrate({ hat: "mortarboard" }); }
          else say("That prep window changed. Check your current plan.");
        }} />
        {window.candidates.length > 1 ? <Button title="Another fit" quiet small onPress={() => {
          const i = window.candidates.findIndex((t) => t.id === task.id);
          setChoice({ key: window.key, id: window.candidates[(i + 1) % window.candidates.length].id });
        }} /> : null}
        <Button title="Edit task" quiet small onPress={() => router.push({ pathname: "/task/[id]", params: { id: task.id } })} />
      </Row>
    </> : <>
      <T bold>No work task fits this opening.</T>
      <T muted>A breather is useful too. Add a small task if there’s something you want to get off your plate.</T>
      <Button title="Add a work task" small quiet onPress={add} />
    </>}
  </Panel></View>;
}
