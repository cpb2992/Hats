import { View } from "react-native";
import { addDays } from "../engine/dates";
import { logView, setSkipped, undoEntry } from "../personal/auto";
import { Hat } from "../personal/Hat";
import { HATS } from "../personal/model";
import { usePersonal } from "../personal/Store";
import { Button, Empty, Header, P, Page, Panel, T } from "../personal/ui";

export default function Log() {
  const { data, today, nowMin, mutate, say } = usePersonal();
  const entries = logView(data, today, nowMin);
  const done = entries.filter((e) => !e.undone);
  const dayLabel = (date: string) =>
    date === today
      ? "TODAY"
      : date === addDays(today, -1)
        ? "YESTERDAY"
        : date.slice(5).replace("-", "/");
  return (
    <Page tabs={false}>
      <Header
        back
        title={
          done.filter((e) => e.date === today).length
            ? `Hats did ${done.filter((e) => e.date === today).length} things today`
            : "What Hats did"
        }
        subtitle="So you don’t have to. Anything can be undone."
        hat="wizard"
      />
      {!entries.length ? (
        <Empty
          hat="wizard"
          title="Nothing yet"
          detail="As Hats syncs calendars, plans dinners, and keeps routines, each change shows up here."
        />
      ) : (
        <View style={{ gap: 8 }}>
          {entries.map((e, i) => {
            const header =
              i === 0 || entries[i - 1].date !== e.date
                ? dayLabel(e.date)
                : null;
            const canUndo = !e.undone && (!!e.undo || e.keys.length > 0);
            return (
              <View key={e.id} style={{ gap: 8 }}>
                {header ? (
                  <T
                    size={11}
                    bold
                    muted
                    style={{ letterSpacing: 0.6, marginTop: 6 }}
                  >
                    {header}
                  </T>
                ) : null}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 10,
                    borderRadius: 18,
                    backgroundColor: P.paper,
                    borderWidth: 2,
                    borderColor: P.ink,
                    opacity: e.undone ? 0.55 : 1,
                  }}
                >
                  <Hat id={HATS[e.hat].art} size={32} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T
                      bold
                      size={14}
                      style={{
                        textDecorationLine: e.undone ? "line-through" : "none",
                      }}
                    >
                      {e.title}
                    </T>
                    {e.detail || e.undone ? (
                      <T size={12} muted>
                        {e.undone ? "Undone" : e.detail}
                      </T>
                    ) : null}
                  </View>
                  {canUndo ? (
                    <Button
                      title="Undo"
                      small
                      quiet
                      onPress={() => {
                        mutate((d) => {
                          if (e.keys.length)
                            for (const k of e.keys)
                              setSkipped(d, e.date, k, true);
                          else undoEntry(d, e.id);
                        });
                        say(e.keys.length ? "Marked as skipped." : "Undone.");
                      }}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
      <Panel tint="#E3F1E6">
        <T bold>Hats never sends, books, or pays for anything.</T>
        <T size={13} muted>
          It reads your calendars and plans. Google Calendar stays read-only.
        </T>
      </Panel>
    </Page>
  );
}
