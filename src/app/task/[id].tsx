import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { usePersonal } from "../../personal/Store";
import { allHats, type PersonalHat, type RepeatRule, hatDef } from "../../personal/model";
import { repeatLabel, settle, taskRule } from "../../personal/repeat";
import {
  Button,
  Check,
  Chip,
  Empty,
  Field,
  Header,
  Page,
  Row,
  T,
} from "../../personal/ui";

export default function Task() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, mutate, say, today } = usePersonal();
  const task = data.tasks.find((t) => t.id === id);
  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(task?.date ?? today);
  const [time, setTime] = useState(task?.time ?? "");
  const [minutes, setMinutes] = useState(String(task?.minutes ?? 15));
  const [hat, setHat] = useState<PersonalHat>(task?.hat ?? "home");
  const [fixed, setFixed] = useState(task?.fixed ?? false);
  const [essential, setEssential] = useState(task?.essential ?? false);
  // The repeat as a rule: kept as said ("Mondays and Wednesdays"), or one of the simple choices.
  const [rule, setRule] = useState<RepeatRule | null>(task ? taskRule(task) : null);
  const [note, setNote] = useState(task?.note ?? "");
  if (!task)
    return (
      <Page tabs={false}>
        <Header title="That task isn’t here." back />
        <Empty
          title="It may have been removed"
          action="Back to today"
          onPress={() => router.replace("/")}
        />
      </Page>
    );
  const save = () => {
    if (
      !title.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(new Date(`${date}T12:00:00`).getTime())
    ) {
      say("Add a title and a valid date in YYYY-MM-DD format.");
      return;
    }
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      say("Use a time like 18:30, or leave it empty.");
      return;
    }
    const length = Number(minutes);
    if (!Number.isFinite(length) || length < 1 || length > 240) {
      say("Choose a length between 1 and 240 minutes.");
      return;
    }
    if (fixed && !time) {
      say("A fixed commitment needs a time.");
      return;
    }
    mutate((d) => {
      const t = d.tasks.find((t) => t.id === id);
      if (t)
        Object.assign(t, {
          title: title.trim(),
          date,
          time: time || null,
          minutes: length,
          hat,
          fixed,
          essential,
          repeat: "none" as const,
          rule: rule ? settle(rule, date) : undefined,
          note,
        });
    });
    say("Task updated.");
    router.back();
  };
  return (
    <Page tabs={false}>
      <Header title="Make it fit your life." back hat={hatDef(hat).art} />
      <Field label="Task" value={title} onChangeText={setTitle} />
      <Row>
        {allHats(data.customHats).map((h) => (
          <Chip
            key={h}
            title={hatDef(h).name}
            selected={hat === h}
            onPress={() => setHat(h)}
          />
        ))}
      </Row>
      <Field label="Date · YYYY-MM-DD" value={date} onChangeText={setDate} />
      <Field
        label="Time · HH:MM, or leave flexible"
        value={time}
        onChangeText={setTime}
      />
      <Field
        label="Minutes for the next step"
        value={minutes}
        onChangeText={setMinutes}
        keyboardType="number-pad"
      />
      <Check
        title="Fixed commitment · never move automatically"
        done={fixed}
        onPress={() => setFixed(!fixed)}
      />
      <Check
        title="Essential care · keep on low-energy days"
        done={essential}
        onPress={() => setEssential(!essential)}
      />
      <T bold>Repeats</T>
      <Row>
        {(
          [
            ["Doesn’t repeat", null],
            ["Every day", { freq: "day", every: 1 }],
            ["Weekdays", { freq: "week", every: 1, days: [1, 2, 3, 4, 5] }],
            ["Every week", { freq: "week", every: 1 }],
            ["Every other week", { freq: "week", every: 2 }],
            ["Every month", { freq: "month", every: 1 }],
          ] as [string, RepeatRule | null][]
        ).map(([label, r]) => {
          const same = (x: RepeatRule | null, y: RepeatRule | null) =>
            JSON.stringify(x && settle(x, date)) === JSON.stringify(y && settle(y, date));
          return (
            <Chip key={label} title={label} selected={same(rule, r)} onPress={() => setRule(r)} />
          );
        })}
      </Row>
      {rule ? (
        <T size={13} muted>
          {repeatLabel(settle(rule, date), date)}. The next one shows up when this one’s done.
        </T>
      ) : null}
      <Field
        label="Useful details"
        value={note}
        onChangeText={setNote}
        multiline
      />
      {task.steps.map((step, i) => (
        <Check
          strike
          key={i}
          title={step.title}
          done={step.done}
          onPress={() =>
            mutate((d) => {
              const t = d.tasks.find((t) => t.id === id);
              if (!t) return;
              t.steps[i].done = !t.steps[i].done;
              t.doneAt = t.steps.every((s) => s.done)
                ? new Date().toISOString()
                : null;
            })
          }
        />
      ))}
      <Button title="Save changes" onPress={save} />
      {task.doneAt ? (
        <Button
          title="Reopen task"
          quiet
          onPress={() => {
            mutate((d) => {
              const t = d.tasks.find((t) => t.id === id);
              if (t) {
                t.doneAt = null;
                if (t.steps.length) t.steps[t.steps.length - 1].done = false;
              }
            });
            say("Task reopened.");
          }}
        />
      ) : null}
      <Button
        title="Delete task"
        quiet
        onPress={() =>
          Alert.alert(
            "Delete this task?",
            "Undo is available after deleting.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  mutate((d) => {
                    d.tasks = d.tasks.filter((t) => t.id !== id);
                  });
                  router.back();
                },
              },
            ],
          )
        }
      />
    </Page>
  );
}
