/** A hat's pack: its own tools (links to screens Hats already has) and, for most hats, a list it keeps. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { fmtShort, fmtTime } from '../../engine/dates';
import { hatName, HATS, isHatId } from '../../engine/hats';
import { addPackItem, countdown, deletePackItem, finishPackItem, money, PACKS, packItems, packSummary, reopenPackItem, updatePackItem } from '../../engine/packs';
import { parseWhen } from '../../engine/parse';
import type { PackItem } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Icon } from '../../ui/icons';
import { BackLink, Btn, Card, Chip, Field, Label, Patch, Row, Screen, success, tap, Txt } from '../../ui/kit';
import { C } from '../../ui/theme';

const REPEATS = [
  { days: 0, label: 'Once' },
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Monthly' },
];

interface Draft { title: string; who: string; when: string; amount: string; repeatDays: number }

function whenText(p: PackItem): string {
  if (!p.date) return '';
  return `${fmtShort(p.date)}${p.time ? ` ${fmtTime(p.time, true)}` : ''}`;
}

export default function PackScreen() {
  const { hat: raw } = useLocalSearchParams<{ hat: string }>();
  const { data, today, mutate, showToast } = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const def = isHatId(raw) ? PACKS[raw] : null;
  const list = def?.list;
  const blank = (): Draft => ({ title: '', who: '', when: '', amount: '', repeatDays: list?.defaultRepeat ?? 0 });
  const [draft, setDraft] = useState<Draft>(blank);
  if (!def) return <Screen tabBar={false}><BackLink label="Hats" onPress={() => router.back()} /><Txt v="sub">That pack doesn’t exist.</Txt></Screen>;

  const hat = def.hat;
  const { open, done } = packItems(data, hat);
  const worn = data.hats.find(h => h.id === hat)?.on;
  const heard = draft.when.trim() ? parseWhen(draft.when, today) : { date: null, time: null };
  const amount = draft.amount.trim() ? Number(draft.amount.replace(/[^0-9.]/g, '')) : null;

  const save = () => {
    if (!draft.title.trim()) return;
    const fields = { title: draft.title, who: draft.who, date: heard.date, time: heard.time, repeatDays: draft.repeatDays, amount: amount != null && !Number.isNaN(amount) ? amount : null };
    const nowIso = new Date().toISOString();
    mutate(d => {
      if (editing) updatePackItem(d, editing, { ...fields, title: fields.title.trim(), who: fields.who.trim() });
      else addPackItem(d, { hat, ...fields }, nowIso);
    });
    setDraft(blank());
    setAdding(false);
    setEditing(null);
  };

  const startEdit = (p: PackItem) => {
    setEditing(p.id);
    setAdding(false);
    setDraft({ title: p.title, who: p.who, when: whenText(p), amount: p.amount != null ? String(p.amount) : '', repeatDays: p.repeatDays });
  };

  const finish = (p: PackItem) => {
    const nowIso = new Date().toISOString();
    mutate(d => finishPackItem(d, p.id, today, nowIso));
    success();
    showToast(p.repeatDays ? `${list?.doneLabel}. Next one is set.` : `${list?.doneLabel}.`, { kind: 'win' });
  };

  const form = list ? (
    <Card>
      <Field value={draft.title} onChangeText={title => setDraft(x => ({ ...x, title }))} placeholder={list.titleHint} accessibilityLabel={list.titleHint} autoFocus />
      {list.whoHint ? <Field value={draft.who} onChangeText={who => setDraft(x => ({ ...x, who }))} placeholder={list.whoHint} accessibilityLabel={list.whoHint} /> : null}
      <Field value={draft.when} onChangeText={when => setDraft(x => ({ ...x, when }))} placeholder={list.people ? 'Next one: “Tuesday 2pm”' : 'When: “Friday”, “Nov 12 at 3”'} accessibilityLabel="When" />
      {draft.when.trim() ? <Txt v="fine" color={heard.date ? C.gold : C.ink3}>{heard.date ? `${countdown(heard.date, today)} · ${fmtShort(heard.date)}${heard.time ? ` at ${fmtTime(heard.time, true)}` : ''}` : 'Try a day or date, like “Thursday” or “Dec 3”.'}</Txt> : null}
      {list.amount ? <Field value={draft.amount} onChangeText={v => setDraft(x => ({ ...x, amount: v }))} placeholder="Amount, like 120" keyboardType="decimal-pad" accessibilityLabel="Amount" /> : null}
      {list.repeat ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REPEATS.map(r => <Chip key={r.days} label={r.label} on={draft.repeatDays === r.days} onPress={() => setDraft(x => ({ ...x, repeatDays: r.days }))} />)}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn title={editing ? 'Save' : `Add ${list.noun.toLowerCase()}`} small disabled={!draft.title.trim()} onPress={save} style={{ flex: 1 }} />
        <Btn title="Cancel" small kind="ghost" onPress={() => { setAdding(false); setEditing(null); setDraft(blank()); }} />
      </View>
      {editing ? (
        <Btn title="Delete" small kind="ghost" icon="trash" onPress={() => Alert.alert(`Delete this ${list.noun.toLowerCase()}?`, undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => { mutate(d => deletePackItem(d, editing)); setEditing(null); setDraft(blank()); } },
        ])} />
      ) : null}
    </Card>
  ) : null;

  const sub = (p: PackItem) => {
    const bits: string[] = [];
    if (p.who) bits.push(p.who);
    if (p.date) bits.push(`${countdown(p.date, today)}${p.time ? ` · ${fmtTime(p.time, true)}` : ''}`);
    if (p.amount != null) bits.push(money(p.amount));
    if (p.repeatDays) bits.push(REPEATS.find(r => r.days === p.repeatDays)?.label.toLowerCase() ?? `every ${p.repeatDays} days`);
    if (list?.people && p.last) bits.push(`last ${fmtShort(p.last)}`);
    return bits.join(' · ');
  };

  return (
    <Screen tabBar={false}>
      <BackLink label="Hats" onPress={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Patch hat={hat} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="fine">{hatName(hat)} pack</Txt>
          <Txt v="title">{def.title}</Txt>
        </View>
      </View>
      <Txt v="sub">{list ? packSummary(data, hat, today) : def.blurb}</Txt>
      {!worn ? (
        <Card>
          <Txt v="sub">You’re not wearing {hatName(hat)} right now, so this pack stays quiet.</Txt>
          <Btn title={`Wear ${hatName(hat)}`} small onPress={() => mutate(d => { d.hats = d.hats.map(h => (h.id === hat ? { ...h, on: true } : h)); })} />
        </Card>
      ) : null}

      {def.links.map(l => (
        <Card key={l.route} onPress={() => router.push(l.route as never)} accessibilityLabel={l.label}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Icon name={l.icon} size={22} color={HATS[hat].color} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="semi">{l.label}</Txt>
              <Txt v="fine">{l.note}</Txt>
            </View>
            <Icon name="chevron" size={18} color={C.ink3} />
          </View>
        </Card>
      ))}

      {list ? (
        <>
          {adding && !editing ? form : <Btn title={`Add a ${list.noun.toLowerCase()}`} icon="plus" kind="quiet" onPress={() => { setEditing(null); setDraft(blank()); setAdding(true); }} />}
          {!open.length && !adding ? <Txt v="fine">{list.empty}</Txt> : null}
          <View>
            {open.map((p, i) => (
              <View key={p.id}>
                {editing === p.id ? <View style={{ marginVertical: 8 }}>{form}</View> : (
                  <Row last={i === open.length - 1} minHeight={66}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${p.title}. Edit`} onPress={() => { tap(); startEdit(p); }} style={({ pressed }) => [{ flex: 1, gap: 3, paddingVertical: 10 }, pressed && { opacity: 0.7 }]}>
                      <Txt v="semi">{p.title}</Txt>
                      {sub(p) ? <Txt v="fine" color={p.date && p.date < today ? C.gold : undefined}>{sub(p)}</Txt> : null}
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${list.doneLabel}: ${p.title}`} onPress={() => { tap(); finish(p); }} style={({ pressed }) => [{ paddingHorizontal: 14, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.line2, justifyContent: 'center' }, pressed && { opacity: 0.7 }]}>
                      <Txt v="fine" color={C.ink}>{list.doneLabel}</Txt>
                    </Pressable>
                  </Row>
                )}
              </View>
            ))}
          </View>
          {done.length ? (
            <View style={{ gap: 6 }}>
              <Pressable accessibilityRole="button" onPress={() => { tap(); setShowDone(v => !v); }}>
                <Label>{showDone ? 'Hide finished' : `${done.length} finished · show`}</Label>
              </Pressable>
              {showDone ? done.slice(0, 30).map((p, i) => (
                <Row key={p.id} last={i === Math.min(done.length, 30) - 1} onPress={() => mutate(d => reopenPackItem(d, p.id))} accessibilityLabel={`${p.title}. Tap to reopen`}>
                  <Icon name="check" size={16} color={C.ink3} />
                  <Txt v="fine" style={{ flex: 1 }}>{p.title}{p.amount != null ? ` · ${money(p.amount)}` : ''}</Txt>
                  <Txt v="fine">Reopen</Txt>
                </Row>
              )) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
