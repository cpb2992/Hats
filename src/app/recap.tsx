import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { addDays, fmtShort } from '../engine/dates';
import { hatName } from '../engine/hats';
import { weekStats } from '../engine/plan';
import { useApp } from '../store/AppStore';
import { Btn, Label, Patch, Screen, Txt } from '../ui/kit';
import { WeekDoneSpot } from '../ui/spots';
import { C, F } from '../ui/theme';

export default function Recap() {
  const { data, today } = useApp();
  const w = weekStats(data, today);
  const top = Math.max(1, ...w.byHat.map(x => x.count));
  const tiles = [
    { n: String(w.points), label: 'data points' },
    { n: String(w.cycles), label: w.cycles === 1 ? 'Pulse sort' : 'Pulse sorts' },
    { n: w.focusMinutes >= 60 ? `${Math.round((w.focusMinutes / 60) * 10) / 10}h` : String(w.focusMinutes), label: w.focusMinutes >= 60 ? 'focused' : 'focus min' },
  ];

  return (
    <Screen tabBar={false} gap={26}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="fine">Your week · {fmtShort(w.start)} – {fmtShort(addDays(w.start, 4))}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Text style={{ fontFamily: F.display, fontSize: 120, lineHeight: 110, color: C.gold, letterSpacing: -5, fontVariant: ['tabular-nums'] }}>{w.wins}</Text>
        <Text style={{ fontFamily: F.displayMed, fontSize: 26, lineHeight: 30, color: C.ink, paddingBottom: 10 }}>{w.wins === 1 ? 'win this week.' : 'wins this week.'}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {tiles.map(t => (
          <View key={t.label} style={{ flex: 1, backgroundColor: C.raised, borderRadius: 22, padding: 16, gap: 6 }}>
            <Text style={{ fontFamily: F.display, fontSize: 30, lineHeight: 32, color: C.ink, fontVariant: ['tabular-nums'] }}>{t.n}</Text>
            <Txt v="fine">{t.label}</Txt>
          </View>
        ))}
      </View>
      {w.byHat.length ? (
        <View style={{ gap: 6 }}>
          <Label>By hat</Label>
          {w.byHat.map(x => (
            <View key={x.hat} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 }}>
              <Patch hat={x.hat} size={26} />
              <Txt v="semi" style={{ width: 84 }}>{hatName(x.hat)}</Txt>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.gold, width: `${Math.round((x.count / top) * 100)}%` }} />
              </View>
              <Text style={{ width: 22, textAlign: 'right', fontFamily: F.bold, fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] }}>{x.count}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <WeekDoneSpot size={150} />
          <Txt v="sub" center>Wins you check off this week land here.</Txt>
        </View>
      )}
      <Txt v="sub">No streaks. Monday starts fresh.</Txt>
      <Btn title="Back to Hats" kind="ghost" onPress={() => router.replace('/')} />
    </Screen>
  );
}
