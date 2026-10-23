import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { dayName, fmtShort, fmtTime, monthName } from '../../engine/dates';
import { evidenceMonths, latestCycle, LEVEL_NAME, LEVELS, monthSummary, total } from '../../engine/pulse';
import { nextBoost, sectionNow, sections } from '../../engine/schedule';
import { uid } from '../../engine/util';
import { useApp } from '../../store/AppStore';
import { Btn, Card, Chip, Field, Label, Screen, tap, Txt, useWide } from '../../ui/kit';
import { C, F } from '../../ui/theme';

const BAR = { reteach: '#2F7D6D', practice: '#5FA898', extend: '#A9D3C9' };

export default function Pulse() {
  const { data, today, nowMin, mutate } = useApp();
  const wide = useWide();
  const periods = useMemo(() => {
    const fromSchedule = sections(data.settings);
    const set = new Set<string>(fromSchedule.length ? fromSchedule : ['1', '2', '3', '4']);
    data.cycles.forEach(c => set.add(c.period));
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data.settings, data.cycles]);
  const [period, setPeriod] = useState(() => sectionNow(data.settings, today, nowMin) ?? data.cycles[data.cycles.length - 1]?.period ?? periods[0]);
  const boost = nextBoost(data.settings, period, today, nowMin);
  const [stdId, setStdId] = useState(() => data.standards[0]?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const std = data.standards.find(s => s.id === stdId) ?? data.standards[0];
  const latest = std ? latestCycle(data.cycles, period, std.id) : null;
  const months = evidenceMonths(data.cycles, today);
  const recent = [...data.cycles].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const saved = months.filter(m => m.saved).length;

  const addStandard = () => {
    if (!code.trim() && !text.trim()) return;
    const id = uid('std');
    mutate(d => { d.standards.push({ id, code: code.trim() || 'Standard', text: text.trim() }); });
    setStdId(id); setAdding(false); setCode(''); setText('');
  };

  const shareMonth = (month: string) => Share.share({ message: monthSummary(data.cycles, data.standards, month) }).catch(() => {});

  const left = (
    <View style={{ gap: 22 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {data.standards.map(s => <Chip key={s.id} label={s.code} on={s.id === std?.id} onPress={() => setStdId(s.id)} />)}
        <Chip label="Standard" icon="plus" onPress={() => setAdding(a => !a)} />
      </ScrollView>
      {adding ? (
        <Card style={{ padding: 16 }}>
          <Field value={code} onChangeText={setCode} placeholder="Code, like MS-PS1-2" accessibilityLabel="Standard code" autoCapitalize="characters" />
          <Field value={text} onChangeText={setText} placeholder="What students should be able to do" accessibilityLabel="Standard description" multiline />
          <Btn title="Add standard" small onPress={addStandard} />
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <Label>Class</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {periods.map(p => <Chip key={p} label={p} on={p === period} onPress={() => setPeriod(p)} />)}
        </View>
      </View>

      {std ? (
        <Card>
          <View style={{ gap: 6 }}>
            <Label color={C.gold}>{std.code}</Label>
            {std.text ? <Txt v="h2">{std.text}</Txt> : null}
          </View>
          {boost ? <Txt v="fine">Next {period} Boost: {boost.date === today ? 'today' : dayName(boost.date)} at {fmtTime(boost.block.start)}. That’s where Reteach goes.</Txt> : null}
          <Btn title="Sort exit tickets" icon="groups" onPress={() => router.push(`/pulse-sort?std=${std.id}&period=${encodeURIComponent(period)}`)} />
        </Card>
      ) : null}

      {latest ? (
        <View style={{ gap: 12 }}>
          <Label right={fmtShort(latest.date)}>{`Latest groups · ${latest.period}`}</Label>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {LEVELS.map(l => (
              <View key={l} style={{ flex: 1, backgroundColor: C.raised, borderRadius: 22, padding: 14, gap: 10 }}>
                <Text style={{ fontFamily: F.display, fontSize: 36, lineHeight: 38, color: C.ink, fontVariant: ['tabular-nums'] }}>{latest.counts[l]}</Text>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: BAR[l] }} />
                <Txt v="fine" color={C.ink}>{LEVEL_NAME[l]}</Txt>
              </View>
            ))}
          </View>
          <View>
            {LEVELS.map((l, i) => (
              <View key={l} style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: C.line }}>
                <Text style={{ width: 70, fontFamily: F.semi, fontSize: 13, color: C.ink2 }}>{LEVEL_NAME[l]}</Text>
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink }}>{latest.moves[l]}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : std ? <Txt v="sub">No sort yet for {period} on {std.code}. Grab the stack of exit tickets and tap through them.</Txt> : null}
    </View>
  );

  const right = (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 14 }}>
        <Label right={`${saved} of ${months.length}`}>Evaluation evidence</Label>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {months.map(m => {
            const on = m.saved > 0;
            return (
              <Pressable key={m.month} accessibilityRole="button" accessibilityLabel={`${monthName(`${m.month}-01`)}: ${on ? `${m.saved} cycles saved. Share summary` : 'nothing saved'}`} disabled={!on} onPress={() => { tap(); shareMonth(m.month); }} style={{ alignItems: 'center', gap: 8, minWidth: 26 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: on || m.current ? C.gold : 'rgba(255,255,255,0.18)', backgroundColor: on ? C.gold : 'transparent' }} />
                <Text style={{ fontFamily: F.semi, fontSize: 11, color: on || m.current ? C.ink : C.ink3 }}>{monthName(`${m.month}-01`).charAt(0)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Txt v="fine">Your goal is a monthly look at the data. Each sort saves here; tap a month to share its one-page summary.</Txt>
        <Btn title={`Share ${monthName(today)} evidence`} kind="ghost" small icon="share" onPress={() => shareMonth(today.slice(0, 7))} />
      </View>

      {recent.length ? (
        <View style={{ gap: 4 }}>
          <Label>Recent sorts</Label>
          {recent.map((c, i) => {
            const s = data.standards.find(x => x.id === c.standardId);
            return (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderBottomWidth: i === recent.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="semi">{fmtShort(c.date)} · {c.period}</Txt>
                  <Txt v="fine">{s?.code ?? 'Standard'} · {total(c)} tickets</Txt>
                </View>
                <Txt v="fine" style={{ fontVariant: ['tabular-nums'] }}>{c.counts.reteach} / {c.counts.practice} / {c.counts.extend}</Txt>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Txt v="display">Pulse</Txt>
        <Txt v="sub">{monthName(today)} · sort, group, reteach</Txt>
      </View>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
          <View style={{ flex: 1.2 }}>{left}</View>
          <View style={{ flex: 1 }}>{right}</View>
        </View>
      ) : (
        <>{left}{right}</>
      )}
    </Screen>
  );
}
