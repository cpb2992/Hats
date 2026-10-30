import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeTask, deleteTask, reopenTask, toggleThree } from '../../engine/actions';
import { addDays, fmtRelative, fmtShort, fmtTime, minutesOf, nextMonday, nowMinutes, timeOf } from '../../engine/dates';
import { hatName, wornHats } from '../../engine/hats';
import { parseCapture } from '../../engine/parse';
import { dayLog } from '../../engine/plan';
import type { Task } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Btn, Chip, CircleBtn, Field, Label, Patch, Stepper, tap, Txt } from '../../ui/kit';
import { C } from '../../ui/theme';

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, mutate } = useApp();
  const insets = useSafeAreaInsets();
  const task = data.tasks.find(t => t.id === id);
  const [dateText, setDateText] = useState('');

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: C.deep, padding: 24, paddingTop: insets.top + 24, gap: 16 }}>
        <Txt v="title">This task is gone.</Txt>
        <Btn title="Back" kind="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const set = (patch: Partial<Task>) => mutate(d => { const t = d.tasks.find(x => x.id === task.id); if (t) Object.assign(t, patch); });
  const inThree = dayLog(data, today).three.includes(task.id);
  const quarter = () => timeOf(Math.ceil((nowMinutes() + 1) / 15) * 15);
  const dateChoices: { label: string; value: string | null }[] = [
    { label: 'Today', value: today },
    { label: 'Tomorrow', value: addDays(today, 1) },
    { label: 'Next week', value: nextMonday(today) },
    { label: 'Anytime', value: null },
  ];
  const customDate = task.date && !dateChoices.some(c => c.value === task.date) ? task.date : null;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Txt v="fine">{task.done ? 'Done' : task.date && task.date > today ? fmtRelative(task.date, today) : 'Open'}</Txt>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 26, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Field big multiline value={task.title} onChangeText={title => set({ title })} accessibilityLabel="Task" placeholder="What needs doing?" />

        <View style={{ gap: 12 }}>
          <Label>Hat</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {wornHats().map(h => {
              const on = task.hat === h;
              return (
                <Pressable key={h} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={hatName(h)} onPress={() => { tap(); set({ hat: h }); }} style={{ alignItems: 'center', gap: 6, width: 66, opacity: on ? 1 : 0.55 }}>
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
          <Label>When</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {dateChoices.map(c => <Chip key={c.label} label={c.label} on={task.date === c.value} onPress={() => set({ date: c.value, deferredAt: null })} />)}
            {customDate ? <Chip label={fmtShort(customDate)} on /> : null}
          </View>
          <Field
            value={dateText}
            onChangeText={setDateText}
            placeholder="Or type a day: Friday, Nov 2, in 3 days"
            accessibilityLabel="Type a date"
            returnKeyType="done"
            onSubmitEditing={() => { const p = parseCapture(dateText, today); if (p.date) { set({ date: p.date }); setDateText(''); } }}
          />
        </View>

        <View style={{ gap: 12 }}>
          <Label>Time</Label>
          {task.time ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stepper label="time" value={fmtTime(task.time, true)} onMinus={() => set({ time: timeOf(minutesOf(task.time!) - 15) })} onPlus={() => set({ time: timeOf(minutesOf(task.time!) + 15) })} />
              <Chip label="No time" onPress={() => set({ time: null })} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Chip label="Add a time" icon="clock" onPress={() => set({ time: quarter() })} />
            </View>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Label>About how long</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[5, 10, 15, 25, 45, 60].map(m => <Chip key={m} label={`${m} min`} on={task.minutes === m} onPress={() => set({ minutes: m })} />)}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Label>Student (initials, optional)</Label>
          <Field value={task.student ?? ''} onChangeText={v => set({ student: v.trim() ? v.toUpperCase() : null })} placeholder="A.R." autoCapitalize="characters" accessibilityLabel="Student initials" />
        </View>

        <View style={{ gap: 10 }}>
          {!task.done ? (
            <Btn title={inThree ? 'Remove from today’s three' : 'Make it one of today’s three'} kind="quiet" icon="star" onPress={() => mutate(d => { toggleThree(d, today, task.id); })} />
          ) : null}
          <Btn
            title={task.done ? 'Reopen' : 'Mark done'}
            kind={task.done ? 'ghost' : 'gold'}
            icon={task.done ? 'undo' : 'check'}
            onPress={() => {
              const nowIso = new Date().toISOString();
              mutate(d => (task.done ? reopenTask(d, task.id) : completeTask(d, task.id, nowIso)));
              if (!task.done) router.back();
            }}
          />
          <Btn
            title="Delete"
            kind="ghost"
            icon="trash"
            onPress={() =>
              Alert.alert('Delete this task?', task.title, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => { router.back(); mutate(d => deleteTask(d, task.id)); } },
              ])
            }
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
