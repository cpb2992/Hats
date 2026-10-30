import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, Share, Switch, Text, TextInput, View } from 'react-native';
import { PRIVACY_URL, SHARE_MESSAGE, STORE_URL } from '../engine/links';
import { fmtTime, minutesOf, timeOf } from '../engine/dates';
import { dayWords, hatName, HATS } from '../engine/hats';
import { PACKS } from '../engine/packs';
import { choreTime } from '../engine/rhythm';
import type { Chore, HatId, KidColor, Settings } from '../engine/types';
import { uid } from '../engine/util';
import { sendTestReminder } from '../services/notifications';
import { WIDGETS } from '../widgets/render';
import { pinWidget, widgetsSupported } from '../widgets/update';
import { useApp } from '../store/AppStore';
import { ClaudeSection } from '../ui/AssistantSettings';
import { Icon } from '../ui/icons';
import { BackLink, Btn, Card, Chip, Field, Label, Patch, Screen, Segmented, Stepper, tap, Txt } from '../ui/kit';
import { C, F, KID_COLORS } from '../ui/theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES: { key: keyof Pick<Settings, 'morning' | 'schoolStart' | 'shutdown' | 'pickups' | 'bedtime' | 'gym'>; label: string }[] = [
  { key: 'morning', label: 'Morning plan nudge' },
  { key: 'schoolStart', label: 'School day starts' },
  { key: 'shutdown', label: 'Shutdown' },
  { key: 'pickups', label: 'Home by / pickups' },
  { key: 'bedtime', label: 'Bedtime routine' },
  { key: 'gym', label: 'Me time' },
];
const COLORS: KidColor[] = ['rose', 'teal', 'plum', 'ochre'];

/** When a rhythm item lands on a school day (or its first day). */
function choreWhen(c: Chore, s: Settings): string {
  const probe = c.days.find(d => s.workdays.includes(d)) ?? c.days[0];
  if (probe == null) return 'No days';
  const date = new Date(2026, 0, 4 + probe); // Jan 4, 2026 is a Sunday
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const t = choreTime(c, s, iso);
  return t ? fmtTime(t, true) : 'Anytime';
}

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
  const [renaming, setRenaming] = useState<HatId | null>(null);
  const [widgetNote, setWidgetNote] = useState<string | null>(null);
  const addWidget = async (name: string) => {
    const ok = await pinWidget(name);
    setWidgetNote(ok ? 'Your phone will ask where to put it.' : 'Long-press an empty spot on your home screen, tap Widgets, then find Hats.');
  };
  const words = dayWords(data.hats);
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
            <Pressable accessibilityRole="button" accessibilityLabel={`Open the ${hatName(h.id)} pack`} onPress={() => { tap(); router.push(`/pack/${h.id}`); }} hitSlop={6}>
              <Patch hat={h.id} size={34} />
            </Pressable>
            <View style={{ flex: 1 }}>
              {renaming === h.id ? (
                <TextInput
                  autoFocus
                  value={h.name}
                  onChangeText={name => mutate(d => { d.hats = d.hats.map(x => (x.id === h.id ? { ...x, name: name.slice(0, 20) } : x)); })}
                  onBlur={() => { setRenaming(null); mutate(d => { d.hats = d.hats.map(x => (x.id === h.id && !x.name.trim() ? { ...x, name: HATS[h.id].name } : x)); }); }}
                  onSubmitEditing={() => setRenaming(null)}
                  returnKeyType="done"
                  selectionColor={C.gold}
                  accessibilityLabel={`Name for ${HATS[h.id].name}`}
                  style={{ fontFamily: F.semi, fontSize: 16, color: C.ink, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: C.gold }}
                />
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={`Rename ${hatName(h.id)}`} onPress={() => setRenaming(h.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt v="semi">{hatName(h.id)}</Txt>
                  <Icon name="edit" size={13} color={C.ink3} />
                </Pressable>
              )}
              <Txt v="fine">{HATS[h.id].meaning} · {PACKS[h.id].title}</Txt>
            </View>
            <Switch value={h.on} onValueChange={on => mutate(d => { if (!on && d.hats.filter(x => x.on).length <= 1) return; d.hats = d.hats.map(x => (x.id === h.id ? { ...x, on } : x)); })} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel={`Wear ${hatName(h.id)}`} />
          </Line>
        ))}
        <Txt v="fine">Tap a name to rename it, like “Science” or “Night shift”. Tap a patch to open that hat’s pack.</Txt>
      </Section>

      <Section title="Your day">
        {TIMES.map((t, i) => (
          <Line key={t.key} last={i === TIMES.length - 1}>
            <Txt v="semi" style={{ flex: 1 }}>{t.key === 'schoolStart' ? `${words.Day} day starts` : t.label}</Txt>
            <Stepper label={t.label} value={fmtTime(s[t.key], true)} onMinus={() => setS({ [t.key]: timeOf(minutesOf(s[t.key]) - 15) } as Partial<Settings>)} onPlus={() => setS({ [t.key]: timeOf(minutesOf(s[t.key]) + 15) } as Partial<Settings>)} />
          </Line>
        ))}
      </Section>

      <Btn title={words.schedule} kind="quiet" icon="calendar" onPress={() => router.push('/schedule')} />

      <View style={{ gap: 12 }}>
        <Label>{`${words.Day} days`}</Label>
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
        {([['morning', 'Morning plan, with the defrost reminder'], ['blocks', 'When a free block starts'], ['shutdown', `Shutdown on ${words.day} days`], ['tasks', 'Tasks with a time'], ['events', 'Calendar events, 15 minutes before']] as const).map(([k, label], i) => (
          <Line key={k} last={i === 4}>
            <Txt v="semi" style={{ flex: 1 }}>{label}</Txt>
            <Switch value={s.notify[k]} onValueChange={v => setS({ notify: { ...s.notify, [k]: v } })} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel={label} />
          </Line>
        ))}
      </Section>
      <Btn title="Send a test reminder" kind="quiet" small icon="clock" onPress={async () => { const ok = await sendTestReminder(); setTestNote(ok ? 'Sent. It should arrive in a couple of seconds.' : 'Reminders are off for Hats. Turn on notifications for Hats in your phone’s settings.'); }} />
      {testNote ? <Txt v="fine">{testNote}</Txt> : null}

      <ClaudeSection />

      {widgetsSupported ? (
        <Section title="Home-screen widgets">
          {([[WIDGETS.now, 'Now', 'Your one thing, with Focus and Done'], [WIDGETS.log, 'Caseload +1', 'Log a data point without opening Hats'], [WIDGETS.say, 'Say anything', 'One tap to capture out loud']] as const).map(([name, title, sub], i) => (
            <Line key={name} last={i === 2}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt v="semi">{title}</Txt>
                <Txt v="fine">{sub}</Txt>
              </View>
              <Btn title="Add" small kind="quiet" onPress={() => addWidget(name)} accessibilityLabel={`Add the ${title} widget`} />
            </Line>
          ))}
        </Section>
      ) : null}
      {widgetNote ? <Txt v="fine">{widgetNote}</Txt> : null}

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
        <Txt v="fine">Each one becomes a Home task on its day: laundry after pickups, baths an hour before bedtime. Tap a name to change it, like turning “kid 1” into a name.</Txt>
        {data.chores.map(c => (
          <View key={c.id} style={{ gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput value={c.label} onChangeText={label => mutate(d => { d.chores = d.chores.map(x => (x.id === c.id ? { ...x, label } : x)); })} accessibilityLabel={`Rename ${c.label}`} selectionColor={C.gold} style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: C.ink, paddingVertical: 6 }} />
              <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3 }}>{choreWhen(c, s)}</Text>
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
      <View style={{ gap: 12 }}>
        <Label>Spread the word</Label>
        <Btn title="Tell a friend about Hats" kind="quiet" icon="share" onPress={() => { Share.share({ message: SHARE_MESSAGE }).catch(() => {}); }} />
        <Btn title="Rate Hats" kind="quiet" icon="star" onPress={() => { Linking.openURL(STORE_URL).catch(() => {}); }} />
        <Btn title="Privacy policy" kind="quiet" icon="lock" onPress={() => { Linking.openURL(PRIVACY_URL).catch(() => {}); }} />
      </View>
      <Txt v="fine" center>Hats {Constants.expoConfig?.version ?? '1.0.0'}{Constants.expoConfig?.extra?.build ? ` · build ${Constants.expoConfig.extra.build}` : ''}</Txt>
    </Screen>
  );
}
