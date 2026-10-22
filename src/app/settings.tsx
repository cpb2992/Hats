import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { fmtTime, minutesOf, timeOf } from '../engine/dates';
import { HATS } from '../engine/hats';
import type { Chore, KidColor, Settings } from '../engine/types';
import { uid } from '../engine/util';
import { sendTestReminder } from '../services/notifications';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { BackLink, Btn, Card, Chip, Field, Label, Patch, Screen, Segmented, Stepper, tap, Txt } from '../ui/kit';
import { C, F, KID_COLORS } from '../ui/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES: { key: keyof Pick<Settings, 'morning' | 'schoolStart' | 'shutdown' | 'pickups' | 'bedtime' | 'gym'>; label: string }[] = [
  { key: 'morning', label: 'Morning plan nudge' },
  { key: 'schoolStart', label: 'School day starts' },
  { key: 'shutdown', label: 'Shutdown' },
  { key: 'pickups', label: 'Pickups' },
  { key: 'bedtime', label: 'Kids’ bedtime' },
  { key: 'gym', label: 'Gym window' },
];
const COLORS: KidColor[] = ['rose', 'teal', 'plum', 'ochre'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <Label>{title}</Label>
      <Card style={{ gap: 0, paddingVertical: 6 }}>{children}</Card>
    </View>
  );
}

function Line({ children, last }: { children: ReactNode; last?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>{children}</View>;
}

export default function SettingsScreen() {
  const { data, mutate, demo, startDemo, endDemo, eraseAll } = useApp();
  const s = data.settings;
  const [meal, setMeal] = useState('');
  const [kid, setKid] = useState('');
  const [chore, setChore] = useState('');
  const [choreKind, setChoreKind] = useState<Chore['kind']>('other');
  const [testNote, setTestNote] = useState<string | null>(null);
  const setS = (patch: Partial<Settings>) => mutate(d => { d.settings = { ...d.settings, ...patch }; });

  return (
    <Screen tabBar={false}>
      <BackLink label="Hats" onPress={() => router.back()} />
      <Txt v="display">Settings</Txt>

      <View style={{ gap: 12 }}>
        <Label>Your name</Label>
        <Field value={s.name} onChangeText={name => setS({ name })} placeholder="First name" accessibilityLabel="Your first name" autoCapitalize="words" />
      </View>

      <Section title="Hats you wear">
        {data.hats.map((h, i) => (
          <Line key={h.id} last={i === data.hats.length - 1}>
            <Patch hat={h.id} size={34} />
            <View style={{ flex: 1 }}>
              <Txt v="semi">{HATS[h.id].name}</Txt>
              <Txt v="fine">{HATS[h.id].meaning}</Txt>
            </View>
            <Switch value={h.on} onValueChange={on => mutate(d => { d.hats = d.hats.map(x => (x.id === h.id ? { ...x, on } : x)); })} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel={`Wear ${HATS[h.id].name}`} />
          </Line>
        ))}
      </Section>

      <Section title="Your day">
        {TIMES.map((t, i) => (
          <Line key={t.key} last={i === TIMES.length - 1}>
            <Txt v="semi" style={{ flex: 1 }}>{t.label}</Txt>
            <Stepper label={t.label} value={fmtTime(s[t.key], true)} onMinus={() => setS({ [t.key]: timeOf(minutesOf(s[t.key]) - 15) } as Partial<Settings>)} onPlus={() => setS({ [t.key]: timeOf(minutesOf(s[t.key]) + 15) } as Partial<Settings>)} />
          </Line>
        ))}
      </Section>

      <Btn title="Bell schedule" kind="quiet" icon="calendar" onPress={() => router.push('/schedule')} />

      <View style={{ gap: 12 }}>
        <Label>School days</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DAY_LETTERS.map((l, i) => {
            const on = s.workdays.includes(i);
            return (
              <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_NAMES[i]} onPress={() => { tap(); setS({ workdays: on ? s.workdays.filter(x => x !== i) : [...s.workdays, i].sort() }); }} style={{ flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.gold : 'rgba(255,255,255,0.06)' }}>
                <Text style={{ fontFamily: F.bold, fontSize: 14, color: on ? C.onGold : C.ink2 }}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Section title="Reminders">
        {([['morning', 'Morning plan, with the defrost reminder'], ['blocks', 'When a free block starts'], ['shutdown', 'Shutdown on school days'], ['tasks', 'Tasks with a time']] as const).map(([k, label], i) => (
          <Line key={k} last={i === 3}>
            <Txt v="semi" style={{ flex: 1 }}>{label}</Txt>
            <Switch value={s.notify[k]} onValueChange={v => setS({ notify: { ...s.notify, [k]: v } })} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel={label} />
          </Line>
        ))}
      </Section>
      <Btn title="Send a test reminder" kind="quiet" small icon="clock" onPress={async () => { const ok = await sendTestReminder(); setTestNote(ok ? 'Sent. It should arrive in a couple of seconds.' : 'Reminders are off for Hats. Turn on notifications for Hats in your phone’s settings.'); }} />
      {testNote ? <Txt v="fine">{testNote}</Txt> : null}

      <View style={{ gap: 12 }}>
        <Label>Kids’ board</Label>
        {data.kids.map(k => (
          <View key={k.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Change ${k.name}’s color`} onPress={() => mutate(d => { d.kids = d.kids.map(x => (x.id === k.id ? { ...x, color: COLORS[(COLORS.indexOf(x.color) + 1) % COLORS.length] } : x)); })} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: KID_COLORS[k.color]?.solid ?? C.raised2 }} />
            <Txt v="semi" style={{ flex: 1 }}>{k.name}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${k.name}`} hitSlop={8} onPress={() => mutate(d => { d.kids = d.kids.filter(x => x.id !== k.id); })}><Icon name="close" size={18} color={C.ink3} /></Pressable>
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field value={kid} onChangeText={setKid} placeholder="Add a kid’s first name" accessibilityLabel="Kid’s first name" style={{ flex: 1 }} autoCapitalize="words" />
          <Btn title="Add" small disabled={!kid.trim()} onPress={() => { const n = kid.trim(); mutate(d => { d.kids.push({ id: uid('k'), name: n, color: COLORS[d.kids.length % COLORS.length] }); }); setKid(''); }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Txt v="semi">Team star goal</Txt>
          <Stepper label="star goal" value={String(data.board.goal)} onMinus={() => mutate(d => { d.board = { ...d.board, goal: Math.max(5, d.board.goal - 5) }; })} onPlus={() => mutate(d => { d.board = { ...d.board, goal: Math.min(100, d.board.goal + 5) }; })} />
        </View>
        <Field value={data.board.reward} onChangeText={reward => mutate(d => { d.board = { ...d.board, reward }; })} placeholder="The reward" accessibilityLabel="Team reward" />
      </View>

      <View style={{ gap: 12 }}>
        <Label>Dinners to pick from</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {data.meals.map(m => <Chip key={m} label={`${m}  ×`} onPress={() => mutate(d => { d.meals = d.meals.filter(x => x !== m); })} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field value={meal} onChangeText={setMeal} placeholder="Add a dinner" accessibilityLabel="Dinner name" style={{ flex: 1 }} autoCapitalize="sentences" />
          <Btn title="Add" small disabled={!meal.trim()} onPress={() => { const m = meal.trim(); mutate(d => { if (!d.meals.includes(m)) d.meals.push(m); }); setMeal(''); }} />
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Label>Weekly rhythm</Label>
        {data.chores.map(c => (
          <View key={c.id} style={{ gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Txt v="semi" style={{ flex: 1 }}>{c.label}</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${c.label}`} hitSlop={8} onPress={() => mutate(d => { d.chores = d.chores.filter(x => x.id !== c.id); })}><Icon name="close" size={18} color={C.ink3} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {DAY_LETTERS.map((l, i) => {
                const on = c.days.includes(i);
                return (
                  <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${c.label} on ${DAY_NAMES[i]}`} onPress={() => { tap(); mutate(d => { d.chores = d.chores.map(x => (x.id === c.id ? { ...x, days: on ? x.days.filter(y => y !== i) : [...x.days, i].sort() } : x)); }); }} style={{ flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(242,193,78,0.18)' : 'rgba(255,255,255,0.04)' }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 12, color: on ? C.gold : C.ink3 }}>{l}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Segmented label="Kind" value={choreKind} onChange={setChoreKind} options={[{ value: 'laundry', label: 'Laundry' }, { value: 'bath', label: 'Baths' }, { value: 'other', label: 'Other' }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Field value={chore} onChangeText={setChore} placeholder="Add to the rhythm" accessibilityLabel="Rhythm item" style={{ flex: 1 }} autoCapitalize="sentences" />
          <Btn title="Add" small disabled={!chore.trim()} onPress={() => { const label = chore.trim(); mutate(d => { d.chores.push({ id: uid('c'), label, days: [], kind: choreKind }); }); setChore(''); }} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Label>Data</Label>
        <Txt v="fine">Everything is saved on this phone only. Student details are initials only.</Txt>
        {demo ? <Btn title="Leave sample data" kind="quiet" onPress={endDemo} /> : <Btn title="Look around with sample data" kind="quiet" onPress={() => { startDemo(); router.replace('/'); }} />}
        <Btn
          title="Erase everything"
          kind="ghost"
          icon="trash"
          onPress={() =>
            Alert.alert('Erase everything?', 'Tasks, students, Pulse sorts and settings are deleted from this phone. This can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Erase', style: 'destructive', onPress: () => { eraseAll(); router.replace('/welcome'); } },
            ])
          }
        />
      </View>
      <Txt v="fine" center>Hats {Constants.expoConfig?.version ?? '1.0.0'}</Txt>
    </Screen>
  );
}
