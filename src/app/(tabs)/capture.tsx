import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { keepMemory } from "../../personal/memory";
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
import { groceryItems, sameItem } from "../../personal/recipes";
import { repeatLabel } from "../../personal/repeat";
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
  tone,
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

type Kind = "task" | "idea" | "gift" | "reflection" | "groceries" | "pantry" | "memory";
export default function Capture() {
  const params = useLocalSearchParams<{
    hat?: PersonalHat;
    kind?: Kind;
    text?: string;
    date?: string;
  }>();
  return (
    <CaptureForm
      key={`${params.hat ?? ""}:${params.kind ?? ""}:${params.text ?? ""}:${params.date ?? ""}`}
      params={params}
    />
  );
}
function CaptureForm({
  params,
}: {
  params: { hat?: PersonalHat; kind?: Kind; text?: string; date?: string };
}) {
  const { data, mutate, today, nowMin, say, celebrate } = usePersonal();
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [text, setText] = useState(params.text ?? "");
  const [kind, setKind] = useState<Kind>(
    params.kind &&
      ["task", "idea", "gift", "reflection", "groceries", "pantry", "memory"].includes(
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
  const [inputMode, setInputMode] = useState<"type" | "record">("type");
  const [requestingMic, setRequestingMic] = useState(false);
  const voicePrefix = useRef("");
  const focused = useRef(false);
  const voiceRequest = useRef(0);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    setInputMode("type");
    return () => {
      focused.current = false;
      voiceRequest.current++;
      abortListening();
      setListening(false);
      setRequestingMic(false);
    };
  }, []));
  const listeningRef = useRef(false);
  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);
  const begin = useCallback(async () => {
    if (listeningRef.current || requestingMic || !focused.current) return;
    if (!speechAvailable()) {
      say(
        "Speech recognition isn’t available here. Use your keyboard microphone or type.",
      );
      return;
    }
    const request = ++voiceRequest.current;
    voicePrefix.current = text.trim();
    setRequestingMic(true);
    try {
      const ok = await startListening(() => focused.current && request === voiceRequest.current);
      if (!focused.current || request !== voiceRequest.current) {
        abortListening();
        return;
      }
      setListening(ok);
      if (!ok) say("Microphone permission is off. Turn it on to record.");
    } catch {
      if (focused.current) say("Microphone unavailable. Check phone permissions.");
    } finally {
      if (request === voiceRequest.current) setRequestingMic(false);
    }
  }, [say, text, requestingMic]);
  const end = useCallback(() => {
    voiceRequest.current++;
    stopListening();
    setListening(false);
    setRequestingMic(false);
  }, []);
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript && focused.current) setText([voicePrefix.current, transcript].filter(Boolean).join(" "));
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    if (!focused.current) return;
    say("Voice capture stopped. You can keep typing or try again.");
  });
  // Opened from a day's "Add" button: anything without its own day lands on that day.
  const [forDay, setForDay] = useState(
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) && params.date !== today ? params.date : "",
  );
  const understood = understand(text, data, today, hat, nowMin).map((u, i) => ({
    ...u,
    date: forDay && !u.heard.date && !u.repeat ? forDay : u.date,
    hat: manual ? hat : u.hat,
    kind: flipped[i] ? (u.kind === "event" ? "task" : "event") : u.kind,
  })) as Understood[];
  const draft = { hat: understood[0]?.hat ?? hat };
  // "We need milk and eggs" goes on the grocery list, not the to-do list.
  const shopping = kind === "task" ? groceryItems(text) : null;
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
    if (kind === "memory") {
      if (!text.trim() || text.trim().length > 2000) {
        say("Add a text memory of up to 2,000 characters.");
        return;
      }
      const at = new Date().toISOString();
      mutate((d) => keepMemory(d, { id: id(), text: text.trim(), hat, source: "you", createdAt: at, updatedAt: at }));
      setText("");
      say("Remembered. Choose a planning preference to put it to work.");
      router.push({ pathname: "/memory", params: { hat } });
      return;
    }
    if (shopping) {
      let added = 0;
      mutate((d) => {
        for (const item of shopping)
          if (!d.groceries.some((g) => sameItem(g, item))) {
            d.groceries.push(item);
            added++;
          }
      });
      setText("");
      say(
        added
          ? `Added ${shopping.join(", ")} to groceries.`
          : "Those are already on the grocery list.",
      );
      celebrate({ hat: "cap" });
      router.push("/meals");
      return;
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
    setForDay("");
    setPhoto("");
    setFlipped({});
    if (kind === "task" && understood.length) {
      const first = understood[0];
      const when = first.repeat
        ? `${repeatLabel(first.repeat, first.date).toLowerCase()}${first.time ? ` at ${fmtTime(first.time, true)}` : ""}`
        : `${fmtRelative(first.date, today)}${first.time ? ` · ${fmtTime(first.time, true)}` : ""}`;
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
        ? "/meals"
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
        title="Capture."
        subtitle="Type a thought or choose Record."
        hat="wizard"
      />
      <Row>
        <Chip title="Type" selected={inputMode === "type"} onPress={() => { end(); setInputMode("type"); }} />
        <Chip title="Record" selected={inputMode === "record"} onPress={() => setInputMode("record")} />
      </Row>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {(
          [
            "task",
            "memory",
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
                memory: "Remember about me",
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
      {forDay && kind === "task" ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <T bold color={P.blue}>Adding to {fmtLong(forDay)}</T>
          <Chip title="Use today instead" onPress={() => setForDay("")} />
        </View>
      ) : null}
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
      {kind === "memory" ? <Panel>
        <T bold>Something you shouldn’t have to explain again.</T>
        <T muted>Kept in personal memory for reference. Open “What Hats knows” to turn it into a timing, priority or task-size preference. Photos aren’t interpreted.</T>
      </Panel> : null}
      {inputMode === "record" ? <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? "Stop recording" : "Start recording"}
        disabled={requestingMic}
        onPress={() => (listening ? end() : begin())}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 22,
          backgroundColor: listening ? P.dark : P.sun,
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
            borderColor: P.edge,
          }}
        >
          <Icon name={listening ? "pause" : "mic"} color={listening ? P.onSun : P.ink} size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <T bold size={17} color={listening ? P.onDark : P.onSun}>
            {listening ? "Recording… tap to stop" : requestingMic ? "Checking microphone…" : "Start recording"}
          </T>
          <T size={13} color={listening ? "#D5DDE8" : P.onSun}>
            {listening
              ? "Speak naturally. Hats writes it down."
              : "Recording starts only when you tap here."}
          </T>
        </View>
      </Pressable> : null}
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
        editable={!listening && !requestingMic}
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
      {kind === "task" && !text.trim() ? (
        <View style={{ gap: 6 }}>
          <T size={12} bold muted>
            TRY SAYING
          </T>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {[
              "Dentist Tuesday at 4pm",
              "We need milk and eggs",
              "Date night Friday at 7",
              "Call Mom this weekend",
              "Grade lab reports tomorrow",
            ].map((ex) => (
              <Chip key={ex} title={`“${ex}”`} onPress={() => setText(ex)} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <Row>
        {!["task", "pantry", "groceries", "memory"].includes(kind) ? (
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
              const on = (manual || kind === "memory" ? hat : draft.hat) === h;
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
                    backgroundColor: on ? tone(hatDef(h).tint) : P.paper,
                    borderWidth: 2,
                    borderColor: on ? P.edge : P.line,
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
                borderColor: P.edge,
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
      {shopping ? (
        <Panel tint="#DCE9FA">
          <T size={12} bold>
            HATS HEARD · GROCERY LIST
          </T>
          <Row>
            <Hat id="cap" size={28} />
            <T bold style={{ flex: 1 }}>
              {shopping.join(", ")}
            </T>
          </Row>
          <T size={12} muted>
            These go on the grocery list, sorted by aisle in Meals.
          </T>
        </Panel>
      ) : kind === "task" && understood.length ? (
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
                <T size={13} style={{ flexShrink: 1 }}>
                  {u.repeat
                    ? `🔁 ${repeatLabel(u.repeat, u.date)} · starts ${fmtRelative(u.date, today)}`
                    : fmtLong(u.date)}
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
            time (“at 5pm”) and it lands right there. Say “every Thursday”,
            “weekdays”, or “the first Monday of the month” and it repeats.
          </T>
        </Panel>
      ) : null}
      <Button
        title={
          kind === "reflection"
            ? "Save privately"
            : shopping
              ? "Add to groceries"
              : "Keep this"
        }
        hat={kind === "reflection" ? "fedora" : "wizard"}
        disabled={!text.trim() && !photo}
        onPress={save}
      />
    </Page>
  );
}
