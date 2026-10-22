import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monthName } from '../engine/dates';
import { DEFAULT_MOVES, LEVEL_NAME, LEVELS } from '../engine/pulse';
import type { Level } from '../engine/types';
import { uid } from '../engine/util';
import { useApp } from '../store/AppStore';
import { Btn, CircleBtn, Field, Label, success, thud, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

const HINT: Record<Level, string> = { reteach: 'Not yet', practice: 'Almost', extend: 'Got it' };
const BAR: Record<Level, string> = { reteach: '#2F7D6D', practice: '#5FA898', extend: '#A9D3C9' };

/** Flip through the stack of exit tickets and tap where each one goes. */
export default function PulseSort() {
  useKeepAwake();
  const { std, period } = useLocalSearchParams<{ std?: string; period?: string }>();
  const { data, today, mutate, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const standard = data.standards.find(s => s.id === std) ?? data.standards[0];
  const last = [...data.cycles].filter(c => c.standardId === standard?.id).sort((a, b) => b.date.localeCompare(a.date))[0];
  const [counts, setCounts] = useState<Record<Level, number>>({ reteach: 0, practice: 0, extend: 0 });
  const [history, setHistory] = useState<Level[]>([]);
  const [moves, setMoves] = useState<Record<Level, string>>(() => ({ ...(last?.moves ?? DEFAULT_MOVES) }));
  const n = counts.reteach + counts.practice + counts.extend;

  const bump = (l: Level) => { thud(); setCounts(c => ({ ...c, [l]: c[l] + 1 })); setHistory(h => [...h, l]); };
  const undo = () => {
    const l = history[history.length - 1];
    if (!l) return;
    setCounts(c => ({ ...c, [l]: Math.max(0, c[l] - 1) }));
    setHistory(h => h.slice(0, -1));
  };
  const save = () => {
    if (!standard || !n) return;
    mutate(d => { d.cycles.push({ id: uid('cy'), date: today, period: period ?? '1', standardId: standard.id, counts, moves }); });
    success();
    showToast(`Saved to ${monthName(today)} evidence`);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <View style={{ gap: 2 }}>
          <Txt v="label" color={C.gold}>{standard?.code ?? 'Standard'}</Txt>
          <Txt v="fine">{period ?? ''}</Txt>
        </View>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close without saving" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 56, lineHeight: 58, color: C.gold, fontVariant: ['tabular-nums'] }}>{n}</Text>
          <Txt v="sub">tickets sorted</Txt>
        </View>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', gap: n ? 3 : 0 }}>
          {LEVELS.map(l => (counts[l] ? <View key={l} style={{ flex: counts[l], backgroundColor: BAR[l] }} /> : null))}
        </View>
        <View style={{ gap: 12 }}>
          {LEVELS.map(l => (
            <Pressable key={l} accessibilityRole="button" accessibilityLabel={`${LEVEL_NAME[l]}: ${counts[l]}. Add one`} onPress={() => bump(l)} style={({ pressed }) => [{ minHeight: 96, borderRadius: 26, backgroundColor: C.raised, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 16, borderLeftWidth: 0 }, pressed && { transform: [{ scale: 0.98 }], backgroundColor: C.raised2 }]}>
              <View style={{ width: 6, height: 44, borderRadius: 3, backgroundColor: BAR[l] }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="h2">{LEVEL_NAME[l]}</Txt>
                <Txt v="fine">{HINT[l]}</Txt>
              </View>
              <Text style={{ fontFamily: F.display, fontSize: 40, lineHeight: 42, color: C.ink, fontVariant: ['tabular-nums'] }}>{counts[l]}</Text>
            </Pressable>
          ))}
        </View>
        <Btn title="Undo last" kind="quiet" small icon="undo" disabled={!history.length} onPress={undo} />

        <View style={{ gap: 12 }}>
          <Label>Tomorrow’s moves</Label>
          {LEVELS.map(l => (
            <View key={l} style={{ gap: 6 }}>
              <Txt v="fine">{LEVEL_NAME[l]}</Txt>
              <Field value={moves[l]} onChangeText={v => setMoves(m => ({ ...m, [l]: v }))} multiline accessibilityLabel={`${LEVEL_NAME[l]} move`} style={{ paddingVertical: 12 }} />
            </View>
          ))}
        </View>
        <Btn title={n ? `Save ${n} to ${monthName(today)} evidence` : 'Sort at least one ticket'} disabled={!n} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
