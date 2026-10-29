import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Hat } from "../personal/Hat";
import type { HatArtId } from "../personal/hatArt";
import {
  LIBRARY,
  SHELVES,
  libraryHat,
  searchHats,
  suggestHats,
  type LibraryHat,
  type Shelf,
} from "../personal/hatLibrary";
import { haptic } from "../personal/haptics";
import {
  HAT_IDS,
  HATS,
  customDef,
  customHatId,
  isCustomHatId,
} from "../personal/model";
import { usePersonal } from "../personal/Store";
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
} from "../personal/ui";

/** Add a hat: name it, then pick one from the library that fits. Also edits a hat you added. */
export default function NewHat() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { data, mutate, say } = usePersonal();
  const mine = data.customHats ?? [];
  const editing = isCustomHatId(params.id)
    ? mine.find((h) => h.id === params.id)
    : undefined;
  const [name, setName] = useState(editing?.name ?? "");
  const [picked, setPicked] = useState<HatArtId | null>(editing?.art ?? null);
  const [query, setQuery] = useState("");
  const [shelf, setShelf] = useState<Shelf | "All">("All");
  const [problem, setProblem] = useState("");
  const { width } = useWindowDimensions();

  const suggestions = useMemo(() => suggestHats(name), [name]);
  // Until you pick one yourself, the best fit for the name is shown.
  const art: HatArtId = picked ?? suggestions[0]?.art ?? "cap";
  const lib = libraryHat(art);
  const preview = customDef({ name: name.trim() || "Your new hat", art });
  const results = query.trim()
    ? searchHats(query)
    : LIBRARY.filter((h) => shelf === "All" || h.shelf === shelf);
  const usedBy = (a: HatArtId) =>
    [
      ...HAT_IDS.filter((h) => HATS[h].art === a).map((h) => HATS[h].name),
      ...mine.filter((h) => h.art === a && h.id !== editing?.id).map((h) => h.name),
    ][0];

  // Four tiles a row inside the library panel on a phone, more on wider screens.
  const inner = Math.min(width, 1080) - 40 - 38;
  const cols = Math.max(4, Math.floor(inner / 110));
  const tile = Math.floor((inner - (cols - 1) * 10) / cols);

  const pick = (h: LibraryHat) => {
    haptic("tap");
    setPicked(h.art);
    setProblem("");
  };
  const save = () => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return setProblem("Give your hat a name first.");
    if (clean.length > 30) return setProblem("Keep the name to 30 letters or fewer.");
    const taken = [
      ...HAT_IDS.map((h) => HATS[h].name),
      ...mine.filter((h) => h.id !== editing?.id).map((h) => h.name),
    ].some((n) => n.toLowerCase() === clean.toLowerCase());
    if (taken) return setProblem(`You already have a ${clean} hat.`);
    const id = editing?.id ?? customHatId(clean, mine);
    mutate((d) => {
      d.customHats ??= [];
      if (editing) {
        const h = d.customHats.find((x) => x.id === editing.id);
        if (h) {
          h.name = clean;
          h.art = art;
        }
      } else {
        d.customHats.push({ id, name: clean, art, createdAt: new Date().toISOString() });
      }
    });
    haptic("success");
    say(editing ? `${clean} updated.` : `${clean} hat added.`);
    if (editing) router.back();
    else router.replace({ pathname: "/hat/[id]", params: { id } });
  };

  const tileFor = (h: LibraryHat, key: string) => {
    const on = h.art === art;
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={h.name}
        onPress={() => pick(h)}
        style={({ pressed }) => ({
          width: tile,
          minHeight: tile + 26,
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingVertical: 8,
          paddingHorizontal: 2,
          borderRadius: 18,
          backgroundColor: on ? h.tint : P.paper,
          borderWidth: 2,
          borderColor: on ? P.ink : P.line,
          borderBottomWidth: on ? 4 : 2,
          transform: [{ translateY: pressed ? 2 : 0 }],
        })}
      >
        {on ? (
          <View
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: P.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <T size={11} bold color={P.paper} style={{ lineHeight: 14 }}>
              ✓
            </T>
          </View>
        ) : null}
        <Hat id={h.art} size={Math.min(54, tile - 22)} tilt={on ? -8 : 0} />
        <T
          size={Math.max(...h.name.split(" ").map((w) => w.length)) > 9 ? 10 : 11}
          bold
          numberOfLines={2}
          style={{ textAlign: "center" }}
        >
          {h.name}
        </T>
      </Pressable>
    );
  };

  return (
    <Page tabs={false}>
      <Header
        title={editing ? "Change this hat." : "Add a hat."}
        subtitle="Name it, then pick a hat that fits."
        back
      />
      <View
        style={{
          backgroundColor: preview.tint,
          borderRadius: 26,
          padding: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          ...sticker(5),
        }}
      >
        <Hat id={art} size={84} tilt={-8} wobble />
        <View style={{ flex: 1, gap: 4 }}>
          <T display size={24} numberOfLines={2}>
            {preview.name}
          </T>
          <T size={13} muted>
            {name.trim() ? preview.subtitle : "Room for what matters"}
          </T>
          <T size={12} bold color={lib.color}>
            {lib.name.toUpperCase()}
          </T>
        </View>
      </View>

      <Field
        label="What’s this hat for?"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setProblem("");
        }}
        placeholder="Coach, Garden, Band, Side hustle…"
        maxLength={30}
        autoFocus={!editing}
        autoCapitalize="words"
        returnKeyType="done"
      />

      {suggestions.length ? (
        <View style={{ gap: 8 }}>
          <T size={13} bold>
            Hats that fit “{name.trim()}”
          </T>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {suggestions.slice(0, cols).map((h) => (
              tileFor(h, `s-${h.art}`)
            ))}
          </View>
        </View>
      ) : null}

      <Panel style={{ gap: 12 }}>
        <T display size={19}>
          The hat library
        </T>
        <Field
          label="Look for a hat"
          value={query}
          onChangeText={setQuery}
          placeholder="music, winter, sports, garden…"
          autoCapitalize="none"
          returnKeyType="search"
        />
        {!query.trim() ? (
          <Row>
            {(["All", ...SHELVES] as const).map((s) => (
              <Chip key={s} title={s} selected={shelf === s} onPress={() => setShelf(s)} />
            ))}
          </Row>
        ) : null}
        {results.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {results.map((h) => (
              tileFor(h, h.art)
            ))}
          </View>
        ) : (
          <T muted>No hats match “{query.trim()}”. Try a different word, or browse a shelf.</T>
        )}
        <T size={12} muted>
          {LIBRARY.length} hats.{" "}
          {usedBy(art)
            ? `${lib.name} is also your ${usedBy(art)} hat, which is fine.`
            : "Tap one to try it on."}
        </T>
      </Panel>

      {problem ? (
        <T bold color={P.orange}>
          {problem}
        </T>
      ) : null}
      <Button
        title={editing ? "Save changes" : `Add ${name.trim() ? `the ${name.trim()}` : "this"} hat`}
        hat={art}
        tone="sun"
        onPress={save}
      />
    </Page>
  );
}
