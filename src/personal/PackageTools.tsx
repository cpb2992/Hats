import { router } from "expo-router";
import { fmtTime } from "../engine/dates";
import { useEditor } from "./Editor";
import { addPackageBlock, addPackageChecklist, detachPackage, packageFor, removePackageBlock } from "./hatPackages";
import type { PersonalHat } from "./model";
import { usePersonal } from "./Store";
import { Button, Panel, Row, T } from "./ui";

export function PackageTools({ hat }: { hat: PersonalHat }) {
  const { data, mutate, today, say } = usePersonal();
  const editor = useEditor();
  const pack = packageFor(data, hat);
  const browse = () => router.push({ pathname: "/hat-packages", params: { hat } });
  if (!pack) return <Button title="Add a job package" quiet onPress={browse} />;
  const upcoming = data.events.filter((e) => e.hat === hat && e.packageGroup && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .filter((e, i, list) => list.findIndex((x) => x.packageGroup === e.packageGroup) === i).slice(0, 5);
  return <Panel tint="#E3E8F6">
    <T size={12} bold>{pack.name.toUpperCase()} PACKAGE</T>
    <T display size={22}>Tools for this hat.</T>
    <T muted size={13}>{pack.subtitle}</T>
    {pack.shortcut === "school" ? <>
      <T size={13}>Prep Mode appears on Today during saved Teacher prep periods. Class schedules belong to your Teacher hat.</T>
      <Button title="Class schedule & Prep Mode setup" small onPress={() => router.push("/settings")} />
    </> : pack.shortcut === "meals" ? <Button title="Open recipes, meals & groceries" small hat="chef" onPress={() => router.push("/meals")} /> : null}
    <Button title={`Plan a ${pack.block.toLowerCase()}`} small onPress={() => editor.open({
      title: pack.block,
      detail: "This reserves time on Today and Week. For overnight or 24-hour shifts, set the end date to the following day. No calendar invitation is sent.",
      fields: [
        { key: "title", label: "Block title", value: pack.block },
        { key: "date", label: "Start date · YYYY-MM-DD", value: today },
        { key: "start", label: "Start time · 24-hour", value: "09:00" },
        { key: "endDate", label: "End date · YYYY-MM-DD", value: today },
        { key: "end", label: "End time · 24-hour", value: "17:00" },
        { key: "location", label: "Location or job label · optional" },
      ],
      onSave: (v) => {
        // Validate before mutating so failed forms do not replace the Undo snapshot.
        const trial = JSON.parse(JSON.stringify(data));
        addPackageBlock(trial, hat, v as Parameters<typeof addPackageBlock>[2]);
        mutate((d) => { addPackageBlock(d, hat, v as Parameters<typeof addPackageBlock>[2]); });
        say("Time reserved on your plan.");
      },
    })} />
    <T bold size={15}>Start with a checklist</T>
    <T muted size={13}>Change the steps, date, and estimate before adding. Each becomes a real task you can edit or complete.</T>
    {pack.checklists.map((list, index) => <Button key={list.title} title={list.title} quiet small onPress={() => editor.open({
      title: "Make this checklist yours",
      fields: [
        { key: "title", label: "Checklist title", value: list.title },
        { key: "steps", label: "Steps · one per line", value: list.steps.join("\n"), multiline: true },
        { key: "minutes", label: "Time estimate · minutes", value: String(list.minutes), numeric: true },
        { key: "date", label: "Task date · YYYY-MM-DD", value: today },
      ],
      saveTitle: "Add checklist",
      onSave: (v) => {
        const input = { title: v.title, steps: v.steps, minutes: v.minutes, date: v.date, template: index };
        const trial = JSON.parse(JSON.stringify(data));
        addPackageChecklist(trial, hat, input);
        let taskId = "";
        mutate((d) => { taskId = addPackageChecklist(d, hat, input); });
        router.push({ pathname: "/task/[id]", params: { id: taskId } });
        say("Your checklist is ready.");
      },
    })} />)}
    {upcoming.length ? <T bold size={15}>Upcoming blocks</T> : null}
    {upcoming.map((e) => {
      const parts = data.events.filter((x) => x.packageGroup === e.packageGroup).sort((a, b) => a.date.localeCompare(b.date));
      const first = parts[0], last = parts[parts.length - 1];
      return <Panel key={e.id}>
        <T bold>{e.title}</T>
        <T size={13} muted>{first.date} · {fmtTime(first.start, true)} → {last.date !== first.date ? `${last.date} · ` : ""}{fmtTime(last.end, true)}</T>
        {e.location ? <T size={13}>{e.location}</T> : null}
        <Button title={`Remove ${e.title}`} small quiet onPress={() => { mutate((d) => removePackageBlock(d, e)); say("Block removed from your plan."); }} />
      </Panel>;
    })}
    <Row>
      <Button title="Change package" quiet small onPress={browse} />
      <Button title="Remove package tools" quiet small onPress={() => { mutate((d) => detachPackage(d, hat)); say("Package removed. Your hat, tasks, notes, and blocks are kept."); }} />
    </Row>
    {editor.node}
  </Panel>;
}
