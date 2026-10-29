import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { addDays, daysBetween, fmtRelative } from "../../engine/dates";
import { activityFor, rotateActivity } from "../../personal/engine";
import { useFocusEnabled } from "../../personal/focus";
import { Hat } from "../../personal/Hat";
import { HATS, type PersonalHat, hatDef } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Header,
  P,
  Page,
  Panel,
  Row,
  T,
  sticker,
} from "../../personal/ui";

const PEOPLE_HATS: PersonalHat[] = ["dad", "husband", "pets", "friends"];

export default function Family() {
  const { data, mutate, today, nowMs, say, celebrate } = usePersonal();
  const focusEnabled = useFocusEnabled() && data.preferences.focusConsent;
  const low = data.lowEnergyDays.includes(today);
  const activity = activityFor(data, today);
  const kids = data.people.filter((p) => p.role === "child");
  const pets = data.people.filter((p) => p.role === "pet");
  const partner = data.preferences.partner || "your partner";
  const upcoming = [...data.dates]
    .filter((d) => d.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const last = [...data.dates]
    .filter((d) => d.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const since = last ? daysBetween(last.date, today) : null;
  const birthdays = data.people
    .map((p) => {
      const md = /(\d{2})-(\d{2})$/.exec(p.birthday ?? "");
      if (!md) return null;
      let next = `${today.slice(0, 4)}-${md[1]}-${md[2]}`;
      if (next < today)
        next = `${Number(today.slice(0, 4)) + 1}-${md[1]}-${md[2]}`;
      return { p, next, days: daysBetween(today, next) };
    })
    .filter((b): b is NonNullable<typeof b> => !!b)
    .filter((b) => b.days <= 45)
    .sort((a, b) => a.days - b.days);
  const quiet = data.people
    .filter((p) => p.role === "friend" && p.lastContact)
    .map((p) => ({ p, days: daysBetween(p.lastContact!, today) }))
    .filter((x) => x.days >= 21)
    .sort((a, b) => b.days - a.days)
    .slice(0, 3);
  const protectedNow =
    data.protectedUntil && new Date(data.protectedUntil).getTime() > nowMs;
  const startSession = (label: string) => {
    mutate((d) => {
      d.protectedLabel = label;
      d.protectedUntil = new Date(Date.now() + 30 * 60000).toISOString();
    });
    say(
      focusEnabled
        ? "30 minutes set aside. Distracting apps are paused."
        : "30 minutes set aside. Phone down; Hats will be here later.",
    );
  };
  return (
    <Page>
      <Header
        title="Your people."
        subtitle="The ones who matter most."
        hat="party"
      />

      <Panel tint="#FFF0C2">
        <Row>
          <Hat id="propeller" size={34} tilt={-8} />
          <T size={12} bold>
            {low
              ? "TONIGHT, SHORT & EASY · 10 MIN"
              : `TONIGHT${kids.length ? `, FOR ${kids.length === 1 ? kids[0].name.toUpperCase() : `ALL ${kids.length}`}` : ""} · 20 MIN`}
          </T>
        </Row>
        <T size={20} display>
          {low ? "A short favorite story" : activity[1]}
        </T>
        <T muted size={14}>
          {low ? "Let them pick a familiar book. That’s plenty." : activity[2]}
        </T>
        <Row>
          <Button
            title="We’re doing this"
            small
            onPress={() => {
              mutate((d) => {
                d.activities[today] = activity[0];
                d.finishedActivities.push(activity[0]);
              });
              celebrate({ hat: "propeller" });
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

      <Panel tint="#FCE1D8">
        <Row>
          <Hat id="fedora" size={34} tilt={-8} />
          <T size={12} bold style={{ flex: 1 }}>
            {partner.toUpperCase()}
          </T>
          <T size={12} bold>
            {upcoming
              ? upcoming.date === today
                ? "Date tonight"
                : `Date in ${daysBetween(today, upcoming.date)} days`
              : since != null
                ? `${since} days since your last date`
                : "No date planned"}
          </T>
        </Row>
        <T size={18} display>
          {upcoming
            ? `${fmtRelative(upcoming.date, today)} · ${upcoming.title}`
            : "Time to plan a date night."}
        </T>
        <T size={13} muted>
          {upcoming
            ? `$${upcoming.budget} for the date${upcoming.childcare ? ` · childcare $${upcoming.childcare}` : " · childcare not booked yet"}`
            : `A new restaurant or a movie · $${data.preferences.dateBudget} for the date, childcare separate.`}
        </T>
        <Button
          title={upcoming ? "Open the plan" : "Plan it"}
          small
          hat="fedora"
          onPress={() => router.push("/hat/husband")}
        />
      </Panel>

      {protectedNow ? (
        <Panel dark>
          <T size={12} bold color="#C8D7EA">
            TIME SET ASIDE
          </T>
          <T size={20} display color={P.paper}>
            {data.protectedLabel}
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
      ) : (
        <Row>
          <Chip
            title="🛡 30 min with the kids"
            onPress={() => startSession("Time with the kids")}
          />
          <Chip
            title={`🛡 30 min with ${partner}`}
            onPress={() => startSession("Time together")}
          />
        </Row>
      )}

      {pets.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {pets.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => router.push("/hat/pets")}
              style={{
                flexGrow: 1,
                flexBasis: 140,
                padding: 12,
                gap: 4,
                borderRadius: 20,
                backgroundColor: HATS.pets.tint,
                ...sticker(3),
              }}
            >
              <Hat id="catbeanie" size={30} />
              <T bold>{p.name}</T>
              <T size={12} muted numberOfLines={2}>
                {p.interests || p.detail || "Care and routines"}
              </T>
            </Pressable>
          ))}
        </View>
      ) : null}

      {birthdays.length || quiet.length ? (
        <Panel tint="#EDE0FA">
          <Row>
            <Hat id="party" size={30} tilt={-8} />
            <T size={12} bold>
              BIRTHDAYS & KEEP IN TOUCH
            </T>
          </Row>
          {birthdays.map(({ p, next, days }) => (
            <Row key={p.id}>
              <T bold style={{ flex: 1 }}>
                {p.name} · birthday {fmtRelative(next, today)}
              </T>
              <T size={12} bold>
                {days === 0 ? "today" : `in ${days} days`}
              </T>
            </Row>
          ))}
          {quiet.map(({ p, days }) => (
            <Row key={p.id}>
              <T bold style={{ flex: 1 }}>
                Check in with {p.name}
              </T>
              <T size={12} bold>
                {Math.round(days / 7)} weeks
              </T>
            </Row>
          ))}
        </Panel>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {PEOPLE_HATS.map((h) => (
          <Pressable
            key={h}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/hat/[id]", params: { id: h } })
            }
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: 140,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 10,
              borderRadius: 18,
              backgroundColor: hatDef(h).tint,
              ...sticker(pressed ? 2 : 3),
            })}
          >
            <Hat id={hatDef(h).art} size={30} tilt={-6} />
            <T bold style={{ flex: 1 }}>
              {hatDef(h).name}
            </T>
            <T muted>›</T>
          </Pressable>
        ))}
      </View>
      {addDays(today, 0).slice(5) === "10-31" ? (
        <Panel tint="#EDE0FA">
          <Hat id="wizard" size={44} wobble />
          <T bold>Happy Halloween</T>
          <T muted>
            Costumes, weather, and time to get ready. Nothing has been booked.
          </T>
        </Panel>
      ) : null}
    </Page>
  );
}
