import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmtShort } from '../engine/dates';
import { goalLabel } from '../engine/progress';
import { applyRoster, matchExisting, parseRoster, type RosterStudent } from '../engine/roster';
import { plural } from '../engine/util';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { Btn, Card, Chip, CircleBtn, Field, InitialsPatch, Label, success, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

const EXAMPLE: [string, string][] = [
  ['J.S. 7A IEP', 'Student'],
  ['goal: CER paragraph, 4 of 5', 'Goal'],
  ['goal: break card 3 times a day', 'Goal'],
  ['- graphic organizer', 'Accommodation'],
  ['annual review 3/12', 'Date'],
  ['', ''],
  ['A.R. 7C 504: extended time, seating', 'Student'],
];

const PLACEHOLDER = 'Paste or type your list here';

function Format() {
  return (
    <Card style={{ gap: 12, padding: 18 }}>
      <Label>How to write it</Label>
      <View style={{ gap: 6 }}>
        {EXAMPLE.map(([line, tag], i) => (line ? (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 19, color: tag === 'Student' ? C.ink : C.ink2 }} numberOfLines={1}>{line}</Text>
            <Text style={{ fontFamily: F.bold, fontSize: 10.5, letterSpacing: 1.4, color: tag === 'Student' ? C.gold : C.ink3 }}>{tag.toUpperCase()}</Text>
          </View>
        ) : <View key={i} style={{ height: 6 }} />))}
      </View>
      <Txt v="fine">Start each student with initials, class and IEP or 504. Lines under a student belong to them. Rows copied from a spreadsheet work too.</Txt>
    </Card>
  );
}

function PreviewCard({ st, updates }: { st: RosterStudent; updates: boolean }) {
  return (
    <Card style={{ gap: 12, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <InitialsPatch initials={st.initials} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="semi">{st.initials}</Txt>
          <Txt v="fine">{st.period || 'No class'} · {st.plan}</Txt>
        </View>
        <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: updates ? 'rgba(255,255,255,0.06)' : C.goldSoft }}>
          <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.2, color: updates ? C.ink2 : C.gold }}>{updates ? 'ADDS TO' : 'NEW'}</Text>
        </View>
      </View>
      {st.goals.map(g => (
        <View key={g.id} style={{ gap: 2 }}>
          <Txt v="label" color={C.gold}>{`Goal · ${goalLabel(g)}`}</Txt>
          <Txt v="body" numberOfLines={3}>{g.text}</Txt>
        </View>
      ))}
      {st.accommodations.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {st.accommodations.map(a => <Chip key={a} label={a} />)}
        </View>
      ) : null}
      {st.dates.map(d => (
        <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={15} color={C.ink2} width={2} />
          <Txt v="fine" color={C.ink}>{d.label} · {fmtShort(d.date)}</Txt>
        </View>
      ))}
      {st.notes.length ? <Txt v="fine" color={C.gold}>{st.notes.join(' · ')}</Txt> : null}
    </Card>
  );
}

export default function StudentImport() {
  const { data, today, mutate, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const parsed = useMemo(() => parseRoster(text, today), [text, today]);
  const rows = parsed.students.map(st => ({ st, updates: !!matchExisting(data.students, st) }));
  const updating = rows.filter(r => r.updates).length;
  const adding = rows.length - updating;

  const save = () => {
    mutate(d => { applyRoster(d, parsed.students); });
    success();
    const parts = [adding ? `Added ${plural(adding, 'student')}` : '', updating ? `${adding ? 'updated' : 'Updated'} ${updating}` : ''].filter(Boolean);
    showToast(parts.join(', '), { kind: 'win' });
    router.back();
  };

  const cta = !rows.length ? 'Add students' : !updating ? `Add ${plural(adding, 'student')}` : !adding ? `Update ${plural(updating, 'student')}` : `Add ${adding}, update ${updating}`;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <Txt v="fine">Paste your caseload</Txt>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close without adding" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 8 }}>
          <Txt v="title">Everyone at once.</Txt>
          <Txt v="sub">Paste from a doc or spreadsheet, or type it. Full names become initials before anything is saved, and it all stays on this phone.</Txt>
        </View>

        {!text.trim() || showFormat ? <Format /> : (
          <Pressable accessibilityRole="button" onPress={() => { tap(); setShowFormat(true); }} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Txt v="fine" color={C.gold}>Show how to write it</Txt>
          </Pressable>
        )}

        <Field
          multiline
          value={text}
          onChangeText={setText}
          placeholder={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textAlignVertical="top"
          accessibilityLabel="Your caseload, one student per block"
          style={{ minHeight: 200, paddingTop: 14, paddingBottom: 14, fontSize: 15, lineHeight: 21 }}
        />

        {rows.length ? (
          <View style={{ gap: 10 }}>
            <Label right={plural(rows.length, 'student')}>Preview</Label>
            {rows.map(({ st, updates }) => <PreviewCard key={`${st.initials}-${st.period}`} st={st} updates={updates} />)}
          </View>
        ) : null}

        {parsed.skipped.length ? (
          <Card style={{ gap: 8, padding: 16, borderWidth: 1, borderColor: C.goldLine }}>
            <Txt v="semi">{parsed.skipped.length === 1 ? 'One line didn’t fit under a student' : `${parsed.skipped.length} lines didn’t fit under a student`}</Txt>
            {parsed.skipped.slice(0, 4).map((l, i) => <Txt key={i} v="fine" numberOfLines={1}>{l}</Txt>)}
            <Txt v="fine">Start each student with their initials, like J.S. 7A IEP. These lines won’t be added.</Txt>
          </Card>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.deep }}>
        <Btn title={cta} icon="check" disabled={!rows.length} onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}
