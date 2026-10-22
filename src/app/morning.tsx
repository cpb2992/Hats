import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { markPlanned, setDinner, setRecovery, setThawed, toggleThree } from '../engine/actions';
import { fmtLong } from '../engine/dates';
import { HATS } from '../engine/hats';
import { dayLog, isDeep, threeCandidates } from '../engine/plan';
import { openTime } from '../engine/schedule';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { BackLink, Btn, Card, Chip, Field, Label, Patch, Ring, Screen, tap, Txt } from '../ui/kit';
import { C, F, recoveryColor } from '../ui/theme';

function headline(r: number | null): string {
  if (r == null) return 'How recovered are you?';
  if (r >= 67) return 'Green day. Hard thing first.';
  if (r >= 34) return 'Steady day. One deep task, then quick wins.';
  return 'Low day. Quick wins only.';
}

export default function Morning() {
  const { data, today, mutate } = useApp();
  const log = dayLog(data, today);
  const [rec, setRec] = useState(log.recovery != null ? String(log.recovery) : '');
  const recovery = rec.trim() === '' ? null : Math.max(0, Math.min(100, Number(rec.replace(/\D/g, '')) || 0));
  const low = recovery != null && recovery < 34;
  const dinner = data.dinners[today];
  const candidates = threeCandidates(data, today, recovery).slice(0, 8);
  const picked = log.three.filter(id => data.tasks.some(t => t.id === id && !t.done)).length;
  const open = openTime(data.settings, today);
  const openTotal = open.reduce((n, o) => n + o.minutes, 0);

  const start = () => {
    mutate(d => { setRecovery(d, today, recovery); markPlanned(d, today); });
    router.replace('/');
  };

  return (
    <Screen tabBar={false}>
      <BackLink label="Hats" onPress={() => router.back()} />
      <View style={{ gap: 8 }}>
        <Txt v="fine">{fmtLong(today)}</Txt>
        <Txt v="display">Plan in two minutes.</Txt>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring size={74} stroke={5} pct={(recovery ?? 0) / 100} color={recoveryColor(recovery)}>
            <Text style={{ fontFamily: F.display, fontSize: 22, color: C.ink, fontVariant: ['tabular-nums'] }}>{recovery ?? '–'}</Text>
          </Ring>
          <View style={{ flex: 1, gap: 4 }}>
            <Label>Recovery</Label>
            <Txt v="h2">{headline(recovery)}</Txt>
          </View>
        </View>
        <Field value={rec} onChangeText={v => setRec(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Today’s WHOOP recovery, 0 to 100" accessibilityLabel="Today’s recovery percent" onBlur={() => mutate(d => setRecovery(d, today, recovery))} />
      </Card>

      {dinner ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!log.thawed }} onPress={() => { tap(); mutate(d => setThawed(d, today, !log.thawed)); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 70, paddingHorizontal: 18, borderRadius: 24, backgroundColor: log.thawed ? C.raised : C.goldSoft }, pressed && { opacity: 0.85 }]}>
          <Icon name="snow" size={24} color={log.thawed ? C.ink3 : C.gold} />
          <View style={{ flex: 1, gap: 3 }}>
            <Txt v="semi">{/^leftovers?$/i.test(dinner) ? 'Leftovers tonight' : log.thawed ? `${dinner} is thawing` : `Move the ${dinner.toLowerCase()} to the fridge`}</Txt>
            <Txt v="fine">{/^leftovers?$/i.test(dinner) ? 'Nothing to defrost.' : log.thawed ? 'Dinner is handled.' : 'Picked last night. Tap once it’s out.'}</Txt>
          </View>
          {log.thawed ? <Icon name="check" size={20} color={C.gold} width={2.4} /> : null}
        </Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          <Label>Tonight’s dinner</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {data.meals.map(m => <Chip key={m} label={m} onPress={() => mutate(d => setDinner(d, today, m))} />)}
          </View>
        </View>
      )}

      {open.length ? (
        <View style={{ gap: 10 }}>
          <Label right={`${openTotal} min`}>Your open time today</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {open.map(o => <Chip key={o.label} label={`${o.label} · ${o.minutes}`} />)}
          </View>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        <Label right={`${picked} of 3`}>Today’s three</Label>
        {candidates.length ? candidates.map((t, i) => {
          const on = log.three.includes(t.id);
          const dim = low && isDeep(t) && !on;
          return (
            <Pressable key={t.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => { tap(); mutate(d => { toggleThree(d, today, t.id); }); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 70, borderBottomWidth: i === candidates.length - 1 ? 0 : 1, borderBottomColor: C.line, opacity: dim ? 0.45 : 1 }, pressed && { opacity: 0.7 }]}>
              <Patch hat={t.hat} size={36} />
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="semi">{t.title}</Txt>
                <Txt v="fine">{HATS[t.hat].name} · {dim ? 'deep work, maybe tomorrow' : isDeep(t) ? 'deep work' : 'quick win'}</Txt>
              </View>
              <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: on ? C.gold : 'rgba(255,255,255,0.22)', backgroundColor: on ? C.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {on ? <Icon name="check" size={14} color={C.onGold} width={3.2} /> : null}
              </View>
            </Pressable>
          );
        }) : (
          <View style={{ gap: 12, paddingTop: 6 }}>
            <Txt v="sub">Nothing on today’s list yet. Get it out of your head first.</Txt>
            <Btn title="Say anything" icon="mic" kind="ghost" small onPress={() => router.push('/capture')} />
          </View>
        )}
      </View>

      <Btn title="Start my day" icon="next" onPress={start} />
    </Screen>
  );
}
