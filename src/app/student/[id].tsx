import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { logPoint, undoPoint } from '../../engine/actions';
import { fmtShort, monthShort } from '../../engine/dates';
import { checks, comingDue, draftReport, fmtLevel, goalLabel, summarize } from '../../engine/progress';
import type { Goal, Student } from '../../engine/types';
import { useApp } from '../../store/AppStore';
import { BackLink, Btn, Card, Chip, CircleBtn, InitialsPatch, Label, Screen, thud, Txt } from '../../ui/kit';
import { C, F } from '../../ui/theme';

function GoalChart({ s, g }: { s: Student; g: Goal }) {
  const cs = checks(s, g).slice(-8);
  const goalRatio = g.kind === 'trials' ? g.target / Math.max(1, g.outOf) : 1;
  const ratios = cs.map(c => (c.outOf ? c.value / c.outOf : 0));
  const top = Math.max(1, goalRatio, ...ratios);
  const H = 110;
  if (!cs.length) return <Txt v="sub">No checks yet. Log one below and the chart starts here.</Txt>;
  return (
    <View accessibilityRole="image" accessibilityLabel={`Last ${cs.length} checks: ${cs.map(c => c.value).join(', ')}. Goal is ${goalLabel(g)}.`} style={{ height: H + 10, justifyContent: 'flex-end' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: (goalRatio / top) * H, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(243,241,234,0.35)' }} />
      <Text style={{ position: 'absolute', right: 0, bottom: (goalRatio / top) * H + 4, fontFamily: F.bold, fontSize: 11, letterSpacing: 1.2, color: C.ink2 }}>GOAL</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: H, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        {cs.map((c, i) => (
          <View key={`${c.date}-${i}`} style={{ flex: 1, height: Math.max(4, (ratios[i] / top) * H), borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: i >= cs.length - 3 ? C.gold : 'rgba(243,241,234,0.16)' }} />
        ))}
      </View>
    </View>
  );
}

export default function StudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, today, mutate, showToast } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const s = data.students.find(x => x.id === id);
  if (!s) {
    return (
      <Screen tabBar={false}>
        <BackLink label="Caseload" onPress={() => router.back()} />
        <Txt v="title">This student isn’t here anymore.</Txt>
      </Screen>
    );
  }
  const next = comingDue([s], today, 3650)[0];

  const log = (g: Goal, value: number, outOf?: number) => {
    thud();
    mutate(d => logPoint(d, s.id, g.id, today, value, outOf));
    showToast(`Logged for ${s.initials}`, { action: { label: 'Undo', onPress: () => mutate(d => undoPoint(d, s.id, g.id, today)) } });
  };

  return (
    <Screen tabBar={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <BackLink label="Caseload" onPress={() => router.back()} />
        <CircleBtn icon="edit" size={44} kind="quiet" label={`Edit ${s.initials}`} onPress={() => router.push(`/student-edit?id=${s.id}`)} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <InitialsPatch initials={s.initials} size={64} />
        <View style={{ gap: 4 }}>
          <Txt v="display">{s.initials}</Txt>
          <Txt v="sub">Period {s.period} · {s.plan}</Txt>
        </View>
      </View>

      {next ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 }}>
          <View style={{ width: 58, height: 62, borderRadius: 16, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 1.6, color: C.onGold }}>{monthShort(next.date.date).toUpperCase()}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 26, lineHeight: 28, color: C.onGold }}>{Number(next.date.date.slice(8))}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Txt v="semi">{next.date.label} {next.days === 0 ? 'today' : `in ${next.days} ${next.days === 1 ? 'day' : 'days'}`}</Txt>
            <Txt v="fine">{fmtShort(next.date.date)}. Your data is collecting itself.</Txt>
          </View>
        </Card>
      ) : null}

      {s.goals.map((g, gi) => {
        const sum = summarize(s, g);
        return (
          <View key={g.id} style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Label color={C.gold}>{`Goal ${gi + 1} · ${goalLabel(g)}`}</Label>
              <Txt v="h2">{g.text}</Txt>
            </View>
            <GoalChart s={s} g={g} />
            {sum.baseline != null && sum.recent != null ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt v="fine">{sum.first ? `${monthShort(sum.first)} · ` : ''}{fmtLevel(g, sum.baseline)}</Txt>
                <Txt v="fine" color={C.ink}>Lately · {fmtLevel(g, sum.recent)}</Txt>
              </View>
            ) : null}
            {g.kind === 'tally' ? (
              <Btn title="+1 today" kind="quiet" small onPress={() => log(g, 1)} />
            ) : (
              <View style={{ gap: 8 }}>
                <Txt v="fine">Log a check: how many of {g.outOf}?</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {Array.from({ length: g.outOf + 1 }, (_, n) => (
                    <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n} of ${g.outOf}`} onPress={() => log(g, n, g.outOf)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: n >= g.target ? C.goldSoft : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: F.bold, fontSize: 16, color: n >= g.target ? C.gold : C.ink }}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {drafts[g.id] ? (
              <Card style={{ borderWidth: 1, borderColor: C.goldLine }}>
                <Label color={C.gold}>Draft · read before sending</Label>
                <Txt v="body" style={{ lineHeight: 23 }}>{drafts[g.id]}</Txt>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Btn title="Share or copy" icon="share" small onPress={() => Share.share({ message: drafts[g.id] }).catch(() => {})} style={{ flex: 1 }} />
                  <Btn title="Close" kind="ghost" small onPress={() => setDrafts(x => { const n = { ...x }; delete n[g.id]; return n; })} />
                </View>
              </Card>
            ) : (
              <Btn title="Draft the progress report" icon="doc" onPress={() => setDrafts(x => ({ ...x, [g.id]: draftReport(s, g) }))} />
            )}
          </View>
        );
      })}

      {!s.goals.length ? <Btn title="Add a goal" icon="plus" kind="ghost" onPress={() => router.push(`/student-edit?id=${s.id}`)} /> : null}

      {s.accommodations.length ? (
        <View style={{ gap: 10 }}>
          <Label>Accommodations</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {s.accommodations.map(a => <Chip key={a} label={a} />)}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
