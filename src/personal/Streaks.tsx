import { View } from "react-native";
import { HATS, id, type PersonalHat } from "./model";
import { required, useEditor } from "./Editor";
import { usePersonal } from "./Store";
import { streakFor } from "./streaks";
import { Button, Panel, Row, Section, T } from "./ui";

export function Streaks({ hat }: { hat?: PersonalHat }) {
  const { data, mutate, today, say } = usePersonal();
  const editor = useEditor();
  const habits = (data.habits ?? []).filter((h) => !hat || h.hat === hat);
  const add = () =>
    editor.open({
      title: "A streak that matters to you",
      detail:
        "Track an action you control. Daily streaks count consecutive days; weekly streaks count consecutive weeks when you meet your target on distinct days.",
      fields: [
        {
          key: "title",
          label: "What do you want to keep doing?",
          placeholder: "Phone-free family time",
        },
        {
          key: "frequency",
          label: "Your rhythm",
          value: "daily",
          options: ["daily", "weekly"],
        },
        {
          key: "target",
          label: "For weekly habits: days per week",
          value: "3",
          numeric: true,
        },
      ],
      onSave: (v) => {
        if (!["daily", "weekly"].includes(v.frequency))
          throw new Error("Choose daily or weekly.");
        const target = v.frequency === "daily" ? 1 : Number(v.target);
        if (!Number.isInteger(target) || target < 1 || target > 7)
          throw new Error("Choose 1–7 days per week.");
        const title = required(v.title, "a meaningful action");
        mutate((d) => {
          d.habits ??= [];
          d.habits.push({
            id: id(),
            title,
            hat: hat ?? "myself",
            frequency: v.frequency as "daily" | "weekly",
            target,
            checkins: [],
          });
        });
      },
    });
  return (
    <View style={{ gap: 14 }}>
      <Section
        hat="crown"
        title="Streaks worth keeping"
        action="Add a streak"
        onPress={add}
      />
      {!habits.length ? (
        <Panel>
          <T bold>Make consistency satisfying.</T>
          <T muted>
            Choose a daily action or a weekly rhythm, like guitar three days a
            week. Track your own follow-through, not someone else’s feelings.
          </T>
          <Button title="Choose my first streak" quiet onPress={add} />
        </Panel>
      ) : (
        habits.map((h) => {
          const s = streakFor(h, today);
          return (
            <Panel key={h.id}>
              <T size={12} bold>
                {HATS[h.hat].name.toUpperCase()}
              </T>
              <T size={18} bold>
                {h.title}
              </T>
              <Row>
                <T display size={34}>
                  {s.current}
                </T>
                <T muted>
                  {s.unit}
                  {s.current === 1 ? "" : "s"} running · best {s.best}
                </T>
              </Row>
              <T muted>
                {h.frequency === "weekly"
                  ? `${s.progress} of ${s.target} days this week`
                  : s.done
                    ? "Today is checked in."
                    : "Today is still open. Yesterday’s streak stays until the day ends."}
              </T>
              <Row>
                <Button
                  title={s.done ? "Undo today’s check-in" : "I did this today"}
                  small
                  quiet={s.done}
                  onPress={() => {
                    mutate((d) => {
                      const habit = d.habits?.find((x) => x.id === h.id);
                      if (!habit) return;
                      habit.checkins = s.done
                        ? habit.checkins.filter((x) => x !== today)
                        : [...habit.checkins, today];
                    });
                    say(
                      s.done
                        ? "Today’s check-in removed."
                        : "A little consistency, recorded.",
                    );
                  }}
                />
                <Button
                  title="Stop tracking"
                  small
                  quiet
                  onPress={() =>
                    mutate((d) => {
                      d.habits = d.habits?.filter((x) => x.id !== h.id);
                    })
                  }
                />
              </Row>
              <T size={12} muted>
                A missed day is a fresh start. Your best streak and past
                check-ins remain.
              </T>
            </Panel>
          );
        })
      )}
      {editor.node}
    </View>
  );
}
