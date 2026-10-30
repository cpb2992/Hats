import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { completeTask, recordFocus, reopenTask } from '../engine/actions';
import { hatName } from '../engine/hats';
import { winsOn } from '../engine/plan';
import { startFocusNotice, stopFocusNotice } from '../services/notifications';
import { useApp } from '../store/AppStore';
import { Btn, CircleBtn, Patch, Ring, success, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

/** Full-screen focus: one task, one gold ring, nothing else. Keeps time even if the phone sleeps. */
export default function FocusScreen() {
  useKeepAwake();
  const { id, max } = useLocalSearchParams<{ id?: string; max?: string }>();
  const { data, today, mutate, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const task = data.tasks.find(t => t.id === id) ?? null;
  const title = task?.title ?? 'Focus';
  const startMin = Number(max) > 0 ? Number(max) : (task?.minutes ?? 25);
  const startIso = useRef(new Date().toISOString());
  const [total, setTotal] = useState(() => startMin * 60000);
  const [endAt, setEndAt] = useState<number | null>(() => Date.now() + startMin * 60000);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const recorded = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (endAt) startFocusNotice(title, new Date(endAt)).catch(() => {});
    else stopFocusNotice().catch(() => {});
  }, [endAt, title]);

  useEffect(() => () => { stopFocusNotice().catch(() => {}); }, []);

  const left = pausedLeft ?? Math.max(0, (endAt ?? now) - now);
  const finished = left <= 0;
  const running = endAt != null && !finished;
  const elapsedMin = (total - left) / 60000;

  const record = useCallback(() => {
    if (recorded.current) return;
    recorded.current = true;
    const mins = elapsedMin;
    if (mins >= 1) mutate(d => recordFocus(d, task?.id ?? null, startIso.current, mins));
  }, [elapsedMin, mutate, task?.id]);

  const close = () => { record(); router.back(); };

  const done = () => {
    record();
    if (task) {
      const nowIso = new Date().toISOString();
      mutate(d => completeTask(d, task.id, nowIso));
      success();
      const n = winsOn(data, today).length + 1;
      const taskId = task.id;
      showToast(`${n} ${n === 1 ? 'win' : 'wins'} today`, { kind: 'win', action: { label: 'Undo', onPress: () => mutate(d => reopenTask(d, taskId)) } });
    }
    router.back();
  };

  const toggle = () => {
    if (finished) {
      setTotal(t => t + 5 * 60000);
      setPausedLeft(null);
      setEndAt(Date.now() + 5 * 60000);
      return;
    }
    if (running) { setPausedLeft(left); setEndAt(null); }
    else { setEndAt(Date.now() + (pausedLeft ?? left)); setPausedLeft(null); }
  };

  const secs = Math.ceil(left / 1000);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const state = finished ? 'time' : running ? 'focusing' : 'paused';

  return (
    <View style={{ flex: 1, backgroundColor: C.deep, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 24, alignItems: 'center' }}>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <CircleBtn icon="down" size={44} kind="quiet" label="Leave focus" onPress={close} />
        {task ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Patch hat={task.hat} size={22} />
            <Txt v="fine">{hatName(task.hat)}</Txt>
          </View>
        ) : <View />}
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 36, width: '100%' }}>
        <View accessibilityRole="timer" accessibilityLabel={`${clock} left`}>
          <Ring size={264} stroke={6} pct={total > 0 ? 1 - left / total : 0} track="rgba(255,255,255,0.07)">
            <Text style={{ fontFamily: F.display, fontSize: 68, lineHeight: 72, color: C.ink, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{clock}</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 12, letterSpacing: 2.4, color: C.ink2, textTransform: 'uppercase', marginTop: 4 }}>{state}</Text>
          </Ring>
        </View>
        <Txt v="title" center style={{ maxWidth: 320, fontSize: 24, lineHeight: 29 }}>{title}</Txt>
      </View>

      <View style={{ alignSelf: 'stretch', flexDirection: 'row', gap: 12, maxWidth: 520, width: '100%' }}>
        <Btn title={finished ? '+5 min' : running ? 'Pause' : 'Resume'} kind="ghost" onPress={toggle} style={{ flex: 1 }} />
        <Btn title="Done" onPress={done} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
