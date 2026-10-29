import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { voiceBus } from "../../personal/voiceBus";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Hat } from "../../personal/Hat";
import { Icon } from "../../ui/icons";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import {
  addUnderstood,
  understand,
  type Understood,
} from "../../personal/understand";
import { fmtLong, fmtRelative, fmtTime } from "../../engine/dates";
import { allHats, id, isHatId, type PersonalHat, hatDef } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Field,
  Header,
  P,
  Page,
  Panel,
  Row,
  T,
  sticker,
} from "../../personal/ui";
import {
  startListening,
  stopListening,
  speechAvailable,
  useSpeechRecognitionEvent,
  abortListening,
} from "../../services/speech";

const endOf = (t: string, m: number) => {
  const n = Math.min(
    23 * 60 + 59,
    Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + m,
  );
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
};

type Kind = "task" | "idea" | "gift" | "reflection" | "groceries" | "pantry";
export default function Capture() {
  const params = useLocalSearchParams<{
    hat?: PersonalHat;
    kind?: Kind;
    text?: string;
    listen?: string;
  }>();
  return (
    <CaptureForm
      key={`${params.hat ?? ""}:${params.kind ?? ""}:${params.text ?? ""}:${params.listen ?? ""}`}
      params={params}
    />
  );
}
function CaptureForm({
  params,
}: {
  params: { hat?: PersonalHat; kind?: Kind; text?: string; listen?: string };
}) {
  const { data, mutate, today, nowMin, say, celebrate } = usePersonal();
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [text, setText] = useState(params.text ?? "");
  const [kind, setKind] = useState<Kind>(
    params.kind &&
      ["task", "idea", "gift", "reflection", "groceries", "pantry"].includes(
        params.kind,
      )
      ? params.kind
      : "task",
  );
  const [hat, setHat] = useState<PersonalHat>(
    params.hat && isHatId(params.hat) ? params.hat : "home",
  );
  const [manual, setManual] = useState(!!params.hat);
  const [listening, setListening] = useState(false);
  const [photo, setPhoto] = useState("");
  useEffect(() => () => abortListening(), []);
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);
  const begin = useCallback(async () => {
    if (listeningRef.current) return;
    if (!speechAvailable()) {
      say(
        "Speech recognition isn’t available here. Use your keyboard microphone or type.",
      );
      return;
    }
    const asked = Date.now();
    try {
      const ok = await startListening();
      setListening(ok);
      if (!ok) say("Microphone permission is off. Turn it on to talk to Hats.");
      // Released the mic button before listening began: stop right away.
      else if (voiceBus.stoppedAt > asked) {
        stopListening();
        setListening(false);
      }
    } catch {
      say("Microphone unavailable. Check phone permissions.");
    }
  }, [say]);
  const end = useCallback(() => {
    stopListening();
    setListening(false);
  }, []);
  // The mic button in the tab bar: tap to talk, or hold and speak.
  useEffect(
    () =>
      voiceBus.on((c) => {
        if (c === "stop") end();
        else if (c === "start") begin();
        else if (listeningRef.current) end();
        else begin();
      }),
    [begin, end],
  );
  const autoStarted = useRef(false);
  useEffect(() => {
    if (params.listen && !autoStarted.current) {
      autoStarted.current = true;
      begin();
    }
  }, [params.listen, begin]);
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setText(transcript);
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    say("Voice capture stopped. You can keep typing or try again.");
  });
  const understood = understand(text, data, today, hat, nowMin).map((u, i) => ({
    ...u,
    hat: manual ? hat : u.hat,
    kind: flipped[i] ? (u.kind === "event" ? "task" : "event") : u.kind,
  })) as Understood[];
  const draft = { hat: understood[0]?.hat ?? hat };
  const choosePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.65,
      });
      if (result.canceled) return;
      const target = new File(Paths.document, `hats-photo-${id()}.jpg`);
      new File(result.assets[0].uri).copy(target);
      setPhoto(target.uri);
      if (kind === "task") setKind("idea");
    } catch {
      say("Could not keep that photo. Try another image.");
    }
  };
  const save = () => {
    if (!text.trim() && !photo) {
      say("Say or add something to remember.");
      return;
    }
    if (listening) {
      stopListening();
      setListening(false);
    }
    mutate((d) => {
      if (kind === "task") addUnderstood(d, understood);
      else if (kind === "groceries" || kind === "pantry") {
        const items = text
          .split(/[,\n]+/)
          .map((x) => x.trim())
          .filter(Boolean);
        const target = kind === "groceries" ? d.groceries : d.pantry;
        for (const item of items)
          if (!target.some((x) => x.toLowerCase() === item.toLowerCase()))
            target.push(item);
      } else
        d.notes.push({
          id: id(),
          hat: kind === "reflection" ? "husband" : hat,
          kind,
          text: text.trim() || "Photo note",
          createdAt: new Date().toISOString(),
          ...(photo ? { photo } : {}),
        });
    });
    setText("");
    setPhoto("");
    setFlipped({});
    if (kind === "task" && understood.length) {
      const first = understood[0];
      const when = `${fmtRelative(first.date, today)}${first.time ? ` · ${fmtTime(first.time, true)}` : ""}`;
      say(
        understood.length > 1
          ? `Added ${understood.length} things · first: ${when}`
          : `${first.kind === "event" ? "Event" : "To-do"} added · ${when}`,
      );
      celebrate({
        hat: first.kind === "event" ? "safari" : hatDef(first.hat).art,
      });
      router.push({ pathname: "/", params: { date: first.date } });
      return;
    }
    say(
      kind === "reflection"
        ? "Private reflection saved. Nothing was sent."
        : "Saved to your personal life.",
    );
    router.push(
      kind === "groceries" || kind === "pantry"
        ? "/hat/home"
        : {
            pathname: "/hat/[id]",
            params: {
              id: kind === "reflection" ? "husband" : hat,
            },
          },
    );
  };
  return (
    <Page>
      <Header
        title="A thought worth keeping."
        subtitle="Say it or type it. Then get back to life."
        hat="wizard"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {(
          [
            "task",
            "idea",
            "gift",
            "reflection",
            "groceries",
            "pantry",
          ] as Kind[]
        ).map((k) => (
          <Chip
            key={k}
            title={
              {
                task: "To do",
                idea: "Idea / link",
                gift: "Gift idea",
                reflection: "Private reflection",
                groceries: "Grocery list",
                pantry: "Ingredients",
              }[k]
            }
            selected={kind === k}
            onPress={() => setKind(k)}
          />
        ))}
      </ScrollView>
      {kind === "reflection" ? (
        <Panel>
          <T bold>Make room for your feelings before responding.</T>
          <T muted>
            What happened? What did you feel? What part can you own? What do you
            need to say calmly?
          </T>
          <T size={12} muted>
            This stays in your private notes. It isn’t sent to your partner or
            an AI service.
          </T>
        </Panel>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop listening" : "Tap to talk"}
        onPress={() => (listening ? end() : begin())}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 22,
          backgroundColor: listening ? P.ink : P.sun,
          ...sticker(pressed ? 2 : 5),
          transform: [{ translateY: pressed ? 2 : 0 }],
        })}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: listening ? P.sun : P.paper,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: P.ink,
          }}
        >
          <Icon name={listening ? "pause" : "mic"} color={P.ink} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <T bold size={17} color={listening ? P.paper : P.ink}>
            {listening ? "Listening… tap to stop" : "Tap to talk"}
          </T>
          <T size={13} color={listening ? "#D5DDE8" : P.ink}>
            {listening
              ? "Speak naturally. Hats writes it down."
              : "Hats sorts it into the right hat."}
          </T>
        </View>
      </Pressable>
      <Field
        label={
          kind === "groceries" || kind === "pantry"
            ? "Items · separate with commas"
            : kind === "reflection"
              ? "What’s on your mind?"
              : "What do you want to remember?"
        }
        value={text}
        onChangeText={setText}
        multiline
        style={{ minHeight: 110 }}
        placeholder={
          kind === "pantry"
            ? "Rice, eggs, frozen vegetables"
            : kind === "reflection"
              ? "I felt… What I heard was…"
              : "A task, a promise, a song, or a useful link…"
        }
      />
      <Row>
        {!["task", "pantry", "groceries"].includes(kind) ? (
          <Button title="Keep a photo" hat="chef" quiet onPress={choosePhoto} />
        ) : null}
      </Row>
      {photo ? (
        <View style={{ gap: 10 }}>
          <Image
            source={{ uri: photo }}
            accessibilityLabel="Attached photo"
            style={{ width: "100%", height: 200, borderRadius: 18 }}
          />
          <T size={12} muted>
            Photo stays on this phone; text can sync. Ingredient photos aren’t
            automatically interpreted.
          </T>
          <Button title="Remove photo" quiet onPress={() => setPhoto("")} />
        </View>
      ) : null}
      {!["reflection", "groceries", "pantry"].includes(kind) ? (
        <>
          <T bold>Keep it under</T>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 4 }}
          >
            {allHats(data.customHats).map((h) => {
              const on = (manual ? hat : draft.hat) === h;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={hatDef(h).name}
                  onPress={() => {
                    setHat(h);
                    setManual(true);
                  }}
                  style={{
                    alignItems: "center",
                    gap: 2,
                    width: 78,
                    paddingVertical: 8,
                    borderRadius: 18,
                    backgroundColor: on ? hatDef(h).tint : P.paper,
                    borderWidth: 2,
                    borderColor: on ? P.ink : P.line,
                  }}
                >
                  <Hat id={hatDef(h).art} size={34} tilt={on ? -8 : 0} />
                  <T size={11} bold numberOfLines={1}>
                    {on ? "✓ " : ""}
                    {hatDef(h).name.split(" ")[0]}
                  </T>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a new hat"
              onPress={() => router.push("/hat-new")}
              style={{
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                width: 78,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: P.paper,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: P.ink,
              }}
            >
              <T display size={26}>
                +
              </T>
              <T size={11} bold>
                New hat
              </T>
            </Pressable>
          </ScrollView>
        </>
      ) : null}
      {kind === "task" && understood.length ? (
        <Panel>
          <T size={12} bold>
            HATS HEARD{" "}
            {understood.length > 1 ? `${understood.length} THINGS` : ""}
          </T>
          {understood.map((u, i) => (
            <View key={i} style={{ gap: 6 }}>
              <Row>
                <Hat
                  id={u.kind === "event" ? "safari" : hatDef(u.hat).art}
                  size={28}
                />
                <T bold style={{ flex: 1 }}>
                  {u.title}
                </T>
              </Row>
              <Row>
                <Chip
                  title={u.kind === "event" ? "📅 Event ⇄" : "☑ To-do ⇄"}
                  onPress={() => setFlipped({ ...flipped, [i]: !flipped[i] })}
                />
                <T size={13}>
                  {fmtLong(u.date)}
                  {u.time
                    ? ` · ${fmtTime(u.time, true)}${u.kind === "event" ? `–${fmtTime(endOf(u.time, u.minutes), true)}` : ""}`
                    : u.kind === "event"
                      ? " · all day"
                      : " · fits your next opening"}
                </T>
              </Row>
            </View>
          ))}
          <T size={12} muted>
            Tap Event / To-do to switch. Say a day (“Thursday”, “Nov 3”) and a
            time (“at 5pm”) and it lands right there.
          </T>
        </Panel>
      ) : null}
      <Button
        title={kind === "reflection" ? "Save privately" : "Keep this"}
        hat={kind === "reflection" ? "fedora" : "wizard"}
        disabled={!text.trim() && !photo}
        onPress={save}
      />
    </Page>
  );
}
