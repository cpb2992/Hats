import { router } from "expo-router";
import { Linking, View } from "react-native";
import { fmtLong, weekday } from "../../engine/dates";
import {
  activityFor,
  makeTask,
  mealFor,
  planDay,
  rotateActivity,
  shoppingFor,
} from "../../personal/engine";
import { HATS, type PersonalHat } from "../../personal/model";
import { useFocusEnabled } from "../../personal/focus";
import { Streaks } from "../../personal/Streaks";
import { Hat } from "../../personal/Hat";
import { WhoopToday } from "../../personal/WhoopCard";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Columns,
  Empty,
  Header,
  P,
  Page,
  Panel,
  Row,
  Section,
  T,
  TaskCard,
} from "../../personal/ui";

export default function Today() {
  const { data, mutate, today, nowMin, nowMs, error, undo, say } =
    usePersonal();
  const focusEnabled = useFocusEnabled() && data.preferences.focusConsent;
  const low = data.lowEnergyDays.includes(today);
  const plan = planDay(data, today, nowMin);
  const visible = plan.filter((x) => x.time).slice(0, 4);
  const waiting = plan.filter((x) => !x.time).length;
  const activity = activityFor(data, today);
  const meal = mealFor(data, today);
  const protectedNow =
    data.protectedUntil && new Date(data.protectedUntil).getTime() > nowMs;
  const startSession = (label: string) => {
    mutate((d) => {
      d.protectedLabel = label;
      d.protectedUntil = new Date(Date.now() + 30 * 60000).toISOString();
    });
    say(
      focusEnabled
        ? "30 minutes set aside. Selected distracting apps will return you to the home screen."
        : "30 minutes set aside. Configure distraction protection in Settings to limit selected apps.",
    );
  };
  if (error)
    return (
      <Page>
        <Header title="Your plan is protected." />
        <Empty
          title="We couldn’t open your saved plan"
          detail={error}
          action="Recovery and settings"
          onPress={() => router.push("/settings")}
        />
      </Page>
    );
  return (
    <Page>
      <Header
        title={`${nowMin < 720 ? "Good morning" : nowMin < 1020 ? "A little room for life" : "Home. Be here"}${data.preferences.name ? `, ${data.preferences.name}.` : "."}`}
        subtitle={fmtLong(today)}
        hat={nowMin < 1020 ? "sunhat" : "nightcap"}
      />
      <Row>
        <Chip
          title={low ? "Low-energy day" : "Keep today lighter"}
          selected={low}
          onPress={() =>
            mutate((d) => {
              d.lowEnergyDays = low
                ? d.lowEnergyDays.filter((x) => x !== today)
                : [...d.lowEnergyDays, today];
            })
          }
        />
        <Chip title="Undo last change" onPress={undo} />
      </Row>
      {protectedNow ? (
        <Panel dark>
          <Hat id="nightcap" size={56} wobble />
          <T size={12} bold color="#C8D7EA">
            TIME SET ASIDE
          </T>
          <T size={20} display color={P.paper}>
            {data.protectedLabel}
          </T>
          <T color="#D5DDE8">
            Until{" "}
            {new Date(data.protectedUntil!).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
            . Keep the phone down; Hats will be here later.
          </T>
          <T size={12} color="#D5DDE8">
            {focusEnabled
              ? "Protection enabled for your selected apps."
              : "Timer only · distraction protection is not enabled."}
          </T>
          <Button
            title="End this session"
            quiet
            onPress={() =>
              mutate((d) => {
                d.protectedUntil = null;
              })
            }
          />
        </Panel>
      ) : null}
      <WhoopToday />
      <Columns>
        <View style={{ flex: 1, gap: 16 }}>
          <Panel dark>
            <Hat
              id={[0, 6].includes(weekday(today)) ? "sunhat" : "nightcap"}
              size={52}
              wobble
            />
            <T size={12} bold color="#C8D7EA">
              {[0, 6].includes(weekday(today))
                ? "YOUR WEEKEND"
                : "YOUR EVENING"}
            </T>
            <T size={24} display color={P.paper}>
              {low ? "Simple is enough today." : "A plan with breathing room."}
            </T>
            <T color="#D5DDE8">
              Dinner → baths when needed → stories → bedtime. Keep the sequence;
              let the timing fit your family.
            </T>
            <Button
              title="Time with the kids"
              quiet
              hat="propeller"
              onPress={() => startSession("Time with the kids")}
            />
            <Button
              title={`Time with ${data.preferences.partner || "your partner"}`}
              quiet
              hat="fedora"
              onPress={() => startSession("Time together")}
            />
          </Panel>
          <Section
            hat="safari"
            title="Your next steps"
            action="Add"
            onPress={() => router.push("/capture")}
          />
          {visible.length ? (
            visible.map((x) => (
              <TaskCard key={x.task.id} task={x.task} plannedTime={x.time} />
            ))
          ) : (
            <Empty
              title={
                waiting
                  ? "Your next steps need another opening"
                  : "Nothing else needs scheduling right now"
              }
              detail={
                waiting
                  ? "Your tasks are kept in My hats. Your plan has not been overfilled."
                  : "Enjoy the breathing room, or capture something you want to remember."
              }
            />
          )}
          {waiting ? (
            <T muted>
              {waiting} flexible {waiting === 1 ? "task is" : "tasks are"}{" "}
              waiting for room. Everything stays visible in My hats.
            </T>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 16 }}>
          {data.preferences.playful !== false ? (
            <Panel style={{ backgroundColor: P.warm }}>
              <T size={12} bold color={P.orange}>
                A LITTLE ADVENTURE · OPTIONAL
              </T>
              <T size={20} display>
                Choose something you want to do.
              </T>
              <T muted>
                A fresh idea when you want one. Make it part of a good day.
              </T>
              {(
                [
                  ["dad", activity[1], 20],
                  ["myself", "Play one song you used to love", 10],
                  [
                    "husband",
                    `Ask ${data.preferences.partner || "your partner"} what they’re looking forward to`,
                    5,
                  ],
                ] as [PersonalHat, string, number][]
              ).map(([hat, title, minutes]) => (
                <Button
                  key={hat}
                  title={title}
                  quiet
                  small
                  onPress={() => {
                    const source = `adventure:${hat}:${today}`;
                    if (data.tasks.some((t) => t.source === source)) {
                      say("That adventure is already in your plan.");
                      return;
                    }
                    mutate((d) => {
                      d.tasks.push(
                        makeTask(title, hat, today, {
                          minutes,
                          source,
                          note: "An optional adventure. Keep it only if it feels worthwhile.",
                        }),
                      );
                    });
                    say("Added to your plan. You choose when it fits.");
                  }}
                />
              ))}
            </Panel>
          ) : null}
          <Panel>
            <T size={12} bold color={P.orange}>
              DINNER, BEFORE YOU’RE EXHAUSTED
            </T>
            <T size={20} display>
              {meal ? meal.name : "What reliably works for your family?"}
            </T>
            {meal ? (
              <>
                <T muted>
                  {meal.minutes} minutes ·{" "}
                  {meal.prep || "No extra preparation saved."}
                </T>
                <T muted>
                  Based on your saved meals and staples; check what’s actually
                  available.
                </T>
                <Button
                  title="Choose this for tonight"
                  onPress={() =>
                    mutate((d) => {
                      d.dinners[today] = meal.id;
                      for (const item of shoppingFor(d, meal.id))
                        if (!d.groceries.includes(item)) d.groceries.push(item);
                    })
                  }
                />
              </>
            ) : (
              <T muted>
                Save a few reliable dinners. Hats can then suggest an easy
                option and build the grocery list.
              </T>
            )}
            <Button
              title={meal ? "Meals and grocery list" : "Add your go-to meals"}
              quiet
              hat="chef"
              onPress={() => router.push("/hat/home")}
            />
          </Panel>
          <Panel>
            <T size={12} bold color={P.blue}>
              SOMETHING TO ENJOY TOGETHER
            </T>
            <T size={20} display>
              {low ? "A short favorite story" : activity[1]}
            </T>
            <T muted>
              {low
                ? "Let the kids choose a familiar book. There’s no need for an elaborate activity."
                : activity[2]}
            </T>
            <Row>
              <Button
                title="Make time for this"
                small
                onPress={() => {
                  startSession("Family time");
                  mutate((d) => {
                    d.activities[today] = activity[0];
                    d.finishedActivities.push(activity[0]);
                  });
                }}
              />
              <Button
                title="Another idea"
                quiet
                small
                onPress={() =>
                  mutate((d) => {
                    rotateActivity(d, today);
                  })
                }
              />
            </Row>
          </Panel>
          <Panel>
            <T size={12} bold color={P.orange}>
              THE TWO OF YOU
            </T>
            <T size={20} display>
              Make the plan. Handle the details.
            </T>
            <T muted>
              A new restaurant or a movie. ${data.preferences.dateBudget} for
              the date, with childcare and transportation counted separately.
            </T>
            <Button
              title="Plan your next date"
              quiet
              hat="fedora"
              onPress={() => router.push("/hat/husband")}
            />
          </Panel>
          {today.slice(5) === "10-31" ? (
            <Panel tint="#EDE0FA">
              <Hat id="wizard" size={60} wobble />
              <T bold>Make room for Halloween</T>
              <T muted>
                Check your family’s plans, costumes, weather, and the time
                you’ll need to get ready. No event has been assumed or booked.
              </T>
            </Panel>
          ) : null}
          {[0, 6].includes(weekday(today)) ? (
            <Button
              title="Explore family outings nearby"
              quiet
              hat="safari"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/${encodeURIComponent(`family activities near ${data.preferences.city || "me"}`)}`,
                )
              }
            />
          ) : null}
          {(data.moments ?? []).length ? (
            <Panel>
              <T size={12} bold color={P.blue}>
                MOMENTS YOU MADE ROOM FOR
              </T>
              <T size={20} display>
                A life you’re showing up for.
              </T>
              {(data.moments ?? [])
                .slice(-4)
                .reverse()
                .map((m) => (
                  <View key={m.id} style={{ gap: 4 }}>
                    <T bold>{m.title}</T>
                    <T size={12} muted>
                      {HATS[m.hat].name} · {m.date}
                    </T>
                  </View>
                ))}
              <T size={12} muted>
                These reflect actions you marked complete—not a score for your
                relationships.
              </T>
            </Panel>
          ) : null}
        </View>
      </Columns>
      <Streaks />
    </Page>
  );
}
