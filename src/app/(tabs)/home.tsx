import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { setDinner } from '../../engine/actions';
import { addDays, dayName, fmtTime, minutesOf, weekday, weekStart } from '../../engine/dates';
import { dayLog } from '../../engine/plan';
import type { Chore } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Icon, type IconName } from '../../ui/icons';
import { Card, Chip, Label, Screen, tap, Txt, useWide } from '../../ui/kit';
import { C, F } from '../../ui/theme';

const KIND: Record<Chore['kind'], { color: string; icon: IconName; name: string }> = {
  laundry: { color: C.ink, icon: 'laundry', name: 'Laundry' },
  bath: { color: '#5B8DB8', icon: 'bath', name: 'Baths' },
  other: { color: C.gold, icon: 'calendar', name: 'Other' },
};

export default function HomeBase() {
  const { data, today, nowMin, mutate } = useApp();
  const wide = useWide();
  const s = data.settings;
  const tomorrow = addDays(today, 1);
  const tonight = data.dinners[today];
  const tmr = data.dinners[tomorrow];
  const log = dayLog(data, today);
  const choresToday = data.chores.filter(c => c.days.includes(weekday(today)));
  const start = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const part = nowMin < 12 * 60 ? 'morning' : nowMin < 17 * 60 ? 'afternoon' : 'evening';
  const evening = [
    { time: s.pickups, title: 'Pickups', target: null as string | null, work: true },
    { time: s.bedtime, title: 'Bedtime', target: '/kids', work: false },
    { time: s.gym, title: 'Me time', target: null, work: false },
  ].filter(x => !x.work || s.workdays.includes(weekday(today))).sort((a, b) => minutesOf(a.time) - minutesOf(b.time));

  const dinnerCard = (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="dinner" size={24} color={C.gold} />
        <View style={{ flex: 1, gap: 2 }}>
          <Label>Tonight</Label>
          <Txt v="h2">{tonight ?? 'Not picked yet'}</Txt>
        </View>
        {tonight && log.thawed ? <Icon name="check" size={20} color={C.green} width={2.4} /> : null}
      </View>
      {!tonight ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {data.meals.map(m => <Chip key={m} label={m} onPress={() => mutate(d => setDinner(d, today, m))} />)}
        </View>
      ) : null}
      <View style={{ height: 1, backgroundColor: C.line }} />
      {tmr ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Tomorrow: ${tmr}. Change`} onPress={() => { tap(); mutate(d => setDinner(d, tomorrow, null)); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label color={C.gold}>Tomorrow</Label>
            <Txt v="h2">{tmr}</Txt>
          </View>
          <Txt v="fine">Change</Txt>
        </Pressable>
      ) : (
        <View style={{ gap: 10 }}>
          <Label color={C.gold}>Tomorrow</Label>
          <Txt v="fine">Pick it now while you’re calm. The 6:15 nudge will just say “move it to the fridge.”</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {data.meals.map(m => <Chip key={m} label={m} onPress={() => mutate(d => setDinner(d, tomorrow, m))} />)}
          </View>
        </View>
      )}
    </Card>
  );

  const tonightList = (
    <View style={{ gap: 6 }}>
      <Label>This {part === 'evening' ? 'evening' : 'afternoon and evening'}</Label>
      <View>
        {evening.map((e, i) => {
          const past = minutesOf(e.time) < nowMin;
          const body = (
            <>
              <Text style={{ width: 46, fontFamily: F.semi, fontSize: 13, color: past ? C.ink3 : C.ink2, fontVariant: ['tabular-nums'] }}>{fmtTime(e.time)}</Text>
              <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15, color: past ? C.ink3 : C.ink }}>{e.title}</Text>
              {e.target ? <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.gold }}>Kids’ board</Text> : null}
            </>
          );
          const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14, minHeight: 54, borderBottomWidth: i === evening.length - 1 ? 0 : 1, borderBottomColor: C.line };
          return e.target ? <Pressable key={e.title} accessibilityRole="button" onPress={() => { tap(); router.push(e.target!); }} style={style}>{body}</Pressable> : <View key={e.title} style={style}>{body}</View>;
        })}
      </View>
    </View>
  );

  const weekView = (
    <View style={{ gap: 12 }}>
      <Label>This week</Label>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {week.map(date => {
          const isToday = date === today;
          const kinds = [...new Set(data.chores.filter(c => c.days.includes(weekday(date))).map(c => c.kind))];
          return (
            <View key={date} accessibilityLabel={`${dayName(date)}: ${data.chores.filter(c => c.days.includes(weekday(date))).map(c => c.label).join(', ') || 'nothing'}`} style={{ flex: 1, height: 88, borderRadius: 18, backgroundColor: isToday ? C.raised2 : C.sunk, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 12, color: isToday ? C.gold : C.ink2 }}>{dayName(date).charAt(0)}</Text>
              <View style={{ gap: 5, alignItems: 'center' }}>
                {kinds.map(k => <View key={k} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: KIND[k].color }} />)}
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {(Object.keys(KIND) as Chore['kind'][]).map(k => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: KIND[k].color }} />
            <Txt v="fine">{KIND[k].name}</Txt>
          </View>
        ))}
      </View>
      {choresToday.length ? (
        <View style={{ gap: 8 }}>
          <Txt v="fine">Today</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {choresToday.map(c => <Chip key={c.id} label={c.label} icon={KIND[c.kind].icon} />)}
          </View>
        </View>
      ) : null}
    </View>
  );

  const kidsCard = (
    <Pressable accessibilityRole="button" onPress={() => { tap(); router.push('/kids'); }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 18, borderRadius: 22, backgroundColor: C.nightRaised }, pressed && { opacity: 0.85 }]}>
      <Icon name="moon" size={22} color={C.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="semi">Kids’ board</Txt>
        <Txt v="fine" color={C.nightInk2}>{data.board.stars} of {data.board.goal} team stars</Txt>
      </View>
      <Icon name="chevron" size={20} color={C.ink} />
    </Pressable>
  );

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Txt v="fine">{dayName(today)} {part}</Txt>
        <Txt v="display">Home Base</Txt>
      </View>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 22 }}>{dinnerCard}{kidsCard}</View>
          <View style={{ flex: 1, gap: 22 }}>{tonightList}{weekView}</View>
        </View>
      ) : (
        <>{dinnerCard}{tonightList}{weekView}{kidsCard}</>
      )}
    </Screen>
  );
}
