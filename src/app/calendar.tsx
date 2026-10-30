import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { addDays, dayShort, fmtLong, weekday } from '../engine/dates';
import { agenda, dayLoad } from '../engine/plan';
import { dayWords } from '../engine/hats';
import { useApp } from '../store/AppStore';
import { DayRow } from '../ui/DayRow';
import { BackLink, Btn, Card, Label, Screen, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

const DAYS_AHEAD = 28;

/** Hats' own calendar: events you've said or added, caseload dates, timed tasks, and your free blocks. */
export default function CalendarScreen() {
  const { data, today, nowMin } = useApp();
  const [selected, setSelected] = useState(today);
  const [bells, setBells] = useState(false);
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today]);
  const items = agenda(data, selected, today, nowMin);
  // The bell schedule folds down to free and meeting blocks unless you ask for all of it.
  const shown = bells ? items : items.filter(i => i.kind !== 'block' || i.block.kind === 'free' || i.block.kind === 'meeting');
  const hiddenBells = items.filter(i => i.kind === 'block').length - shown.filter(i => i.kind === 'block').length;
  const upcoming = data.events.filter(e => e.date > selected).sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? ''))).slice(0, 5);

  return (
    <Screen tabBar={false}>
      <BackLink label="Hats" onPress={() => router.back()} />
      <Txt v="display">Calendar</Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }} style={{ marginHorizontal: -20 }}>
        <View style={{ width: 12 }} />
        {days.map(d => {
          const on = d === selected;
          const load = dayLoad(data, d, today);
          const work = data.settings.workdays.includes(weekday(d));
          return (
            <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${fmtLong(d)}${load ? `, ${load} on the calendar` : ''}`} onPress={() => { tap(); setSelected(d); }}
              style={{ width: 52, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: on ? C.gold : work ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1, color: on ? C.onGold : C.ink3 }}>{d === today ? 'TODAY' : dayShort(d).toUpperCase()}</Text>
              <Text style={{ fontFamily: F.display, fontSize: 20, color: on ? C.onGold : C.ink }}>{Number(d.slice(8))}</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: load ? (on ? C.onGold : C.gold) : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: 6 }}>
        <Label right={hiddenBells || bells ? (
          <Pressable accessibilityRole="button" onPress={() => { tap(); setBells(b => !b); }} hitSlop={8}>
            <Txt v="fine" color={C.gold}>{`${bells ? 'Hide' : 'Show'} ${dayWords(data.hats).schedule.toLowerCase()}`}</Txt>
          </Pressable>
        ) : undefined}>{selected === today ? 'Today' : fmtLong(selected)}</Label>
        {shown.length ? (
          <View>{shown.map((item, i) => <DayRow key={`${item.kind}-${item.time}-${i}`} item={item} last={i === shown.length - 1} />)}</View>
        ) : (
          <Card style={{ gap: 8 }}>
            <Txt v="semi">Nothing on this day yet.</Txt>
            <Txt v="fine">Say it and Hats adds it: “IEP meeting for J.M. at 9:30.”</Txt>
          </Card>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn title="Say it" icon="mic" kind="quiet" onPress={() => router.push('/capture')} style={{ flex: 1 }} />
        <Btn title="Add event" icon="plus" kind="ghost" onPress={() => router.push(`/event/new?date=${selected}`)} style={{ flex: 1 }} />
      </View>

      {upcoming.length ? (
        <View style={{ gap: 6 }}>
          <Label>Coming up</Label>
          {upcoming.map((e, i) => (
            <Pressable key={e.id} accessibilityRole="button" onPress={() => { tap(); setSelected(e.date); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, borderBottomWidth: i === upcoming.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
              <Text style={{ width: 64, fontFamily: F.semi, fontSize: 13, color: C.ink3 }}>{dayShort(e.date)} {Number(e.date.slice(5, 7))}/{Number(e.date.slice(8))}</Text>
              <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: C.ink }} numberOfLines={1}>{e.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}
