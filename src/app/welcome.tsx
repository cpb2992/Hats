import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { pickBackup } from "../personal/backup";
import { parseClock } from "../personal/clock";
import { usePersonal } from "../personal/Store";
import { Hat } from "../personal/Hat";
import type { HatArtId } from "../personal/hatArt";
import { HATS, HAT_IDS, type BuiltInHat } from "../personal/model";
import { applySetup } from "../personal/setup";
import { Button, Chip, Field, P, Page, Panel, Row, T, sticker , tone } from "../personal/ui";

type Step = "start" | "you" | "hats" | "work" | "evening";
type Work = "teacher" | "office" | "hands-on" | "other";
const WORK: Record<Work, { label: string; art: HatArtId; name: string; title: string; start: string; end: string }> = {
  teacher: { label: "Teacher", art: "mortarboard", name: "Teacher", title: "School", start: "8:00 AM", end: "3:00 PM" },
  office: { label: "Office", art: "bowler", name: "Work", title: "Work", start: "9:00 AM", end: "5:00 PM" },
  "hands-on": { label: "Hands-on", art: "hardhat", name: "Work", title: "Work", start: "7:00 AM", end: "3:30 PM" },
  other: { label: "Something else", art: "captain", name: "Work", title: "Work", start: "9:00 AM", end: "5:00 PM" },
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const list = (s: string) =>
  s
    .split(/[,\n]+|\s+and\s+/i)
    .map((x) => x.trim())
    .filter(Boolean);

/** First run: a few questions, and Hats builds your hats, your week, and your evenings from them. */
export default function Welcome() {
  const { data, mutate, today, replace, say } = usePersonal();
  const [step, setStep] = useState<Step>("start");
  const [name, setName] = useState(data.preferences.name);
  const [partner, setPartner] = useState(data.preferences.partner);
  const [partnerWord, setPartnerWord] = useState("Partner");
  const [kids, setKids] = useState("");
  const [parentWord, setParentWord] = useState("Parent");
  const [pets, setPets] = useState("");
  const [wear, setWear] = useState<BuiltInHat[]>(["home", "friends", "myself", "work"]);
  const [work, setWork] = useState<Work>("office");
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState(WORK.office.start);
  const [end, setEnd] = useState(WORK.office.end);
  const [dinner, setDinner] = useState("5:45 PM");
  const [stories, setStories] = useState("7:15 PM");
  const [bed, setBed] = useState("7:45 PM");
  const [baths, setBaths] = useState<"alternate" | "nightly" | "off">("alternate");
  const [problem, setProblem] = useState("");
  const hasKids = list(kids).length > 0;
  const hasPets = list(pets).length > 0;
  const hasPartner = !!partner.trim();
  // The hats on offer follow the household: no pets, no Pets hat.
  const offered = HAT_IDS.filter(
    (h) => (h !== "husband" || hasPartner) && (h !== "dad" || hasKids) && (h !== "pets" || hasPets),
  );
  const label = (h: BuiltInHat) =>
    h === "husband" ? partnerWord : h === "dad" ? parentWord : h === "work" ? WORK[work].name : HATS[h].name;
  const art = (h: BuiltInHat) => (h === "work" ? WORK[work].art : HATS[h].art);
  const toggle = (h: BuiltInHat) =>
    setWear((w) => (w.includes(h) ? w.filter((x) => x !== h) : [...w, h]));

  const finish = () => {
    const times = [dinner, ...(hasKids ? [stories, bed] : [])].map(parseClock);
    const hours = [parseClock(start), parseClock(end)];
    if (times.some((t) => !t)) return setProblem("Use times like 5:45 PM.");
    if (wear.includes("work") && (!hours[0] || !hours[1] || hours[0] >= hours[1]))
      return setProblem("Work hours need a start before the end, like 9:00 AM and 5:00 PM.");
    const chosen = offered.filter((h) => wear.includes(h));
    mutate((d) =>
      applySetup(
        d,
        {
          name,
          partner,
          partnerWord,
          kids: list(kids),
          parentWord,
          pets: list(pets),
          hats: chosen,
          work: chosen.includes("work")
            ? { name: WORK[work].name, art: WORK[work].art, title: WORK[work].title, days, start: hours[0]!, end: hours[1]! }
            : undefined,
          dinner: times[0]!,
          stories: times[1] ?? undefined,
          bedtime: times[2] ?? undefined,
          baths,
        },
        today,
      ),
    );
    router.replace("/");
  };

  const next = (to: Step) => <Button title="Next" onPress={() => setStep(to)} />;
  const back = (to: Step) => <Button title="Back" quiet onPress={() => setStep(to)} />;
  const stepNo = { start: 0, you: 1, hats: 2, work: 3, evening: 4 }[step];

  return (
    <Page tabs={false}>
      {step === "start" ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {(["cap", "propeller", "fedora", "catbeanie", "party", "pompom", "mortarboard", "chef"] as HatArtId[]).map((h, i) => (
              <Hat key={h} id={h} size={38} tilt={i % 2 ? 9 : -9} />
            ))}
          </View>
          <View style={{ gap: 6 }}>
            <T display size={32} header>
              Welcome to Hats.
            </T>
            <T muted>
              Your family, your home, your work, and you: one calm plan for the day,
              private on this phone.
            </T>
          </View>
          <Button title="Set up Hats" hat="cap" onPress={() => setStep("you")} />
          <Panel>
            <T bold size={17}>
              Have a setup file or backup?
            </T>
            <T muted size={14}>
              Brings in your family, pets, routines, and streaks in one tap.
            </T>
            <Button
              title="Import my setup or backup"
              quiet
              hat="stack"
              onPress={async () => {
                try {
                  const next = await pickBackup();
                  if (next) {
                    await replace(next);
                    router.replace("/");
                  }
                } catch (e) {
                  say(e instanceof Error ? e.message : "Could not import.");
                }
              }}
            />
          </Panel>
        </>
      ) : (
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityLabel={`Step ${stepNo} of 4`}>
          {[1, 2, 3, 4].map((n) => (
            <View
              key={n}
              style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: n <= stepNo ? P.ink : tone("#E6D8C3") }}
            />
          ))}
        </View>
      )}

      {step === "you" ? (
        <>
          <T display size={26} header>
            Who’s at home?
          </T>
          <Field label="What should Hats call you?" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Your partner’s name · optional" value={partner} onChangeText={setPartner} autoCapitalize="words" />
          {hasPartner ? (
            <View style={{ gap: 6 }}>
              <T size={13} bold>
                Your hat for {partner.trim()}
              </T>
              <Row>
                {["Husband", "Wife", "Partner"].map((w) => (
                  <Chip key={w} title={w} selected={partnerWord === w} onPress={() => setPartnerWord(w)} />
                ))}
              </Row>
            </View>
          ) : null}
          <Field
            label="Kids at home · names, separated by commas"
            value={kids}
            onChangeText={setKids}
            placeholder="Ami, Leo"
            autoCapitalize="words"
          />
          {hasKids ? (
            <View style={{ gap: 6 }}>
              <T size={13} bold>
                Your parent hat
              </T>
              <Row>
                {["Dad", "Mom", "Parent"].map((w) => (
                  <Chip key={w} title={w} selected={parentWord === w} onPress={() => setParentWord(w)} />
                ))}
              </Row>
            </View>
          ) : null}
          <Field
            label="Pets · names, separated by commas"
            value={pets}
            onChangeText={setPets}
            placeholder="Chief, Mango"
            autoCapitalize="words"
          />
          <Row>
            {back("start")}
            <Button
              title="Next"
              onPress={() => {
                // Hats for the people you named start switched on.
                setWear((w) => [
                  ...new Set([
                    ...w,
                    ...(hasPartner ? (["husband"] as BuiltInHat[]) : []),
                    ...(hasKids ? (["dad"] as BuiltInHat[]) : []),
                    ...(hasPets ? (["pets"] as BuiltInHat[]) : []),
                  ]),
                ]);
                setStep("hats");
              }}
            />
          </Row>
        </>
      ) : null}

      {step === "hats" ? (
        <>
          <T display size={26} header>
            Which hats do you wear?
          </T>
          <T muted>Each one gets its own space. You can add your own anytime, like Coach or Garden.</T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {offered.map((h) => {
              const on = wear.includes(h);
              return (
                <Pressable
                  key={h}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={label(h)}
                  onPress={() => toggle(h)}
                  style={{
                    flexGrow: 1,
                    flexBasis: 100,
                    maxWidth: 160,
                    padding: 10,
                    gap: 4,
                    alignItems: "center",
                    borderRadius: 18,
                    backgroundColor: on ? tone(HATS[h].tint) : P.paper,
                    borderWidth: 2,
                    borderColor: on ? P.edge : tone("#E6D8C3"),
                    ...(on ? sticker(4) : {}),
                  }}
                >
                  <Hat id={art(h)} size={44} tilt={on ? -8 : 0} />
                  <T size={13} bold numberOfLines={2} style={{ textAlign: "center" }}>
                    {on ? "✓ " : ""}
                    {label(h)}
                  </T>
                </Pressable>
              );
            })}
          </View>
          <Row>
            {back("you")}
            {next(wear.includes("work") ? "work" : "evening")}
          </Row>
        </>
      ) : null}

      {step === "work" ? (
        <>
          <T display size={26} header>
            Your work day
          </T>
          <T muted>It shows on Today, and Hats keeps those hours free of home to-dos.</T>
          <Row>
            {(Object.keys(WORK) as Work[]).map((k) => (
              <Chip
                key={k}
                title={WORK[k].label}
                selected={work === k}
                onPress={() => {
                  setWork(k);
                  setStart(WORK[k].start);
                  setEnd(WORK[k].end);
                }}
              />
            ))}
          </Row>
          <T size={13} bold>
            Days
          </T>
          <Row>
            {DAYS.map((d, i) => (
              <Chip
                key={d}
                title={d}
                selected={days.includes(i)}
                onPress={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}
              />
            ))}
          </Row>
          <Row>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Field label="Starts" value={start} onChangeText={setStart} />
            </View>
            <View style={{ flex: 1, minWidth: 130 }}>
              <Field label="Ends" value={end} onChangeText={setEnd} />
            </View>
          </Row>
          {work === "teacher" ? (
            <T size={12} muted>
              You can switch to your full bell schedule, period by period, in Settings.
            </T>
          ) : null}
          <Row>
            {back("hats")}
            {next("evening")}
          </Row>
        </>
      ) : null}

      {step === "evening" ? (
        <>
          <T display size={26} header>
            Your evenings
          </T>
          <T muted>Hats keeps these times free and puts dinner ideas on the plan.</T>
          <Field label="Dinner around" value={dinner} onChangeText={setDinner} />
          {hasKids ? (
            <>
              <Field label="Stories or wind-down" value={stories} onChangeText={setStories} />
              <Field label="Kids’ bedtime" value={bed} onChangeText={setBed} />
              <T size={13} bold>
                Baths
              </T>
              <Row>
                {(
                  [
                    ["alternate", "Every other night"],
                    ["nightly", "Every night"],
                    ["off", "Don’t show"],
                  ] as const
                ).map(([k, l]) => (
                  <Chip key={k} title={l} selected={baths === k} onPress={() => setBaths(k)} />
                ))}
              </Row>
            </>
          ) : null}
          {problem ? (
            <T bold color={P.orange}>
              {problem}
            </T>
          ) : null}
          <Row>
            {back(wear.includes("work") ? "work" : "hats")}
          </Row>
          <Button title="Make room for what matters" hat="cap" tone="sun" onPress={finish} />
          <T size={12} muted>
            Private · encrypted on this phone · family sharing and sync are optional in Settings.
          </T>
        </>
      ) : null}
    </Page>
  );
}
