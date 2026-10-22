import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { logPoint, undoPoint } from '../../engine/actions';
import { fmtShort } from '../../engine/dates';
import { comingDue, todayCount } from '../../engine/progress';
import { sectionNow } from '../../engine/schedule';
import type { Student } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { Icon } from '../../ui/icons';
import { Btn, Card, InitialsPatch, Label, Screen, tap, thud, Txt, useWide } from '../../ui/kit';
import { EmptyPeopleSpot } from '../../ui/spots';
import { C, F } from '../../ui/theme';

export default function Caseload() {
  const { data, today, nowMin, mutate, showToast } = useApp();
  const wide = useWide();
  const [open, setOpen] = useState<string | null>(null);
  const due = comingDue(data.students, today).slice(0, 4);
  const inClass = sectionNow(data.settings, today, nowMin);
  const isNow = (st: Student) => !!inClass && st.period.toUpperCase() === inClass.toUpperCase();
  const students = [...data.students].sort((a, b) => Number(isNow(b)) - Number(isNow(a)) || a.period.localeCompare(b.period, undefined, { numeric: true }) || a.initials.localeCompare(b.initials));
  const total = data.students.reduce((n, s) => n + todayCount(s, today), 0);

  const log = (s: Student, value: number, outOf?: number) => {
    const g = s.goals[0];
    if (!g) return;
    thud();
    mutate(d => logPoint(d, s.id, g.id, today, value, outOf));
    setOpen(null);
    showToast(`Logged for ${s.initials}`, { action: { label: 'Undo', onPress: () => mutate(d => undoPoint(d, s.id, g.id, today)) } });
  };

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <Txt v="display">Caseload</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 6 }}>
        <Icon name="lock" size={14} color={C.ink2} width={2} />
        <Txt v="fine">On this phone only</Txt>
      </View>
    </View>
  );

  if (!data.students.length) {
    return (
      <Screen>
        {header}
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <EmptyPeopleSpot size={150} />
          <Txt v="title" center>Your caseload lives here.</Txt>
          <Txt v="sub" center>Add each student by initials, with their goals, accommodations and review dates. Then one tap in class is a data point, and progress reports draft themselves.</Txt>
          <Btn title="Add a student" icon="plus" onPress={() => router.push('/student-edit')} />
        </Card>
      </Screen>
    );
  }

  const dueCard = (
    <View style={{ gap: 10 }}>
      <Label>Coming due</Label>
      {due.length ? (
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {due.map((x, i) => (
            <Pressable key={x.date.id} accessibilityRole="button" onPress={() => { tap(); router.push(`/student/${x.student.id}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderBottomWidth: i === due.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Txt v="semi">{x.student.initials} · {x.date.label}</Txt>
                <Txt v="fine">{fmtShort(x.date.date)}</Txt>
              </View>
              <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: i === 0 ? C.gold : 'transparent' }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: i === 0 ? C.onGold : C.ink2, fontVariant: ['tabular-nums'] }}>{x.days === 0 ? 'Today' : x.days === 1 ? '1 day' : `${x.days} days`}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      ) : <Txt v="sub">No reviews or reports in the next four months.</Txt>}
    </View>
  );

  const list = (
    <View style={{ gap: 6 }}>
      <Label right={`${total} today`}>Students</Label>
      <View>
        {students.map((s, i) => {
          const g = s.goals[0];
          const isOpen = open === s.id;
          return (
            <View key={s.id} style={{ borderBottomWidth: i === students.length - 1 ? 0 : 1, borderBottomColor: C.line, paddingVertical: 8, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${s.initials}`} onPress={() => { tap(); router.push(`/student/${s.id}`); }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <InitialsPatch initials={s.initials} size={44} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Txt v="semi" numberOfLines={2}>{g ? g.text : 'No goals yet'}</Txt>
                    <Txt v="fine" color={isNow(s) ? C.gold : undefined}>{isNow(s) ? 'In class now' : s.period} · {s.plan} · {todayCount(s, today)} today</Txt>
                  </View>
                </Pressable>
                {g ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={g.kind === 'tally' ? `Log one for ${s.initials}` : `Log a check for ${s.initials}`}
                    onPress={() => { if (g.kind === 'tally') log(s, 1); else { tap(); setOpen(isOpen ? null : s.id); } }}
                    style={({ pressed }) => [{ width: 54, height: 54, borderRadius: 27, backgroundColor: isOpen ? C.gold : C.raised2, alignItems: 'center', justifyContent: 'center' }, pressed && { transform: [{ scale: 0.92 }] }]}>
                    <Text style={{ fontFamily: F.display, fontSize: 18, color: isOpen ? C.onGold : C.ink }}>{g.kind === 'tally' ? '+1' : `/${g.outOf}`}</Text>
                  </Pressable>
                ) : null}
              </View>
              {isOpen && g ? (
                <View style={{ gap: 8, paddingLeft: 58 }}>
                  <Txt v="fine">How many of {g.outOf} tries?</Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {Array.from({ length: g.outOf + 1 }, (_, n) => (
                      <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} of ${g.outOf}`} onPress={() => log(s, n, g.outOf)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: n >= g.target ? C.goldSoft : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: F.bold, fontSize: 16, color: n >= g.target ? C.gold : C.ink }}>{n}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <Btn title="Add a student" icon="plus" kind="ghost" small onPress={() => router.push('/student-edit')} style={{ marginTop: 10 }} />
    </View>
  );

  return (
    <Screen>
      {header}
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>{dueCard}</View>
          <View style={{ flex: 1.3 }}>{list}</View>
        </View>
      ) : (
        <>{dueCard}{list}</>
      )}
    </Screen>
  );
}
