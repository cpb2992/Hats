import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmtShort } from '../engine/dates';
import { parseCapture } from '../engine/parse';
import { sections } from '../engine/schedule';
import type { Goal, KeyDate, Student } from '../engine/types';
import { clone, normalizeInitials, uid } from '../engine/util';
import { useApp } from '../store/AppStore';
import { Btn, Card, Chip, CircleBtn, Field, Label, Segmented, Stepper, Txt } from '../ui/kit';
import { C } from '../ui/theme';

const blankGoal = (): Goal => ({ id: uid('g'), text: '', kind: 'trials', outOf: 5, target: 4 });

export default function StudentEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, today, mutate } = useApp();
  const insets = useSafeAreaInsets();
  const existing = id ? data.students.find(s => s.id === id) : undefined;
  const [s, setS] = useState<Student>(() => (existing ? clone(existing) : { id: uid('s'), initials: '', period: '', plan: 'IEP', goals: [blankGoal()], accommodations: [], dates: [], points: [] }));
  const [accText, setAccText] = useState(() => (existing ? existing.accommodations.join(', ') : ''));
  const [dateText, setDateText] = useState<Record<string, string>>({});

  const setGoal = (gid: string, patch: Partial<Goal>) => setS(x => ({ ...x, goals: x.goals.map(g => (g.id === gid ? { ...g, ...patch } : g)) }));
  const setDate = (did: string, patch: Partial<KeyDate>) => setS(x => ({ ...x, dates: x.dates.map(d => (d.id === did ? { ...d, ...patch } : d)) }));
  const initials = normalizeInitials(s.initials);
  const canSave = initials.length >= 4;

  const save = () => {
    const out: Student = {
      ...s,
      initials,
      period: s.period.trim() || '1',
      goals: s.goals.filter(g => g.text.trim()).map(g => ({ ...g, text: g.text.trim(), target: Math.min(g.target, g.kind === 'trials' ? g.outOf : 99) })),
      accommodations: accText.split(',').map(a => a.trim()).filter(Boolean),
      dates: s.dates.filter(d => d.label.trim() && d.date),
    };
    mutate(d => {
      const i = d.students.findIndex(x => x.id === out.id);
      if (i === -1) d.students.push(out); else d.students[i] = out;
    });
    router.back();
  };

  const remove = () =>
    Alert.alert(`Remove ${initials || 'this student'}?`, 'Their goals and data points will be deleted from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { mutate(d => { d.students = d.students.filter(x => x.id !== s.id); }); router.dismissTo('/caseload'); } },
    ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Txt v="fine">{existing ? 'Edit student' : 'New student'}</Txt>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close without saving" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <Label>Initials only</Label>
          <Field big value={s.initials} onChangeText={v => setS(x => ({ ...x, initials: v }))} onBlur={() => setS(x => ({ ...x, initials: normalizeInitials(x.initials) }))} placeholder="A.R." autoCapitalize="characters" autoCorrect={false} accessibilityLabel="Student initials" />
          <Txt v="fine">No full names. Everything stays on this phone.</Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 10 }}>
            <Label>Class</Label>
            <Field value={s.period} onChangeText={v => setS(x => ({ ...x, period: v.toUpperCase().slice(0, 6) }))} placeholder="7C" autoCapitalize="characters" accessibilityLabel="Class section" />
          </View>
          <View style={{ flex: 1.3, gap: 10 }}>
            <Label>Plan</Label>
            <Segmented label="Plan type" value={s.plan} onChange={plan => setS(x => ({ ...x, plan }))} options={[{ value: 'IEP', label: 'IEP' }, { value: '504', label: '504' }]} />
          </View>
        </View>

        {sections(data.settings).length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -12 }}>
            {sections(data.settings).map(sec => <Chip key={sec} label={sec} on={s.period === sec} onPress={() => setS(x => ({ ...x, period: sec }))} />)}
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <Label>Goals</Label>
          {s.goals.map((g, i) => (
            <Card key={g.id} style={{ padding: 16 }}>
              <Field multiline value={g.text} onChangeText={text => setGoal(g.id, { text })} placeholder={`Goal ${i + 1}: backs a written claim with evidence`} accessibilityLabel={`Goal ${i + 1}`} style={{ paddingVertical: 12 }} />
              <Segmented label="How it’s measured" value={g.kind} onChange={kind => setGoal(g.id, { kind, target: kind === 'trials' ? Math.min(g.target, g.outOf) : g.target })} options={[{ value: 'trials', label: 'x of n tries' }, { value: 'tally', label: 'Tally (+1)' }]} />
              {g.kind === 'trials' ? (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt v="fine">Tries per check</Txt>
                    <Stepper label="tries" value={String(g.outOf)} onMinus={() => setGoal(g.id, { outOf: Math.max(2, g.outOf - 1), target: Math.min(g.target, Math.max(2, g.outOf - 1)) })} onPlus={() => setGoal(g.id, { outOf: Math.min(10, g.outOf + 1) })} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt v="fine">Goal is</Txt>
                    <Stepper label="goal" value={`${g.target} of ${g.outOf}`} onMinus={() => setGoal(g.id, { target: Math.max(1, g.target - 1) })} onPlus={() => setGoal(g.id, { target: Math.min(g.outOf, g.target + 1) })} />
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt v="fine">Goal per day</Txt>
                  <Stepper label="per day" value={String(g.target)} onMinus={() => setGoal(g.id, { target: Math.max(1, g.target - 1) })} onPlus={() => setGoal(g.id, { target: Math.min(20, g.target + 1) })} />
                </View>
              )}
              {s.goals.length > 1 ? <Btn title="Remove this goal" kind="ghost" small icon="trash" onPress={() => setS(x => ({ ...x, goals: x.goals.filter(y => y.id !== g.id) }))} /> : null}
            </Card>
          ))}
          <Btn title="Add another goal" kind="quiet" small icon="plus" onPress={() => setS(x => ({ ...x, goals: [...x.goals, blankGoal()] }))} />
        </View>

        <View style={{ gap: 10 }}>
          <Label>Accommodations</Label>
          <Field value={accText} onChangeText={setAccText} placeholder="Read-aloud, Graphic organizer, Extended time" accessibilityLabel="Accommodations, separated by commas" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {accText.split(',').map(a => a.trim()).filter(Boolean).map(a => <Chip key={a} label={a} />)}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Label>Review and report dates</Label>
          {s.dates.map(d => (
            <Card key={d.id} style={{ padding: 16, gap: 10 }}>
              <Field value={d.label} onChangeText={label => setDate(d.id, { label })} placeholder="Annual IEP review" accessibilityLabel="What’s due" />
              <Field
                value={dateText[d.id] ?? (d.date ? fmtShort(d.date) : '')}
                onChangeText={v => setDateText(x => ({ ...x, [d.id]: v }))}
                onBlur={() => { const p = parseCapture(dateText[d.id] ?? '', today); if (p.date) setDate(d.id, { date: p.date }); setDateText(x => { const n = { ...x }; delete n[d.id]; return n; }); }}
                placeholder="When: Nov 2"
                accessibilityLabel="Due date"
              />
              <Btn title="Remove date" kind="ghost" small onPress={() => setS(x => ({ ...x, dates: x.dates.filter(y => y.id !== d.id) }))} />
            </Card>
          ))}
          <Btn title="Add a date" kind="quiet" small icon="calendar" onPress={() => setS(x => ({ ...x, dates: [...x.dates, { id: uid('d'), label: '', date: '' }] }))} />
        </View>

        <View style={{ gap: 10 }}>
          <Btn title={existing ? 'Save' : 'Add student'} disabled={!canSave} onPress={save} />
          {existing ? <Btn title="Remove student" kind="ghost" icon="trash" onPress={remove} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
