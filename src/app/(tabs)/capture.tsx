import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { captureTask } from "../../personal/engine";
import { HATS, HAT_IDS, id, type PersonalHat } from "../../personal/model";
import { usePersonal } from "../../personal/Store";
import {
  Button,
  Chip,
  Field,
  Header,
  Page,
  Panel,
  Row,
  T,
} from "../../personal/ui";
import {
  startListening,
  stopListening,
  speechAvailable,
  useSpeechRecognitionEvent,
  abortListening,
} from "../../services/speech";

type Kind = "task" | "idea" | "gift" | "reflection" | "groceries" | "pantry";
export default function Capture() {
  const params = useLocalSearchParams<{
    hat?: PersonalHat;
    kind?: Kind;
    text?: string;
  }>();
  return (
    <CaptureForm
      key={`${params.hat ?? ""}:${params.kind ?? ""}:${params.text ?? ""}`}
      params={params}
    />
  );
}
function CaptureForm({
  params,
}: {
  params: { hat?: PersonalHat; kind?: Kind; text?: string };
}) {
  const { mutate, today, say } = usePersonal();
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
    params.hat && HAT_IDS.includes(params.hat) ? params.hat : "home",
  );
  const [manual, setManual] = useState(!!params.hat);
  const [listening, setListening] = useState(false);
  const [photo, setPhoto] = useState("");
  useEffect(() => () => abortListening(), []);
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setText(transcript);
  });
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    say("Voice capture stopped. You can keep typing or try again.");
  });
  const draft = captureTask(text, hat, today);
  if (manual) draft.hat = hat;
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
      if (kind === "task") d.tasks.push(draft);
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
              id:
                kind === "task"
                  ? draft.hat
                  : kind === "reflection"
                    ? "husband"
                    : hat,
            },
          },
    );
  };
  return (
    <Page>
      <Header
        title="A thought worth keeping."
        subtitle="Talk, type, or keep a useful idea. Then get back to life."
      />
      <Row>
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
      </Row>
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
        style={{ minHeight: 160 }}
        placeholder={
          kind === "pantry"
            ? "Rice, eggs, frozen vegetables"
            : kind === "reflection"
              ? "I felt… What I heard was…"
              : "A task, a promise, a song, or a useful link…"
        }
      />
      <Row>
        <Button
          title={listening ? "Stop listening" : "Say it out loud"}
          icon={listening ? "pause" : "mic"}
          quiet
          onPress={async () => {
            if (listening) {
              stopListening();
              setListening(false);
              return;
            }
            if (!speechAvailable()) {
              say(
                "Speech recognition isn’t available here. Use your keyboard microphone or type.",
              );
              return;
            }
            try {
              setListening(await startListening());
            } catch {
              say("Microphone unavailable. Check phone permissions.");
            }
          }}
        />
        {!["task", "pantry", "groceries"].includes(kind) ? (
          <Button
            title="Keep a photo"
            icon="camera"
            quiet
            onPress={choosePhoto}
          />
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
          <Row>
            {HAT_IDS.map((h) => (
              <Chip
                key={h}
                title={HATS[h].name}
                selected={(manual ? hat : draft.hat) === h}
                onPress={() => {
                  setHat(h);
                  setManual(true);
                }}
              />
            ))}
          </Row>
        </>
      ) : null}
      {kind === "task" && text.trim() ? (
        <Panel>
          <T size={12} bold>
            BEFORE YOU SAVE
          </T>
          <T bold>{draft.title}</T>
          <T muted>
            {HATS[draft.hat].name} ·{" "}
            {draft.date === today ? "Today" : "Tomorrow"}
            {draft.time ? ` · ${draft.time}` : " · next available opening"}
            {draft.steps.length ? " · includes all laundry steps" : ""}
          </T>
        </Panel>
      ) : null}
      <Button
        title={kind === "reflection" ? "Save privately" : "Keep this"}
        disabled={!text.trim() && !photo}
        onPress={save}
      />
    </Page>
  );
}
