import { useState } from "react";
import { Share } from "react-native";
import { usePersonal } from "../personal/Store";
import { Button, Check, Field, Header, Page, Panel, T } from "../personal/ui";
import { addDays } from "../engine/dates";
export default function Feedback() {
  const { data, today, mutate, say } = usePersonal();
  const [helped, setHelped] = useState(true);
  const [missing, setMissing] = useState("");
  const use = data.productUse;
  const days = use?.days.filter(d => d >= addDays(today, -6)).length ?? 0;
  return <Page tabs={false}>
    <Header title="Is Hats helping?" subtitle="A useful day matters more than a streak." hat="cap" back />
    <Panel>
      <T bold>Your use of Hats</T>
      <T>{days} days opened in the last 7 days</T>
      <T>{use?.dayChanges ?? 0} day changes · {use?.corrections ?? 0} corrections · {use?.sharedAccepted ?? 0} responsibilities accepted</T>
      <T size={13} muted>These are counts in your Hats data, not a score. They are never sent to an analytics service. If account sync is on, they travel with your private backup.</T>
    </Panel>
    <Check title="Hats saved me effort today" done={helped} onPress={() => setHelped(!helped)} />
    <Field label="What did you still have to remember or organize outside Hats today?" placeholder="What was missing, confusing, or still on your mind?" value={missing} onChangeText={setMissing} multiline />
    <Button title="Save feedback privately" onPress={() => {
      if (!missing.trim() || missing.length > 2000) { say("Add a short note, up to 2,000 characters."); return; }
      mutate(d => { d.productFeedback = [...(d.productFeedback ?? []), { date: today, helped, missing: missing.trim() }].slice(-30); });
      setMissing(""); say("Feedback saved in your private Hats data. Nothing sent.");
    }} />
    {(data.productFeedback ?? []).slice().reverse().map((entry, i) => <Panel key={`${entry.date}-${i}`}><T bold>{entry.date} · {entry.helped ? "Helped" : "Needs work"}</T><T>{entry.missing}</T></Panel>)}
    <Button title="Share my feedback summary" quiet onPress={() => {
      const entries = data.productFeedback ?? [];
      Share.share({ message: `Hats feedback — shared by choice\nDays opened in last 7: ${days}\nDay changes: ${use?.dayChanges ?? 0}\nCorrections: ${use?.corrections ?? 0}\nAccepted responsibilities: ${use?.sharedAccepted ?? 0}\n\n${entries.map(e => `${e.date} · ${e.helped ? "Helped" : "Needs work"}\n${e.missing}`).join("\n\n")}` }).catch(() => say("Could not open sharing."));
    }} />
    {data.productFeedback?.length ? <Button title="Clear saved feedback" quiet onPress={() => { mutate(d => { delete d.productFeedback; }); say("Saved feedback cleared. Undo is available."); }} /> : null}
  </Page>;
}
