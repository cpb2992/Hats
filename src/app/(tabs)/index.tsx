import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { completeTask, logPoint, notNow, reopenTask, undoPoint } from '../../engine/actions';
import { fmtTime, greeting, minutesOf, weekday } from '../../engine/dates';
import { HATS } from '../../engine/hats';
import { dayLog, dayTimeline, queue, winsOn } from '../../engine/plan';
import { currentBlock, isTeaching, minutesLeft, nextFree } from '../../engine/schedule';
import type { Block, Student } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Icon } from '../../ui/icons';
import { Btn, Cap, Card, CircleBtn, InitialsPatch, Label, Patch, Ring, Screen, success, tap, thud, Txt, useWide } from '../../ui/kit';
import { AllClearSpot } from '../../ui/spots';
import { TaskRow } from '../../ui/TaskRow';
import { C, F, recoveryColor } from '../../ui/theme';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function BlockBar({ block, nowMin }: { block: Block; nowMin: number }) {
  const total = minutesOf(block.end) - minutesOf(block.start);
  const pct = total > 0 ? (nowMin - minutesOf(block.start)) / total : 0;
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <View style={{ height: 4, borderRadius: 2, width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`, backgroundColor: C.gold }} />
    </View>
  );
}

export default function NowScreen() {
  const { data, today, nowMin, mutate, showToast } = useApp();
  const wide = useWide();
  const [showEarlier, setShowEarlier] = useState(false);
  const s = data.settings;
  const q = queue(data, today, nowMin);
  const now = q[0] ?? null;
  const next = q.slice(1, 5);
  const more = Math.max(0, q.length - 5);
  const log = dayLog(data, today);
  const wins = winsOn(data, today);
  const block = currentBlock(s, today, nowMin);
  const teaching = isTeaching(block);
  const free = block?.kind === 'free' ? block : null;
  const upcomingFree = nextFree(s, today, nowMin);
  const timeline = dayTimeline(data, today, nowMin, now?.id);
  const earlier = timeline.filter(i => i.past && !(i.kind === 'block' && i.current));
  const visible = showEarlier ? timeline : timeline.filter(i => !i.past || (i.kind === 'block' && i.current));
  const work = s.workdays.includes(weekday(today));
  const name = s.name.trim();
  const d = new Date(`${today}T12:00:00`);
  const freeLeft = free ? minutesLeft(free, nowMin) : null;
  const focusMin = now ? (freeLeft != null ? Math.max(5, Math.min(now.minutes, freeLeft)) : now.minutes) : 0;
  const roster: Student[] = block?.section ? data.students.filter(st => st.period.toUpperCase() === block.section!.toUpperCase()) : [];

  const done = (id: string) => {
    const nowIso = new Date().toISOString();
    mutate(x => completeTask(x, id, nowIso));
    success();
    const n = wins.length + 1;
    showToast(`${n} ${n === 1 ? 'win' : 'wins'} today`, { kind: 'win', action: { label: 'Undo', onPress: () => mutate(x => reopenTask(x, id)) } });
  };

  const quickLog = (st: Student) => {
    const g = st.goals[0];
    if (!g) { router.push(`/student/${st.id}`); return; }
    if (g.kind === 'trials') { router.push(`/student/${st.id}`); return; }
    thud();
    mutate(x => logPoint(x, st.id, g.id, today, 1));
    showToast(`Logged for ${st.initials}`, { action: { label: 'Undo', onPress: () => mutate(x => undoPoint(x, st.id, g.id, today)) } });
  };

  const header = (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="All tasks" onPress={() => { tap(); router.push('/tasks'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Cap width={26} />
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ink2 }}>{DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={log.recovery != null ? `Recovery ${log.recovery}. Open the morning plan` : 'Open the morning plan'} onPress={() => { tap(); router.push('/morning'); }} hitSlop={6}>
            <Ring size={38} stroke={3} pct={(log.recovery ?? 0) / 100} color={recoveryColor(log.recovery)}>
              {log.recovery != null ? <Text style={{ fontFamily: F.bold, fontSize: 11, color: C.ink, fontVariant: ['tabular-nums'] }}>{log.recovery}</Text> : <Icon name="plus" size={14} color={C.ink2} width={2} />}
            </Ring>
          </Pressable>
          <CircleBtn icon="settings" size={40} kind="quiet" label="Settings" onPress={() => router.push('/settings')} />
        </View>
      </View>
      <Txt v="hero">{greeting(nowMin)}{name ? `,\n${name}.` : '.'}</Txt>
    </View>
  );

  const planCard = work && !log.planned && nowMin < 12 * 60 && !teaching ? (
    <Card onPress={() => router.push('/morning')} accessibilityLabel="Plan your day in two minutes" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, backgroundColor: C.goldSoft }}>
      <Icon name="focus" size={24} color={C.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="semi">Plan in two minutes</Txt>
        <Txt v="fine">Recovery, dinner, and today’s three.</Txt>
      </View>
      <Icon name="chevron" size={20} color={C.gold} />
    </Card>
  ) : null;

  // Teaching: the next step is the class in front of you. Tasks wait for the next free block.
  const classCard = block && teaching ? (
    <Card style={{ gap: 16, padding: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="label" color={C.gold}>{block.kind === 'homeroom' ? 'Homeroom' : block.kind === 'advisory' ? 'Advisory' : 'In class'}</Txt>
        <Txt v="fine">until {fmtTime(block.end)} · {minutesLeft(block, nowMin)} min</Txt>
      </View>
      <Txt v="title">{block.label}</Txt>
      <BlockBar block={block} nowMin={nowMin} />
      {roster.length ? (
        <View style={{ gap: 10 }}>
          <Txt v="fine">Saw a goal happen? Tap to log.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {roster.slice(0, 8).map(st => (
              <Pressable key={st.id} accessibilityRole="button" accessibilityLabel={`Log for ${st.initials}`} onPress={() => quickLog(st)} style={({ pressed }) => [{ alignItems: 'center', gap: 4 }, pressed && { transform: [{ scale: 0.92 }] }]}>
                <InitialsPatch initials={st.initials} size={52} />
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: C.ink2 }}>{st.goals[0]?.kind === 'trials' ? `/${st.goals[0].outOf}` : '+1'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
      {now ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Next task: ${now.title}`} onPress={() => { tap(); router.push(`/task/${now.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line }}>
          <Patch hat={now.hat} size={28} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="fine">{upcomingFree ? `Waiting for ${upcomingFree.label.split(' · ')[0]} at ${fmtTime(upcomingFree.start)}` : 'Up after school'}</Txt>
            <Txt v="semi" numberOfLines={2}>{now.title}</Txt>
          </View>
        </Pressable>
      ) : null}
    </Card>
  ) : null;

  const meetingCard = block && block.kind === 'meeting' ? (
    <Card style={{ gap: 14, padding: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="label" color={C.gold}>Meeting</Txt>
        <Txt v="fine">until {fmtTime(block.end)}</Txt>
      </View>
      <Txt v="title">{block.label}</Txt>
      <BlockBar block={block} nowMin={nowMin} />
      <Btn title="Catch an action item" icon="mic" kind="ghost" small onPress={() => router.push('/capture')} />
    </Card>
  ) : null;

  const breakStrip = block && block.kind === 'break' ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.gold }} />
      <Txt v="fine">{block.label} until {fmtTime(block.end)}</Txt>
    </View>
  ) : null;

  const nowCard = teaching ? null : now ? (
    <Card style={{ gap: 20, padding: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="label" color={C.gold}>{free ? `Now · ${freeLeft} min free` : 'Now'}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Patch hat={now.hat} size={22} />
          <Txt v="fine">{HATS[now.hat].name}{now.time ? ` · ${fmtTime(now.time)}` : ''}{now.student ? ` · ${now.student}` : ''}</Txt>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${now.title}`} onPress={() => { tap(); router.push(`/task/${now.id}`); }}>
        <Txt v="title">{now.title}</Txt>
      </Pressable>
      {free ? <BlockBar block={free} nowMin={nowMin} /> : null}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Btn title={`Focus · ${focusMin} min`} icon="play" onPress={() => router.push(`/focus?id=${now.id}&max=${focusMin}`)} style={{ flex: 1 }} />
        <CircleBtn icon="check" label="Done" onPress={() => done(now.id)} />
        <CircleBtn icon="next" label="Not now" onPress={() => { const nowIso = new Date().toISOString(); mutate(x => notNow(x, now.id, nowIso)); }} />
      </View>
    </Card>
  ) : (
    <Card style={{ alignItems: 'center', paddingVertical: 26 }}>
      <AllClearSpot size={150} />
      <Txt v="title" center>All clear.</Txt>
      <Txt v="sub" center>{wins.length ? `${wins.length} done today. Nothing else needs you.` : 'Nothing needs you right now.'}</Txt>
      <Btn title="Say anything" icon="mic" kind="ghost" small onPress={() => router.push('/capture')} />
    </Card>
  );

  const upNext = next.length && !teaching ? (
    <View style={{ gap: 6 }}>
      <Label right={more ? `+${more} more` : undefined}>Up next</Label>
      <View>
        {next.map((t, i) => <TaskRow key={t.id} task={t} today={today} last={i === next.length - 1} onDone={() => done(t.id)} />)}
      </View>
    </View>
  ) : null;

  const rowStyle = (last: boolean) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 52, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line });
  const day = (
    <View style={{ gap: 6 }}>
      <Label right={wins.length ? `${wins.length} done` : undefined}>Today</Label>
      {earlier.length ? (
        <Pressable accessibilityRole="button" onPress={() => { tap(); setShowEarlier(v => !v); }} style={{ minHeight: 40, justifyContent: 'center' }}>
          <Txt v="fine" color={C.ink3}>{showEarlier ? 'Hide earlier' : `${earlier.length} earlier · show`}</Txt>
        </Pressable>
      ) : null}
      <View>
        {visible.map((item, i) => {
          const last = i === visible.length - 1;
          if (item.kind === 'block') {
            const blk = item.block;
            const tint = item.current ? C.ink : item.past ? C.ink3 : blk.kind === 'free' ? C.gold : C.ink2;
            return (
              <View key={`b-${blk.id}`} style={rowStyle(last)}>
                <Text style={{ width: 46, fontFamily: F.semi, fontSize: 13, color: item.current ? C.gold : C.ink3, fontVariant: ['tabular-nums'] }}>{fmtTime(blk.start)}</Text>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: item.current ? C.gold : blk.kind === 'free' ? C.goldLine : 'transparent' }} />
                <Text style={{ flex: 1, fontFamily: item.current || blk.kind === 'free' ? F.semi : F.med, fontSize: 15, color: tint }}>{blk.label}</Text>
                <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3, fontVariant: ['tabular-nums'] }}>{fmtTime(blk.end)}</Text>
              </View>
            );
          }
          if (item.kind === 'anchor') {
            const target = item.anchor.kind === 'shutdown' ? '/shutdown' : item.anchor.kind === 'bedtime' ? '/kids' : null;
            const body = (
              <>
                <Text style={{ width: 46, fontFamily: F.semi, fontSize: 13, color: C.ink3, fontVariant: ['tabular-nums'] }}>{fmtTime(item.time)}</Text>
                <View style={{ width: 6 }} />
                <Text style={{ flex: 1, fontFamily: F.med, fontSize: 15, color: item.past ? C.ink3 : C.ink2 }}>{item.anchor.title}</Text>
                {target ? <Icon name="chevron" size={18} color={C.ink3} /> : null}
              </>
            );
            return target ? (
              <Pressable key={`a-${item.anchor.kind}`} accessibilityRole="button" onPress={() => { tap(); router.push(target); }} style={rowStyle(last)}>{body}</Pressable>
            ) : (
              <View key={`a-${item.anchor.kind}`} style={rowStyle(last)}>{body}</View>
            );
          }
          const t = item.task;
          return (
            <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Edit ${t.title}`} onPress={() => { tap(); router.push(`/task/${t.id}`); }} style={[rowStyle(last), { minHeight: 56 }]}>
              <Text style={{ width: 46, fontFamily: F.semi, fontSize: 13, color: C.ink3, fontVariant: ['tabular-nums'] }}>{fmtTime(item.time)}</Text>
              <View style={{ width: 6 }} />
              <Text style={{ flex: 1, fontFamily: t.done ? F.med : F.semi, fontSize: 15, color: t.done ? C.ink3 : C.ink, textDecorationLine: t.done ? 'line-through' : 'none' }}>{t.title}</Text>
              {t.done ? <Icon name="check" size={18} color={C.gold} width={2.4} /> : <Patch hat={t.hat} size={20} stitch={false} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const main = <>{planCard}{breakStrip}{classCard}{meetingCard}{nowCard}{upNext}</>;
  if (wide) {
    return (
      <Screen>
        {header}
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.1, gap: 22 }}>{main}</View>
          <View style={{ flex: 1, gap: 22 }}>{day}</View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen>
      {header}
      {main}
      {day}
    </Screen>
  );
}
