import { router } from 'expo-router';
import { Pressable, Text, View, type ViewStyle } from 'react-native';
import { fmtTime } from '../engine/dates';
import type { DayItem } from '../engine/plan';
import { Icon } from './icons';
import { Patch, tap } from './kit';
import { C, F } from './theme';

export const dayRowStyle = (last: boolean): ViewStyle => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line });

const timeStyle = (color: string, small = false) => ({ width: 46, fontFamily: F.semi, fontSize: small ? 10.5 : 13, letterSpacing: small ? 0.8 : 0, color, fontVariant: ['tabular-nums' as const] });

/** One line of a day: a bell block, an anchor, a timed task, a calendar event or a caseload date. */
export function DayRow({ item, last }: { item: DayItem; last: boolean }) {
  if (item.kind === 'block') {
    const blk = item.block;
    const tint = item.current ? C.ink : item.past ? C.ink3 : blk.kind === 'free' ? C.gold : C.ink2;
    return (
      <View style={dayRowStyle(last)}>
        <Text style={timeStyle(item.current ? C.gold : C.ink3)}>{fmtTime(blk.start)}</Text>
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
        <Text style={timeStyle(C.ink3)}>{fmtTime(item.time)}</Text>
        <View style={{ width: 6 }} />
        <Text style={{ flex: 1, fontFamily: F.med, fontSize: 15, color: item.past ? C.ink3 : C.ink2 }}>{item.anchor.title}</Text>
        {target ? <Icon name="chevron" size={18} color={C.ink3} /> : null}
      </>
    );
    return target ? <Pressable accessibilityRole="button" onPress={() => { tap(); router.push(target); }} style={dayRowStyle(last)}>{body}</Pressable> : <View style={dayRowStyle(last)}>{body}</View>;
  }
  if (item.kind === 'event') {
    const e = item.event;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${e.allDay ? 'All day' : fmtTime(item.time, true)}: ${e.title}. Edit`} onPress={() => { tap(); router.push(`/event/${e.id}`); }} style={[dayRowStyle(last), { minHeight: 58 }]}>
        <Text style={timeStyle(item.past ? C.ink3 : C.gold, e.allDay)}>{e.allDay ? 'ALL DAY' : fmtTime(item.time)}</Text>
        <Icon name="calendar" size={14} color={item.past ? C.ink3 : C.gold} width={2.2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontFamily: F.semi, fontSize: 15, color: item.past ? C.ink3 : C.ink }} numberOfLines={2}>{e.title}</Text>
          <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3 }} numberOfLines={1}>{e.allDay ? 'All day' : `${fmtTime(e.start ?? item.time)}–${fmtTime(e.end ?? e.start ?? item.time, true)}`}{e.location ? ` · ${e.location}` : ''}</Text>
        </View>
        <Patch hat={e.hat} size={20} stitch={false} />
      </Pressable>
    );
  }
  if (item.kind === 'keydate') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.keyDate.label} for ${item.student.initials}`} onPress={() => { tap(); router.push(`/student/${item.student.id}`); }} style={dayRowStyle(last)}>
        <Text style={timeStyle(C.ink3, true)}>DUE</Text>
        <Icon name="people" size={14} color={C.ink3} width={2.2} />
        <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: C.ink }}>{item.keyDate.label} · {item.student.initials}</Text>
        <Patch hat="sped" size={20} stitch={false} />
      </Pressable>
    );
  }
  const t = item.task;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${t.title}`} onPress={() => { tap(); router.push(`/task/${t.id}`); }} style={[dayRowStyle(last), { minHeight: 56 }]}>
      <Text style={timeStyle(C.ink3)}>{fmtTime(item.time)}</Text>
      <View style={{ width: 6 }} />
      <Text style={{ flex: 1, fontFamily: t.done ? F.med : F.semi, fontSize: 15, color: t.done ? C.ink3 : C.ink, textDecorationLine: t.done ? 'line-through' : 'none' }}>{t.title}</Text>
      {t.done ? <Icon name="check" size={18} color={C.gold} width={2.4} /> : <Patch hat={t.hat} size={20} stitch={false} />}
    </Pressable>
  );
}
