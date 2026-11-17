import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { addDays, fmtTime } from "../engine/dates";
import { required, useEditor } from "../personal/Editor";
import { allHats, hatDef, id, isHatId, validDate, type PersonalHat } from "../personal/model";
import { emptyMemory, keepMemory, memorySuggestions, type PersonalMemory, type MemoryRule } from "../personal/memory";
import { usePersonal } from "../personal/Store";
import { Button, Check, Chip, Field, Group, Header, Page, Panel, Row, T } from "../personal/ui";

const TYPES = ["Context to remember", "Give this hat priority", "Prefer a time window", "Start with smaller tasks"];
export default function Memory() {
  const { data, mutate, today, say } = usePersonal();
  const params = useLocalSearchParams<{ hat?: string }>();
  const [hat, setHat] = useState<PersonalHat>(params.hat && isHatId(params.hat) ? params.hat : "myself");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(0);
  const editor = useEditor();
  const memory = data.memory ?? emptyMemory();
  const suggestions = memorySuggestions(data, today);
  const edit = (item?: PersonalMemory, selectedType?: number) => {
    const type = selectedType ?? (item ? item.rule?.kind === "priority" ? 1 : item.rule?.kind === "window" ? 2 : item.rule?.kind === "small" ? 3 : 0 : mode);
    editor.open({
    title: item ? "Update what Hats knows" : "Remember about me",
    detail: `${hatDef(item?.hat ?? hat).name} · ${TYPES[type]}. A new preference of the same kind replaces the previous one for this hat.`,
    fields: [
      { key: "text", label: "In your own words", value: item?.text, multiline: true, placeholder: "I find it easier to handle home tasks earlier in the evening." },
      ...(type === 2 ? [
      { key: "start", label: "For a time window: start · HH:MM", value: item?.rule?.kind === "window" ? item.rule.start : "17:00" },
      { key: "end", label: "For a time window: end · HH:MM", value: item?.rule?.kind === "window" ? item.rule.end : "19:00" },
      ] : []),
      ...(type === 3 ? [
      { key: "minutes", label: "For smaller tasks: up to this many minutes", value: item?.rule?.kind === "small" ? String(item.rule.minutes) : "15", numeric: true },
      ] : []),
      { key: "expires", label: "Use through · YYYY-MM-DD, or leave empty", value: item?.expiresOn },
    ],
    onSave: (v) => {
      const text = required(v.text, "something to remember");
      if (text.length > 2000) throw new Error("Keep each memory under 2,000 characters. Split longer notes into separate memories.");
      const expiresOn = v.expires.trim() || undefined;
      if (expiresOn && !validDate(expiresOn)) throw new Error("Use a real date such as 2026-12-01.");
      let rule: MemoryRule | undefined;
      if (type === 1) rule = { kind: "priority" };
      if (type === 2) {
        const start = v.start.trim(), end = v.end.trim();
        const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!clock.test(start) || !clock.test(end) || start >= end) throw new Error("Choose a same-day window, with its end after its start, using HH:MM.");
        rule = { kind: "window", start, end };
      }
      if (type === 3) {
        const minutes = Number(v.minutes);
        if (!Number.isInteger(minutes) || minutes < 5 || minutes > 120) throw new Error("Choose a whole number of minutes from 5 to 120.");
        rule = { kind: "small", minutes };
      }
      const at = new Date().toISOString();
      mutate((d) => keepMemory(d, { id: item?.id ?? id(), text, hat: item?.hat ?? hat,
        source: "you", createdAt: item?.createdAt ?? at, updatedAt: at,
        ...(expiresOn ? { expiresOn } : {}), ...(rule ? { rule } : {}) }));
      say("Memory saved. Your next plan uses active preferences.");
    },
  });
  };
  return <Page tabs={false}>
    <Header title="What Hats knows." subtitle="Less explaining. A day that fits you better." back hat="wizard" />
    <Panel>
      <T bold>Your words, your control.</T>
      <T muted>Keep useful context or choose a preference to shape your day.</T>
    </Panel>
    <T bold>Which part of life?</T>
    <Row>{allHats(data.customHats).map((h) => <Chip key={h} title={hatDef(h).name} selected={hat === h} onPress={() => setHat(h)} />)}</Row>
    <T bold>How should Hats use it?</T>
    <Row>{TYPES.map((label, i) => <Chip key={label} title={label} selected={mode === i} onPress={() => setMode(i)} />)}</Row>
    <Button title="Remember about me" hat="wizard" onPress={() => edit()} />
    <Field label="Find a memory" value={query} onChangeText={setQuery} placeholder="Search your words…" />
    {memory.items.filter((m) => m.hat === hat && m.text.toLowerCase().includes(query.toLowerCase())).map((m) => <Panel key={m.id}>
      <T bold>{m.text}</T>
      <T muted size={13}>{m.expiresOn && m.expiresOn < today ? "Expired · kept for reference" : m.rule ? "Used in planning" : "Context · kept for reference"} · {m.source === "pattern" ? "Pattern you confirmed" : "You told Hats"}</T>
      {m.rule ? <T size={13}>{m.rule.kind === "priority" ? "Priority among tasks due the same day" : m.rule.kind === "window" ? `Preferred window: ${fmtTime(m.rule.start, true)}–${fmtTime(m.rule.end, true)}` : `Start with tasks up to ${m.rule.minutes} minutes`}</T> : null}
      {m.expiresOn ? <T size={13} muted>Use through {m.expiresOn}</T> : null}
      <Row>
        <Button title="Edit" small quiet onPress={() => edit(m)} />
        {m.rule ? <Button title="Keep as context" small quiet onPress={() => edit(m, 0)} /> : null}
        <Button title="Forget" small quiet onPress={() => {
          mutate((d) => { if (d.memory) d.memory.items = d.memory.items.filter((x) => x.id !== m.id); });
          say("Forgotten from your current plan. Existing backups keep their copies.");
        }} />
      </Row>
      {!m.rule ? <Row>
        <Button title="Prioritize this hat" small quiet onPress={() => edit(m, 1)} />
        <Button title="Set a time window" small quiet onPress={() => edit(m, 2)} />
        <Button title="Start smaller" small quiet onPress={() => edit(m, 3)} />
      </Row> : null}
    </Panel>)}
    {!memory.items.some((m) => m.hat === hat) ? <Panel><T>Start with something that would save you explaining it again.</T><T muted>A preference, a responsibility, or something important to someone you care about.</T></Panel> : null}
    <Panel>
      <T bold>Learn from what actually gets done</T>
      <Check title="Offer timing suggestions from completed tasks" done={memory.learnFromCompletions} onPress={() => mutate((d) => {
        d.memory ??= emptyMemory(); d.memory.learnFromCompletions = !d.memory.learnFromCompletions;
      })} />
      <T size={13} muted>Looks at the last 28 days on this device. At least four completions across three days are needed. Suggestions change nothing until you confirm them. Skips and postponements never count as dislikes.</T>
      <T size={13} muted>Preferences fit around your existing availability, family routine, appointments and essential care. A preferred time is flexible; it won’t create free time where you have none.</T>
    </Panel>
    {suggestions.map((s) => <Panel key={s.key}>
      <T bold>A possible rhythm for {hatDef(s.hat).name}</T>
      <T>{s.count} completions across {s.days} days were between {fmtTime(s.start, true)} and {fmtTime(s.end, true)}. Would that be a useful preferred window?</T>
      <Row><Button title="Try for two weeks" small onPress={() => {
        const at = new Date().toISOString();
        mutate((d) => keepMemory(d, { id: id(), hat: s.hat, source: "pattern", text: `Prefer ${hatDef(s.hat).name} tasks between ${fmtTime(s.start, true)} and ${fmtTime(s.end, true)}.`,
          createdAt: at, updatedAt: at, expiresOn: addDays(today, 13), rule: { kind: "window", start: s.start, end: s.end } }));
        say("Timing preference saved for two weeks. You can change it anytime.");
      }} /><Button title="Dismiss" small quiet onPress={() => mutate((d) => { d.memory ??= emptyMemory(); d.memory.dismissed.push(s.key); })} /></Row>
    </Panel>)}
    {memory.learnFromCompletions && !suggestions.length ? <T muted>New patterns will appear here when there’s enough evidence. Your saved preferences stay in charge.</T> : null}
    <Group title="Your data and control" summary="Private memory, backups and how planning works" hat="wizard">
      <T muted>Memories stay in your personal data and backups, including your private account sync if connected. They are excluded from family sharing and aren’t sent to an AI service.</T>
      <T muted>This first version remembers text and applies the preferences you choose. It does not interpret documents, photos or every note automatically.</T>
    </Group>
    <Button title="Clear all memories and stop learning" quiet onPress={() => {
      editor.open({ title: "Clear personal memory?", detail: "This removes your current memories and preferences and turns off timing suggestions. Your tasks and notes stay. Existing backups retain their copies.", fields: [], saveTitle: "Clear memories", onSave: () => {
        mutate((d) => { d.memory = emptyMemory(); });
        say("Memories cleared and learning stopped. Undo is available; older backups keep their copies.");
      } });
    }} />
    {editor.node}
  </Page>;
}
