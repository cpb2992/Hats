import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addParsed } from '../engine/actions';
import { fmtRelative, fmtTime } from '../engine/dates';
import { HATS } from '../engine/hats';
import { parseMany } from '../engine/parse';
import type { HatId } from '../engine/types';
import { abortListening, speechAvailable, startListening, stopListening, useSpeechRecognitionEvent } from '../services/speech';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { Btn, CircleBtn, Field, Patch, Segmented, success, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

function Pulse({ active }: { active: boolean }) {
  const [rings] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));
  useEffect(() => {
    if (!active) { rings.forEach(r => r.setValue(0)); return; }
    const loops = rings.map((r, i) =>
      Animated.loop(Animated.sequence([Animated.delay(i * 800), Animated.timing(r, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true })])),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [active, rings]);
  return (
    <>
      {rings.map((r, i) => (
        <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: C.gold, opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.4] }) }] }} />
      ))}
    </>
  );
}

export default function CaptureScreen() {
  const { data, today, mutate, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const canSpeak = useMemo(() => Platform.OS !== 'web' && speechAvailable(), []);
  const [mode, setMode] = useState<'say' | 'type'>(canSpeak ? 'say' : 'type');
  const [said, setSaid] = useState('');
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [hatOverride, setHatOverride] = useState<Record<number, HatId>>({});
  const [skip, setSkip] = useState<number[]>([]);

  const enabled = data.hats.filter(h => h.on).map(h => h.id);
  const fallbackHat: HatId = enabled[0] ?? 'teacher';
  const known = useMemo(() => data.students.map(s => s.initials), [data.students]);
  const source = mode === 'say' ? `${said}${interim ? ` ${interim}` : ''}`.trim() : typed;
  const items = useMemo(() => parseMany(source, today, known), [source, today, known]);

  useSpeechRecognitionEvent('start', () => { setListening(true); setVoiceError(null); });
  useSpeechRecognitionEvent('end', () => { setListening(false); setInterim(''); });
  useSpeechRecognitionEvent('result', e => {
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) { setSaid(s => (s ? `${s} ${text}` : text).trim()); setInterim(''); }
    else setInterim(text);
  });
  useSpeechRecognitionEvent('error', e => {
    setListening(false);
    if (e.error === 'no-speech' || e.error === 'speech-timeout' || e.error === 'aborted') return;
    setVoiceError(e.error === 'not-allowed' ? 'Hats needs the microphone to listen. You can allow it in Settings, or type instead.' : 'Voice didn’t work just now. Try again, or type it.');
  });

  const listen = async () => {
    tap();
    if (listening) { stopListening(); return; }
    const ok = await startListening().catch(() => false);
    if (!ok) setVoiceError('Hats needs the microphone to listen. You can allow it in Settings, or type instead.');
  };

  // Start listening once when the sheet opens in Say mode.
  useEffect(() => {
    if (canSpeak) startListening().then(ok => { if (!ok) setVoiceError('Hats needs the microphone to listen. You can allow it in Settings, or type instead.'); }).catch(() => {});
    return () => abortListening();
  }, [canSpeak]);

  const keep = items.map((p, i) => ({ p, i })).filter(x => !skip.includes(x.i));
  const add = () => {
    if (!keep.length) return;
    abortListening();
    const nowIso = new Date().toISOString();
    mutate(d => addParsed(d, keep.map(({ p, i }) => ({ ...p, hat: hatOverride[i] ?? (p.hat && enabled.includes(p.hat) ? p.hat : fallbackHat) })), nowIso));
    success();
    showToast(keep.length === 1 ? 'Added to Hats' : `Added ${keep.length} to Hats`);
    router.back();
  };

  const cycleHat = (i: number, current: HatId) => {
    tap();
    const list = enabled.length ? enabled : (['teacher'] as HatId[]);
    const next = list[(list.indexOf(current) + 1) % list.length];
    setHatOverride(o => ({ ...o, [i]: next }));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 }}>
          <View style={{ width: 190 }}>
            <Segmented label="Capture mode" value={mode} onChange={m => { if (m === 'type') abortListening(); setMode(m); setHatOverride({}); setSkip([]); }} options={[{ value: 'say', label: 'Say' }, { value: 'type', label: 'Type' }]} />
          </View>
          <CircleBtn icon="close" size={44} kind="quiet" label="Close" onPress={() => { abortListening(); router.back(); }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {mode === 'say' ? (
            <View style={{ gap: 26 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Start listening'} onPress={canSpeak ? listen : undefined} style={{ alignSelf: 'center', width: 140, height: 140, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                <Pulse active={listening} />
                <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: listening ? C.gold : C.raised2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="mic" size={32} color={listening ? C.onGold : C.gold} width={2} />
                </View>
              </Pressable>
              {!canSpeak ? <Txt v="sub" center>Voice isn’t available on this device. Tap Type instead.</Txt> : null}
              {voiceError ? <Txt v="sub" center color={C.rust}>{voiceError}</Txt> : null}
              <Text style={{ fontFamily: F.displayMed, fontSize: 24, lineHeight: 31, color: source ? C.ink : C.ink3, letterSpacing: -0.3 }}>
                {source ? `“${source}”` : listening ? 'Listening. Say it the way your brain works.' : 'Tap the mic and talk. Hats sorts it into hats.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <Field big autoFocus multiline value={typed} onChangeText={setTyped} placeholder="IEP meeting for A.R. Nov 2 at 2:45" accessibilityLabel="Type a task" returnKeyType="done" blurOnSubmit onSubmitEditing={add} />
              <Txt v="fine">Commas or new lines make separate tasks. Dates, times, minutes and initials are picked up as you type.</Txt>
            </View>
          )}

          {items.length ? (
            <View style={{ gap: 4 }}>
              <Txt v="label">{keep.length === 1 ? '1 task' : `${keep.length} tasks`} · tap a patch to change its hat</Txt>
              {items.map((p, i) => {
                if (skip.includes(i)) return null;
                const hat = hatOverride[i] ?? (p.hat && enabled.includes(p.hat) ? p.hat : fallbackHat);
                const bits = [HATS[hat].name];
                if (p.date) bits.push(fmtRelative(p.date, today));
                if (p.time) bits.push(fmtTime(p.time, true));
                if (p.minutes) bits.push(`${p.minutes} min`);
                if (p.student) bits.push(p.student);
                return (
                  <View key={`${i}-${p.title}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 66, borderBottomWidth: 1, borderBottomColor: C.line }}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Change hat, now ${HATS[hat].name}`} onPress={() => cycleHat(i, hat)} hitSlop={6}>
                      <Patch hat={hat} size={44} />
                    </Pressable>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 20, color: C.ink }}>{p.title}</Text>
                      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.ink2 }}>{bits.join(' · ')}{!p.hat && !hatOverride[i] ? ' · best guess' : ''}</Text>
                    </View>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${p.title}`} hitSlop={8} onPress={() => { tap(); setSkip(s => [...s, i]); }} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="close" size={16} color={C.ink3} width={2} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 10, gap: 10 }}>
          {mode === 'say' && said ? <Btn title="Start over" kind="quiet" small onPress={() => { setSaid(''); setInterim(''); setSkip([]); setHatOverride({}); }} /> : null}
          <Btn title={keep.length > 1 ? `Add ${keep.length} to Hats` : 'Add to Hats'} disabled={!keep.length} onPress={add} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
