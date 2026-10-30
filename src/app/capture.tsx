import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkActions, describeWhen, readWithoutClaude, type Action, type Situation } from '../engine/assistant';
import { hatName } from '../engine/hats';
import { understand } from '../services/assistant';
import { runActions, type Outcome } from '../services/runner';
import { getClaudeKey } from '../services/secrets';
import { abortListening, speechAvailable, startListening, stopListening, useSpeechRecognitionEvent } from '../services/speech';
import { useApp } from '../store/AppStore';
import { Icon, type IconName } from '../ui/icons';
import { Btn, CircleBtn, Field, Segmented, success, tap, Txt } from '../ui/kit';
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

/** How Hats read it, before anything happens (used when Claude isn't set up). */
function previewLine(a: Action, today: string): { icon: IconName; title: string; detail: string } {
  switch (a.kind) {
    case 'event': return { icon: 'calendar', title: a.title, detail: `Calendar · ${a.allDay ? describeWhen(a.date, null, today) : describeWhen(a.date, a.start, today)}` };
    case 'task': return { icon: 'check', title: a.title, detail: `${hatName(a.hat)}${a.time ? ` · reminder ${describeWhen(a.date, a.time, today)}` : a.date ? ` · ${describeWhen(a.date, null, today)}` : ''}` };
    case 'log': return { icon: 'people', title: `Log ${a.goalKind === 'trials' ? `${a.value} of ${a.outOf}` : `+${a.value}`} for ${a.initials}`, detail: 'Caseload' };
    case 'done': return { icon: 'check', title: a.title, detail: 'Check off' };
    case 'move': return { icon: 'calendar', title: a.title, detail: `Move to ${describeWhen(a.date, a.start, today)}` };
    case 'cancel': return { icon: 'trash', title: a.title, detail: 'Delete from calendar' };
  }
}

function Row({ icon, title, detail, state, action, onPress }: { icon: IconName; title: string; detail: string; state?: Outcome['state']; action?: React.ReactNode; onPress?: () => void }) {
  const dim = state === 'undone' || state === 'failed';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 66, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: state === 'failed' ? 'rgba(255,255,255,0.04)' : C.goldSoft }}>
        <Icon name={icon} size={19} color={dim ? C.ink3 : C.gold} width={2} />
      </View>
      <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 20, color: dim ? C.ink3 : C.ink, textDecorationLine: state === 'undone' ? 'line-through' : 'none' }}>{title}</Text>
        <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.ink2 }}>{state === 'undone' ? 'Undone' : detail}</Text>
      </Pressable>
      {action}
    </View>
  );
}

export default function CaptureScreen() {
  const { data, today, nowMin, mutate, recent, setRecent } = useApp();
  const insets = useSafeAreaInsets();
  const canSpeak = useMemo(() => Platform.OS !== 'web' && speechAvailable(), []);
  const [mode, setMode] = useState<'say' | 'type'>(canSpeak ? 'say' : 'type');
  const [said, setSaid] = useState('');
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'input' | 'working' | 'results'>('input');
  const [key, setKey] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  useEffect(() => { getClaudeKey().then(setKey).catch(() => {}); }, []);

  const source = mode === 'say' ? `${said}${interim ? ` ${interim}` : ''}`.trim() : typed.trim();
  const situation: Situation = { data, today, nowMin, recent };
  // Without Claude, show how the rule-based reader will handle it before anything happens.
  const preview = useMemo(() => (key || !source ? [] : checkActions(readWithoutClaude(source, situation).actions, situation).actions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, source, data, today]);

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

  const go = async () => {
    if (!source || phase === 'working') return;
    abortListening();
    setListening(false);
    setPhase('working');
    const result = await understand(source, situation, key);
    const done = runActions(result.actions, { mutate, today });
    setReply(result.reply);
    setNotes(result.notes);
    setFallback(result.fallbackReason ?? null);
    setOutcomes(done);
    setRecent(done.flatMap(o => (o.recent && o.state === 'done' ? [o.recent] : [])));
    if (done.length) success();
    setPhase('results');
  };

  const undo = (o: Outcome) => {
    tap();
    o.undo?.();
    setOutcomes(list => list.map(x => (x.key === o.key ? { ...x, state: 'undone' } : x)));
  };

  const again = () => {
    setSaid(''); setInterim(''); setTyped(''); setOutcomes([]); setNotes([]); setReply(''); setFallback(null);
    setPhase('input');
    if (mode === 'say' && canSpeak) startListening().catch(() => {});
  };

  const close = () => { abortListening(); router.back(); };

  if (phase !== 'input') {
    return (
      <View style={{ flex: 1, backgroundColor: C.deep, paddingTop: insets.top + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Txt v="fine">{phase === 'working' ? (key ? 'Claude is on it' : 'Sorting it out') : 'Done'}</Txt>
          <CircleBtn icon="close" size={44} kind="quiet" label="Close" onPress={close} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
          <Text style={{ fontFamily: F.med, fontSize: 15, lineHeight: 21, color: C.ink3 }}>“{source}”</Text>
          {phase === 'working' ? (
            <View style={{ alignItems: 'center', paddingVertical: 40, gap: 14 }}>
              <ActivityIndicator color={C.gold} size="large" />
              <Txt v="sub" center>Checking your schedule and calendar…</Txt>
            </View>
          ) : (
            <>
              <Txt v="h2">{reply}</Txt>
              {fallback ? <Txt v="fine" color={C.gold}>{fallback} Hats read it on its own instead.</Txt> : null}
              {notes.map((n, i) => <Txt key={i} v="fine" color={C.gold}>{n}</Txt>)}
              <View>
                {outcomes.map(o => (
                  <Row
                    key={o.key}
                    icon={o.icon}
                    title={o.title}
                    detail={o.detail}
                    state={o.state}
                    onPress={o.state === 'done' && o.href ? () => { tap(); router.push(o.href as never); } : undefined}
                    action={o.state === 'done' && o.undo ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Undo ${o.title}`} onPress={() => undo(o)} hitSlop={8} style={{ paddingHorizontal: 12, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.ink2 }}>Undo</Text>
                      </Pressable>
                    ) : null}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>
        {phase === 'results' ? (
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 10 }}>
            <Btn title="Say more" icon="mic" kind="quiet" onPress={again} style={{ flex: 1 }} />
            <Btn title="Done" onPress={close} style={{ flex: 1 }} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: C.deep }}>
      <View style={{ flex: 1, paddingTop: insets.top + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, gap: 12 }}>
          <View style={{ width: 190 }}>
            <Segmented label="Capture mode" value={mode} onChange={m => { if (m === 'type') abortListening(); setMode(m); }} options={[{ value: 'say', label: 'Say' }, { value: 'type', label: 'Type' }]} />
          </View>
          <CircleBtn icon="close" size={44} kind="quiet" label="Close" onPress={close} />
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
                {source ? `“${source}”` : listening ? 'Listening. Say it the way your brain works.' : 'Tap the mic and talk.'}
              </Text>
            </View>
          ) : (
            <Field big autoFocus multiline value={typed} onChangeText={setTyped} placeholder="IEP meeting for J.M. Thursday at 9:30, and print the agenda" accessibilityLabel="Type what you need" returnKeyType="go" submitBehavior="blurAndSubmit" onSubmitEditing={go} />
          )}

          {key ? (
            <Txt v="fine">Meetings and appointments go on your Hats calendar, to-dos go on your list, and “4 of 5 for J.S.” logs data. Claude reads it against your schedule when you tap Go.</Txt>
          ) : preview.length ? (
            <View style={{ gap: 4 }}>
              <Txt v="label">Hats will</Txt>
              {preview.map((a, i) => { const p = previewLine(a, today); return <Row key={i} icon={p.icon} title={p.title} detail={p.detail} />; })}
            </View>
          ) : (
            <Txt v="fine">Meetings and appointments go on your Hats calendar, to-dos go on your list, and “4 of 5 for J.S.” logs data. Add a Claude key in Settings and Hats understands much more.</Txt>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20, paddingTop: 10, gap: 10 }}>
          {mode === 'say' && said ? <Btn title="Start over" kind="quiet" small onPress={() => { setSaid(''); setInterim(''); }} /> : null}
          <Btn title="Go" icon="next" disabled={!source} onPress={go} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
