/** A hat's packs on its page: add one (suggested from the hat), keep its list, check things off. */
import { useState } from "react";
import { View } from "react-native";
import { fmtTime } from "../engine/dates";
import { parseWhen } from "../engine/parse";
import { amount, required, useEditor } from "./Editor";
import { hatDef, type PersonalHat } from "./model";
import {
  addPack, addPackItem, countdown, deletePackItem, finishPackItem, money, PACK_KINDS, PACKS, packList, packsFor,
  packSummary, removePack, reopenPackItem, suggestPacks, updatePackItem, type PackItem, type PackKind,
} from "./packs";
import { usePersonal } from "./Store";
import { Button, Chip, Panel, Row, Section, T, ask } from "./ui";

const REPEATS: { label: string; days: number }[] = [
  { label: "Once", days: 0 },
  { label: "Weekly", days: 7 },
  { label: "Every 2 weeks", days: 14 },
  { label: "Monthly", days: 30 },
];
const repeatLabel = (days: number) => REPEATS.find((r) => r.days === days)?.label ?? `Every ${days} days`;

function whenText(p: PackItem) {
  if (!p.date) return "";
  return `${p.date}${p.time ? ` ${fmtTime(p.time, true)}` : ""}`;
}

export function HatPacks({ hat }: { hat: PersonalHat }) {
  const { data, mutate, today, say } = usePersonal();
  const editor = useEditor();
  const [browsing, setBrowsing] = useState(false);
  const [showDone, setShowDone] = useState<PackKind | null>(null);
  const have = packsFor(data, hat);
  const suggested = suggestPacks(hat, data.customHats).filter((k) => !have.includes(k));
  const offer = browsing ? PACK_KINDS.filter((k) => !have.includes(k)) : suggested.slice(0, 3);
  const def = hatDef(hat, data.customHats);

  const edit = (kind: PackKind, item?: PackItem) => {
    const pack = PACKS[kind];
    editor.open({
      title: item ? `Edit ${pack.noun}` : `Add a ${pack.noun}`,
      detail: pack.people
        ? "When’s the next one? It shows up in your day then, and comes back on the rhythm you pick."
        : undefined,
      fields: [
        { key: "title", label: pack.titleHint, value: item?.title },
        { key: "who", label: `${pack.whoHint} (optional)`, value: item?.who },
        { key: "when", label: "When (optional) · “Friday”, “Nov 12 at 3pm”", value: item ? whenText(item) : "" },
        ...(pack.amount ? [{ key: "amount", label: "Amount", value: item?.amount != null ? String(item.amount) : "", numeric: true }] : []),
        ...(pack.repeat
          ? [{ key: "repeat", label: "Repeats", value: repeatLabel(item?.repeatDays ?? pack.defaultRepeat ?? 0), options: REPEATS.map((r) => r.label) }]
          : []),
      ],
      saveTitle: item ? "Save" : `Add ${pack.noun}`,
      onSave: (v) => {
        const title = required(v.title, pack.titleHint.toLowerCase());
        let date: string | null = null;
        let time: string | null = null;
        if (v.when?.trim()) {
          const iso = /^\d{4}-\d{2}-\d{2}/.exec(v.when.trim())?.[0];
          const heard = parseWhen(v.when, today);
          date = iso ?? heard.date;
          time = heard.time;
          if (!date) throw new Error("Try a day or a date, like “Thursday” or “Dec 3”.");
        }
        const fields = {
          title,
          who: v.who ?? "",
          date,
          time,
          amount: pack.amount && v.amount?.trim() ? amount(v.amount, true) : null,
          repeatDays: pack.repeat ? (REPEATS.find((r) => r.label === v.repeat)?.days ?? 0) : 0,
        };
        mutate((d) => {
          if (item) updatePackItem(d, item.id, fields);
          else addPackItem(d, { hat, kind, ...fields });
        });
      },
    });
  };

  const finish = (p: PackItem) => {
    mutate((d) => finishPackItem(d, p.id, today));
    const pack = PACKS[p.kind];
    say(p.repeatDays ? `${pack.doneLabel}. The next one is on your list.` : `${pack.doneLabel}.`);
  };

  return (
    <View style={{ gap: 12 }}>
      {have.map((kind) => {
        const pack = PACKS[kind];
        const { open, done } = packList(data, hat, kind);
        return (
          <View key={kind} style={{ gap: 10 }}>
            <Section title={pack.title} action={`Add ${pack.noun}`} onPress={() => edit(kind)} hat={def.art} />
            <T muted>{packSummary(data, hat, kind, today)}</T>
            {!open.length ? <T muted size={13}>{pack.empty}</T> : null}
            {open.map((p) => {
              const late = !!p.date && p.date < today;
              const bits = [
                p.who,
                p.date ? `${countdown(p.date, today)}${p.time ? ` · ${fmtTime(p.time, true)}` : ""}` : "",
                p.amount != null ? money(p.amount) : "",
                p.repeatDays ? repeatLabel(p.repeatDays).toLowerCase() : "",
                pack.people && p.last ? `last ${p.last}` : "",
              ].filter(Boolean);
              return (
                <Panel key={p.id}>
                  <T size={17} bold>{p.title}</T>
                  {bits.length ? <T muted color={late ? "#B45C43" : undefined}>{bits.join(" · ")}</T> : null}
                  <Row>
                    <Button title={pack.doneLabel} small onPress={() => finish(p)} />
                    <Button title="Edit" quiet small onPress={() => edit(kind, p)} />
                    <Button
                      title="Delete"
                      quiet
                      small
                      onPress={() => ask(`Delete “${p.title}”?`, "It comes off this pack and your day.", "Delete", () => mutate((d) => deletePackItem(d, p.id)))}
                    />
                  </Row>
                </Panel>
              );
            })}
            {done.length ? (
              <View style={{ gap: 8 }}>
                <Button
                  title={showDone === kind ? "Hide finished" : `${done.length} finished`}
                  quiet
                  small
                  onPress={() => setShowDone(showDone === kind ? null : kind)}
                />
                {showDone === kind
                  ? done.slice(0, 30).map((p) => (
                      <Row key={p.id}>
                        <T muted style={{ flex: 1 }}>
                          {p.title}
                          {p.amount != null ? ` · ${money(p.amount)}` : ""}
                        </T>
                        <Button title="Reopen" quiet small onPress={() => mutate((d) => reopenPackItem(d, p.id))} />
                      </Row>
                    ))
                  : null}
              </View>
            ) : null}
            <Button
              title={`Take ${pack.title} off this hat`}
              quiet
              small
              onPress={() =>
                ask(
                  `Take ${pack.title} off ${def.name}?`,
                  "Its to-dos come off your day. The list is kept, so adding the pack back brings it all back.",
                  "Take it off",
                  () => mutate((d) => removePack(d, hat, kind)),
                )
              }
            />
          </View>
        );
      })}

      {offer.length ? (
        <Panel tint={def.tint}>
          <T size={17} bold>{have.length ? "Add another pack" : `Tools for ${def.name}`}</T>
          <T muted>
            {have.length
              ? "Each pack keeps its own list. Anything with a date shows up in your day."
              : "Packs give a hat its own tools. Anything with a date shows up in your day."}
          </T>
          {offer.map((k) => (
            <View key={k} style={{ gap: 2 }}>
              <Row>
                <Chip title={PACKS[k].title} onPress={() => { mutate((d) => addPack(d, hat, k)); say(`${PACKS[k].title} added to ${def.name}.`); }} />
              </Row>
              <T muted size={13}>{PACKS[k].blurb}</T>
            </View>
          ))}
          <Button title={browsing ? "Show suggestions" : "See every pack"} quiet small onPress={() => setBrowsing((b) => !b)} />
        </Panel>
      ) : null}
      {editor.node}
    </View>
  );
}
