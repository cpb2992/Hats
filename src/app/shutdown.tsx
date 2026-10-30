import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { markShutdown, moveTask } from '../engine/actions';
import { weekday } from '../engine/dates';
import { moveDate, openAtShutdown, winsOn, type Move } from '../engine/plan';
import { dayWords } from '../engine/hats';
import { maybeAskForReview } from '../services/review';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { Btn, Card, CircleBtn, Label, Patch, Screen, success, tap, Txt } from '../ui/kit';
import { C, F } from '../ui/theme';

/** End of the day · two minutes to close the work or school day: see what got done, give each open item a date. */
export default function Shutdown() {
  const { data, today, mutate, demo } = useApp();
  const wins = winsOn(data, today);
  const [open] = useState(() => openAtShutdown(data, today));
  const [moves, setMoves] = useState<Record<string, Move>>({});
  const friday = weekday(today) === 5;
  const words = dayWords(data.hats);
  const placed = open.filter(t => moves[t.id]).length;

  const finish = () => {
    const wd = data.settings.workdays;
    mutate(d => {
      for (const t of open) moveTask(d, t.id, moveDate(moves[t.id] ?? 'tomorrow', today, wd));
      markShutdown(d, today);
    });
    success();
    if (friday) router.replace('/recap');
    else router.replace('/home');
    // Right after a finished day is the moment people are happiest with the app.
    if (!demo) setTimeout(() => { maybeAskForReview(data, today); }, 1200);
  };

  return (
    <Screen tabBar={false} gap={24}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="fine">Shutdown</Txt>
        <CircleBtn icon="close" size={44} kind="quiet" label="Close" onPress={() => router.back()} />
      </View>
      <Txt v="hero">{words.brain},{'\n'}off.</Txt>

      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingBottom: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 52, lineHeight: 54, color: C.gold, fontVariant: ['tabular-nums'] }}>{wins.length}</Text>
          <Txt v="h3">{wins.length === 1 ? 'win today' : 'wins today'}</Txt>
        </View>
        {wins.slice(-8).map((t, i, arr) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
            <Patch hat={t.hat} size={28} stitch={false} />
            <Txt v="body" style={{ flex: 1 }}>{t.title}</Txt>
            <Icon name="check" size={18} color={C.gold} width={2.4} />
          </View>
        ))}
        {!wins.length ? <Txt v="sub">A day of putting out fires still counts. Tomorrow starts fresh.</Txt> : null}
      </View>

      {open.length ? (
        <View style={{ gap: 12 }}>
          <Label>Still open · give each a date</Label>
          {open.map(t => (
            <Card key={t.id} style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Patch hat={t.hat} size={28} stitch={false} />
                <Txt v="semi" style={{ flex: 1 }}>{t.title}</Txt>
              </View>
              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, padding: 4 }}>
                {(['tomorrow', 'nextweek'] as Move[]).map(m => {
                  const on = moves[t.id] === m;
                  return (
                    <Pressable key={m} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); setMoves(x => ({ ...x, [t.id]: m })); }} style={{ flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent' }}>
                      <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? C.bg : C.ink2 }}>{m === 'tomorrow' ? (friday ? 'Monday' : 'Tomorrow') : 'Next week'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Btn title={friday ? 'Shut it down · see your week' : 'Shut it down'} icon="power" onPress={finish} />
        <Txt v="fine" center>{!open.length ? 'Nothing left open. Go be home.' : placed === open.length ? `All placed. ${words.Day} stays hidden until morning.` : 'Anything without a date moves to the next school day.'}</Txt>
      </View>
    </Screen>
  );
}
