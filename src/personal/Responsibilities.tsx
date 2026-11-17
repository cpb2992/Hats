import { useState } from "react";
import { router } from "expo-router";
import { fmtRelative } from "../engine/dates";
import { acceptResponsibility } from "./taskFeedback";
import { usePersonal } from "./Store";
import { Button, Panel, Row, T } from "./ui";

/** Shared ownership is visible to both people, separate from each person's own plan. */
export function Responsibilities() {
  const { data, today, mutate, say, familySyncStatus } = usePersonal();
  const [all, setAll] = useState(false);
  const home = data.household;
  if (!home) return null;
  const shared = data.tasks.filter(t => t.shared && (!t.doneAt || t.doneAt.startsWith(today)))
    .sort((a,b) => Number(!!a.doneAt) - Number(!!b.doneAt) || a.date.localeCompare(b.date));
  const shown = all ? shared : shared.slice(0,6);
  return <Panel>
    <T bold size={18}>Who’s handling what?</T>
    <T size={12} muted>{familySyncStatus}</T>
    {!shown.length ? <T muted>Share a task and choose an owner in its details. The owner can accept it here.</T> : null}
    {shown.map(task => {
      const name = home.members.find(m => m.id === task.assignee)?.name;
      const owner = task.assignee === home.me ? "You" : name ?? "No owner yet";
      const accepted = !!task.assignee && task.acceptedBy === task.assignee;
      return <Panel key={task.id}>
        <T bold>{task.title}</T>
        <T size={13}>{owner} · {task.doneAt ? "Completed" : accepted ? "Accepted" : task.assignee ? "Awaiting acceptance" : "Unclaimed"} · {fmtRelative(task.date,today)}</T>
        <Row>
          {!task.doneAt && !accepted && (!task.assignee || task.assignee === home.me) ? <Button title="I’ll handle this" small onPress={() => {
            mutate(d => { const t = d.tasks.find(t => t.id === task.id); if (!t || !d.household || (t.assignee && t.assignee !== d.household.me)) return; t.assignee = d.household.me; acceptResponsibility(d,t.id,today); });
            say("Responsibility accepted. Family sync status shows when the change is shared.");
          }} /> : null}
          <Button title="Open responsibility" small quiet onPress={() => router.push({pathname:"/task/[id]",params:{id:task.id}})} />
        </Row>
      </Panel>;
    })}
    {shared.length > 6 ? <Button title={all ? "Show fewer responsibilities" : `Show all ${shared.length} responsibilities`} small quiet onPress={() => setAll(!all)} /> : null}
  </Panel>;
}
