import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { completeTask, reopenTask } from '../engine/actions';
import { fmtRelative } from '../engine/dates';
import { ALL_HATS, HATS } from '../engine/hats';
import { doneOn, queue } from '../engine/plan';
import type { HatId, Task } from '../engine/types';
import { useApp } from '../store/AppStore';
import { BackLink, Chip, Label, Screen, Segmented, Txt } from '../ui/kit';
import { TaskRow } from '../ui/TaskRow';

type View_ = 'today' | 'upcoming' | 'done';

export default function TasksScreen() {
  const { data, today, nowMin, mutate } = useApp();
  const [tab, setTab] = useState<View_>('today');
  const [hat, setHat] = useState<HatId | 'all'>('all');
  const match = (t: Task) => hat === 'all' || t.hat === hat;
  const toggle = (t: Task) => { const nowIso = new Date().toISOString(); mutate(d => (t.done ? reopenTask(d, t.id) : completeTask(d, t.id, nowIso))); };

  const todayList = queue(data, today, nowMin).filter(match);
  const upcoming = data.tasks.filter(t => !t.done && t.date && t.date > today && match(t)).sort((a, b) => (a.date! + (a.time ?? '')).localeCompare(b.date! + (b.time ?? '')));
  const done = data.tasks.filter(t => t.done && match(t)).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')).slice(0, 60);

  const groups: { label: string; items: Task[] }[] = [];
  for (const t of upcoming) {
    const label = fmtRelative(t.date!, today);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(t); else groups.push({ label, items: [t] });
  }

  return (
    <Screen tabBar={false}>
      <BackLink label="Hats" onPress={() => router.back()} />
      <Txt v="display">All tasks</Txt>
      <Segmented label="Show" value={tab} onChange={setTab} options={[{ value: 'today', label: `Today · ${queue(data, today, nowMin).length}` }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Done' }]} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All hats" on={hat === 'all'} onPress={() => setHat('all')} />
        {ALL_HATS.map(h => <Chip key={h} label={HATS[h].name} dot={HATS[h].color} on={hat === h} onPress={() => setHat(h)} />)}
      </ScrollView>

      {tab === 'today' ? (
        todayList.length ? <View>{todayList.map((t, i) => <TaskRow key={t.id} task={t} today={today} last={i === todayList.length - 1} onDone={() => toggle(t)} />)}</View>
          : <Txt v="sub">Nothing open today{hat !== 'all' ? ` under ${HATS[hat].name}` : ''}.</Txt>
      ) : null}

      {tab === 'upcoming' ? (
        groups.length ? groups.map(g => (
          <View key={g.label} style={{ gap: 4 }}>
            <Label>{g.label}</Label>
            <View>{g.items.map((t, i) => <TaskRow key={t.id} task={t} today={today} last={i === g.items.length - 1} onDone={() => toggle(t)} />)}</View>
          </View>
        )) : <Txt v="sub">Nothing scheduled ahead. Anything with a future date shows up here, out of today’s way.</Txt>
      ) : null}

      {tab === 'done' ? (
        done.length ? (
          <View>
            {done.map((t, i) => <TaskRow key={t.id} task={t} today={today} last={i === done.length - 1} onDone={() => toggle(t)} />)}
            <Txt v="fine" style={{ marginTop: 12 }}>{data.tasks.filter(t => doneOn(t, today)).length} done today.</Txt>
          </View>
        ) : <Txt v="sub">Wins show up here.</Txt>
      ) : null}
    </Screen>
  );
}
