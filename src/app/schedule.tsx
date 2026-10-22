import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { fmtTime, minutesOf, timeOf, weekday } from '../engine/dates';
import { defaultSchedule } from '../engine/schedule';
import type { Block, BlockKind } from '../engine/types';
import { uid } from '../engine/util';
import { useApp } from '../store/AppStore';
import { BackLink, Btn, Card, Chip, Field, Label, Screen, Segmented, Stepper, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

const DAYS = [{ value: '1', label: 'Mon' }, { value: '2', label: 'Tue' }, { value: '3', label: 'Wed' }, { value: '4', label: 'Thu' }, { value: '5', label: 'Fri' }];
const KINDS: { kind: BlockKind; label: string }[] = [
  { kind: 'class', label: 'Class' },
  { kind: 'boost', label: 'Boost' },
  { kind: 'free', label: 'Free' },
  { kind: 'meeting', label: 'Meeting' },
  { kind: 'advisory', label: 'Advisory' },
  { kind: 'homeroom', label: 'Homeroom' },
  { kind: 'break', label: 'Break' },
];
const KIND_NOTE: Record<BlockKind, string> = {
  class: 'Teaching. Tasks wait; your students in this class are one tap away.',
  boost: 'Intervention block. Pulse points Reteach groups here.',
  free: 'Open time. Hats hands you your Now and sizes the focus timer to fit.',
  meeting: 'Meeting. Hats offers to catch action items.',
  advisory: 'With students. Tasks wait.',
  homeroom: 'With students. Tasks wait.',
  break: 'Recess, lunch or dismissal.',
};

export default function ScheduleScreen() {
  const { data, today, mutate } = useApp();
  const wd = weekday(today);
  const [day, setDay] = useState(wd >= 1 && wd <= 5 ? String(wd) : '1');
  const [editing, setEditing] = useState<string | null>(null);
  const blocks = [...(data.settings.schedule[day] ?? [])].sort((a, b) => minutesOf(a.start) - minutesOf(b.start));

  const update = (id: string, patch: Partial<Block>) => mutate(d => {
    const list = d.settings.schedule[day] ?? [];
    d.settings.schedule = { ...d.settings.schedule, [day]: list.map(x => (x.id === id ? { ...x, ...patch } : x)) };
  });
  const remove = (id: string) => mutate(d => {
    d.settings.schedule = { ...d.settings.schedule, [day]: (d.settings.schedule[day] ?? []).filter(x => x.id !== id) };
  });
  const add = () => {
    const last = blocks[blocks.length - 1];
    const start = last ? last.end : '08:00';
    const blk: Block = { id: uid('blk'), start, end: timeOf(minutesOf(start) + 30), label: 'New block', kind: 'free' };
    mutate(d => { d.settings.schedule = { ...d.settings.schedule, [day]: [...(d.settings.schedule[day] ?? []), blk] }; });
    setEditing(blk.id);
  };

  return (
    <Screen tabBar={false}>
      <BackLink label="Settings" onPress={() => router.back()} />
      <View style={{ gap: 6 }}>
        <Txt v="display">Bell schedule</Txt>
        <Txt v="sub">Hats uses this to know when you’re teaching and when your time is free.</Txt>
      </View>
      <Segmented label="Day" value={day} onChange={v => { setDay(v); setEditing(null); }} options={DAYS} />

      <View>
        {blocks.map((blk, i) => {
          const open = editing === blk.id;
          return (
            <View key={blk.id} style={{ borderBottomWidth: i === blocks.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${blk.label}, ${fmtTime(blk.start)} to ${fmtTime(blk.end)}. Edit`} onPress={() => { tap(); setEditing(open ? null : blk.id); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58 }}>
                <Text style={{ width: 92, fontFamily: F.semi, fontSize: 13, color: C.ink2, fontVariant: ['tabular-nums'] }}>{fmtTime(blk.start)}–{fmtTime(blk.end)}</Text>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: blk.kind === 'free' ? C.gold : blk.kind === 'meeting' ? C.ink : 'transparent', borderWidth: blk.kind === 'free' || blk.kind === 'meeting' ? 0 : 1, borderColor: C.ink3 }} />
                <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: C.ink }}>{blk.label}</Text>
                <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3 }}>{KINDS.find(k => k.kind === blk.kind)?.label}</Text>
              </Pressable>
              {open ? (
                <Card style={{ marginBottom: 14, padding: 16 }}>
                  <Field value={blk.label} onChangeText={label => update(blk.id, { label })} placeholder="Label" accessibilityLabel="Block label" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {KINDS.map(k => <Chip key={k.kind} label={k.label} on={blk.kind === k.kind} onPress={() => update(blk.id, { kind: k.kind })} />)}
                  </View>
                  <Txt v="fine">{KIND_NOTE[blk.kind]}</Txt>
                  {blk.kind === 'class' || blk.kind === 'boost' ? (
                    <Field value={blk.section ?? ''} onChangeText={v => update(blk.id, { section: v.toUpperCase().trim() || undefined })} placeholder="Class section, like 7C" autoCapitalize="characters" accessibilityLabel="Class section" />
                  ) : null}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Label>Starts</Label>
                    <Stepper label="start" value={fmtTime(blk.start)} onMinus={() => update(blk.id, { start: timeOf(minutesOf(blk.start) - 1) })} onPlus={() => update(blk.id, { start: timeOf(minutesOf(blk.start) + 1) })} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Label>Ends</Label>
                    <Stepper label="end" value={fmtTime(blk.end)} onMinus={() => update(blk.id, { end: timeOf(minutesOf(blk.end) - 1) })} onPlus={() => update(blk.id, { end: timeOf(minutesOf(blk.end) + 1) })} />
                  </View>
                  <Btn title="Remove block" kind="ghost" small onPress={() => { remove(blk.id); setEditing(null); }} />
                </Card>
              ) : null}
            </View>
          );
        })}
      </View>

      <Btn title="Add a block" kind="quiet" small icon="plus" onPress={add} />
      <Btn
        title="Reset to my bell schedule"
        kind="ghost"
        small
        onPress={() =>
          Alert.alert('Reset the schedule?', 'All five days go back to the original bell schedule.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => mutate(d => { d.settings.schedule = defaultSchedule(); }) },
          ])
        }
      />
    </Screen>
  );
}
