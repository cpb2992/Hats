import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addEvent, deleteEvent, updateEvent } from '../../engine/actions';
import { addDays, fmtLong, fmtShort, fmtTime, minutesOf, nextMonday, nowMinutes, timeOf } from '../../engine/dates';
import { hatName, wornHats } from '../../engine/hats';
import { guessHat, parseCapture } from '../../engine/parse';
import type { HatsEvent } from '../../engine/types';
import { uid } from '../../engine/util';
import { useApp } from '../../store/AppStore';
import { Btn, Chip, CircleBtn, Field, Label, Patch, Stepper, success, tap, Txt } from '../../ui/kit';
import { C } from '../../ui/theme';

type Draft = Omit<HatsEvent, 'id' | 'created'>;

/** Edit an event on Hats' calendar, or add one (id "new", optional ?date=). */
export default function EventScreen() {
  const { id, date: dateParam } = useLocalSearchParams<{ id: string; date?: string }>();
  const { data, today, mutate, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const existing = id !== 'new' ? data.events.find(e => e.id === id) : undefined;
  const startGuess = timeOf(Math.min(22 * 60, Math.ceil((nowMinutes() + 1) / 15) * 15));
  const [draft, setDraft] = useState<Draft>(() => existing
    ? { title: existing.title, date: existing.date, start: existing.start, end: existing.end, allDay: existing.allDay, location: existing.location, note: existing.note, hat: existing.hat }
    : { title: '', date: dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today, start: startGuess, end: timeOf(minutesOf(startGuess) + 30), allDay: false, location: '', note: '', hat: 'teacher' });
  const [dateText, setDateText] = useState('');
  const [hatTouched, setHatTouched] = useState(!!existing);

  if (id !== 'new' && !existing) {
    return (
      <View style={{ flex: 1, backgroundColor: C.deep, padding: 24, paddingTop: insets.top + 24, gap: 16 }}>
        <Txt v="title">This event is gone.</Txt>
        <Btn title="Back" kind="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...d, ...patch }));
  const length = draft.start && draft.end ? Math.max(15, minutesOf(draft.end) - minutesOf(draft.start)) : 30;
  const moveStart = (delta: number) => {
    if (!draft.start) return;
    const s = Math.max(0, Math.min(23 * 60 + 45, minutesOf(draft.start) + delta));
    set({ start: timeOf(s), end: timeOf(Math.min(23 * 60 + 59, s + length)) });
  };
  const moveEnd = (delta: number) => {
    if (!draft.start) return;
    const e = Math.max(minutesOf(draft.start) + 15, Math.min(23 * 60 + 59, minutesOf(draft.end ?? draft.start) + delta));
    set({ end: timeOf(e) });
  };
  const dateChoices = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next Monday', value: nextMonday(today) },
  ];

  const save = () => {
    const title = draft.title.trim();
    if (!title) return;
    const clean: Draft = { ...draft, title, start: draft.allDay ? null : draft.start, end: draft.allDay ? null : draft.end };
    if (existing) mutate(d => updateEvent(d, existing.id, clean));
    else {
      const newId = uid('e');
      mutate(d => { addEvent(d, { ...clean, id: newId }, new Date().toISOString()); });
      showToast(`Added to your calendar · ${fmtShort(clean.date)}`);
    }
    success();
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Txt v="fine">{existing ? 'Calendar event' : 'New event'}</Txt>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close without saving" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 26, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Field big multiline value={draft.title} onChangeText={title => { set({ title, ...(hatTouched ? {} : { hat: guessHat(title) ?? draft.hat }) }); }} accessibilityLabel="Event" placeholder="IEP meeting · J.M." autoFocus={!existing} />

        <View style={{ gap: 12 }}>
          <Label>Day</Label>
          <Txt v="semi">{fmtLong(draft.date)}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dateChoices.map(c => <Chip key={c.label} label={c.label} on={draft.date === c.value} onPress={() => set({ date: c.value })} />)}
            <Chip label="Day before" icon="back" onPress={() => set({ date: addDays(draft.date, -1) })} />
            <Chip label="Day after" icon="next" onPress={() => set({ date: addDays(draft.date, 1) })} />
          </View>
          <Field value={dateText} onChangeText={setDateText} placeholder="Or type a day: Friday, Nov 2, in 3 days" accessibilityLabel="Type a date" returnKeyType="done"
            onSubmitEditing={() => { const p = parseCapture(dateText, today); if (p.date) { set({ date: p.date, ...(p.time && !draft.allDay ? { start: p.time, end: timeOf(Math.min(23 * 60 + 59, minutesOf(p.time) + length)) } : {}) }); setDateText(''); } }} />
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>Time</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt v="fine">All day</Txt>
              <Switch value={draft.allDay} onValueChange={allDay => set({ allDay, ...(allDay ? {} : { start: draft.start ?? startGuess, end: draft.end ?? timeOf(minutesOf(draft.start ?? startGuess) + 30) }) })} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel="All day" />
            </View>
          </View>
          {!draft.allDay && draft.start ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt v="fine">Starts</Txt>
                <Stepper label="start time" value={fmtTime(draft.start, true)} onMinus={() => moveStart(-15)} onPlus={() => moveStart(15)} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt v="fine">Ends</Txt>
                <Stepper label="end time" value={fmtTime(draft.end ?? draft.start, true)} onMinus={() => moveEnd(-15)} onPlus={() => moveEnd(15)} />
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <Label>Hat</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {wornHats().map(h => {
              const on = draft.hat === h;
              return (
                <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={hatName(h)} onPress={() => { tap(); setHatTouched(true); set({ hat: h }); }} style={{ alignItems: 'center', gap: 6, width: 66, opacity: on ? 1 : 0.55 }}>
                  <View style={{ borderRadius: 26, borderWidth: 2, borderColor: on ? C.gold : 'transparent', padding: 2 }}>
                    <Patch hat={h} size={44} />
                  </View>
                  <Txt v="fine" color={on ? C.ink : C.ink2} center>{hatName(h)}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Label>Where (optional)</Label>
          <Field value={draft.location} onChangeText={location => set({ location })} placeholder="Room 307, Zoom, the library" accessibilityLabel="Where" />
        </View>

        <View style={{ gap: 12 }}>
          <Label>Notes (optional)</Label>
          <Field multiline value={draft.note} onChangeText={note => set({ note })} placeholder="Bring the data sheets" accessibilityLabel="Notes" style={{ minHeight: 80, paddingTop: 14, textAlignVertical: 'top' }} />
        </View>

        <View style={{ gap: 10 }}>
          <Btn title={existing ? 'Save' : 'Add to calendar'} icon="calendar" disabled={!draft.title.trim()} onPress={save} />
          {existing ? (
            <Btn title="Delete" kind="ghost" icon="trash" onPress={() => Alert.alert('Delete this event?', existing.title, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { router.back(); mutate(d => deleteEvent(d, existing.id)); } },
            ])} />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
