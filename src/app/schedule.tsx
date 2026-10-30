import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { fmtTime, minutesOf, timeOf, weekday } from '../engine/dates';
import { teaches } from '../engine/hats';
import { defaultSchedule, emptySchedule } from '../engine/schedule';
import type { Block, BlockKind } from '../engine/types';
import { uid } from '../engine/util';
import { useApp } from '../store/AppStore';
import { BackLink, Btn, Card, Chip, Field, Label, Screen, Segmented, Stepper, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

const DAYS = [{ value: '1', label: 'Mon' }, { value: '2', label: 'Tue' }, { value: '3', label: 'Wed' }, { value: '4', label: 'Thu' }, { value: '5', label: 'Fri' }];
const TEACHER_KINDS: { kind: BlockKind; label: string }[] = [
  { kind: 'class', label: 'Class' },
  { kind: 'boost', label: 'Boost' },
  { kind: 'free', label: 'Free' },
  { kind: 'meeting', label: 'Meeting' },
  { kind: 'advisory', label: 'Advisory' },
  { kind: 'homeroom', label: 'Homeroom' },
  { kind: 'break', label: 'Break' },
];
/** Everyone else gets plain words; "class" means busy, "free" means focus or open time. */
const WORK_KINDS: { kind: BlockKind; label: string }[] = [
  { kind: 'meeting', label: 'Meeting' },
  { kind: 'class', label: 'Busy' },
  { kind: 'free', label: 'Focus time' },
  { kind: 'break', label: 'Break' },
];
const WORK_NOTE: Partial<Record<BlockKind, string>> = {
  meeting: 'Meeting. Hats offers to catch action items.',
  class: 'Busy (a shift, a site visit, a workshop). Tasks wait until it ends.',
  free: 'Open time. Hats hands you your Now and sizes the focus timer to fit.',
  break: 'Lunch or a break.',
};
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
  // First run: arrived from the welcome screen, so there's no Settings to go back to.
  const setup = useLocalSearchParams<{ setup?: string }>().setup === '1';
  const teacher = teaches(data.hats);
  const KINDS = teacher ? TEACHER_KINDS : WORK_KINDS;
  const note = (k: BlockKind) => (teacher ? KIND_NOTE[k] : WORK_NOTE[k] ?? KIND_NOTE[k]);
  const s = data.settings;
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
    const start = last ? last.end : data.settings.schoolStart;
    const blk: Block = { id: uid('blk'), start, end: timeOf(minutesOf(start) + 30), label: teacher ? 'New block' : 'Meeting', kind: teacher ? 'free' : 'meeting' };
    mutate(d => { d.settings.schedule = { ...d.settings.schedule, [day]: [...(d.settings.schedule[day] ?? []), blk] }; });
    setEditing(blk.id);
  };

  /** Moves every block on this day earlier or later, for matching the first bell quickly. */
  /** During first-run setup every day moves together, since they all start as the same typical day. */
  const shift = (min: number) => mutate(d => {
    const move = (list: Block[]) => list.map(x => ({ ...x, start: timeOf(minutesOf(x.start) + min), end: timeOf(minutesOf(x.end) + min) }));
    const next = { ...d.settings.schedule };
    for (const key of setup ? Object.keys(next) : [day]) next[key] = move(next[key] ?? []);
    d.settings.schedule = next;
  });
  const copyToAll = () => mutate(d => {
    const src = d.settings.schedule[day] ?? [];
    const next: Record<string, Block[]> = {};
    for (const x of DAYS) next[x.value] = src.map(b => ({ ...b }));
    d.settings.schedule = next;
  });

  return (
    <Screen tabBar={false}>
      {setup ? null : <BackLink label="Settings" onPress={() => router.back()} />}
      <View style={{ gap: 6 }}>
        <Txt v="display">{teacher ? (setup ? 'Your bell schedule' : 'Bell schedule') : (setup ? 'Your work week' : 'Work schedule')}</Txt>
        <Txt v="sub">{teacher
          ? (setup
            ? 'This is what makes Hats different: it waits while you teach and hands you the next thing in your planning period. Start from this typical day, slide it to your first bell, and tap any block to change it.'
            : 'Hats uses this to know when you’re teaching and when your time is free.')
          : (setup
            ? 'Set your work hours, then add anything regular: meetings, shifts, focus time. Hats waits while you’re busy and hands you the next thing when you’re free. You can skip the blocks.'
            : 'Hats uses this to know when you’re busy and when your time is free.')}</Txt>
      </View>
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Label>{teacher ? 'School day starts' : 'Work starts'}</Label>
          <Stepper label="day starts" value={fmtTime(s.schoolStart, true)} onMinus={() => mutate(d => { d.settings.schoolStart = timeOf(minutesOf(d.settings.schoolStart) - 15); })} onPlus={() => mutate(d => { d.settings.schoolStart = timeOf(minutesOf(d.settings.schoolStart) + 15); })} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Label>{teacher ? 'Shut down at' : 'Work ends'}</Label>
          <Stepper label="day ends" value={fmtTime(s.shutdown, true)} onMinus={() => mutate(d => { d.settings.shutdown = timeOf(minutesOf(d.settings.shutdown) - 15); })} onPlus={() => mutate(d => { d.settings.shutdown = timeOf(minutesOf(d.settings.shutdown) + 15); })} />
        </View>
      </Card>
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
                <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3 }}>{KINDS.find(k => k.kind === blk.kind)?.label ?? TEACHER_KINDS.find(k => k.kind === blk.kind)?.label}</Text>
              </Pressable>
              {open ? (
                <Card style={{ marginBottom: 14, padding: 16 }}>
                  <Field value={blk.label} onChangeText={label => update(blk.id, { label })} placeholder="Label" accessibilityLabel="Block label" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {KINDS.map(k => <Chip key={k.kind} label={k.label} on={blk.kind === k.kind} onPress={() => update(blk.id, { kind: k.kind })} />)}
                  </View>
                  <Txt v="fine">{note(blk.kind)}</Txt>
                  {teacher && (blk.kind === 'class' || blk.kind === 'boost') ? (
                    <Field value={blk.section ?? ''} onChangeText={v => update(blk.id, { section: v.toUpperCase().trim() || undefined })} placeholder="Class section, like P3 or 7C" autoCapitalize="characters" accessibilityLabel="Class section" />
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

      {blocks.length ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label>{setup ? 'Slide every day' : 'Slide the whole day'}</Label>
        <Stepper label="whole day" value={blocks[0] ? fmtTime(blocks[0].start) : '–'} onMinus={() => shift(-5)} onPlus={() => shift(5)} />
      </View> : null}
      <Btn title="Add a block" kind="quiet" small icon="plus" onPress={add} />
      <Btn title={`Use ${DAYS.find(x => x.value === day)?.label}’s schedule every day`} kind="quiet" small icon="calendar" onPress={copyToAll} />
      {setup ? (
        <View style={{ gap: 10 }}>
          <Btn title={teacher || blocks.length ? 'Looks right' : 'Done for now'} onPress={() => router.replace('/morning')} />
          {teacher ? <Btn title="I don’t have a bell schedule" kind="ghost" small onPress={() => { mutate(d => { d.settings.schedule = emptySchedule(); }); router.replace('/morning'); }} /> : null}
          <Txt v="fine" center>You can change it any time in Settings → {teacher ? 'Bell schedule' : 'Work schedule'}.</Txt>
        </View>
      ) : null}
      {teacher ? <Btn
        title="Reset to a typical school day"
        kind="ghost"
        small
        onPress={() =>
          Alert.alert('Reset the schedule?', 'All five days go back to a typical six-period day.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => mutate(d => { d.settings.schedule = defaultSchedule(); }) },
          ])
        }
      /> : null}
    </Screen>
  );
}
