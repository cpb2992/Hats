import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addKindness, boardFor, resetStars, toggleKidStep } from '../engine/actions';
import { fmtTime, minutesOf } from '../engine/dates';
import type { KidColor } from '../engine/types';
import { uid } from '../engine/util';
import { useApp } from '../store/AppStore';
import { Icon, KID_ICONS } from '../ui/icons';
import { Btn, Field, success, tap } from '../ui/kit';
import { C, F, KID_COLORS } from '../ui/theme';

const COLORS: KidColor[] = ['rose', 'teal', 'plum', 'ochre'];

function Star({ on }: { on: boolean }) {
  const [pop] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (on) { pop.setValue(0.3); Animated.spring(pop, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 220 }).start(); }
  }, [on, pop]);
  if (!on) return <Icon name="star" size={32} color="rgba(243,241,234,0.25)" width={1.5} />;
  return <Animated.View style={{ transform: [{ scale: pop }] }}><Icon name="star" size={32} fill={C.gold} /></Animated.View>;
}

/** The girls' bedtime board for the kitchen tablet or an unfolded phone. Checkmarks clear each night; stars carry over. */
export default function KidsBoard() {
  useKeepAwake();
  const { data, today, nowMin, mutate } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [name, setName] = useState('');
  const board = boardFor(data, today);
  const toBed = minutesOf(data.settings.bedtime) - nowMin;
  const reached = board.stars >= board.goal;
  const stacked = width < 760;

  const addKid = () => {
    const n = name.trim();
    if (!n) return;
    mutate(d => { d.kids.push({ id: uid('k'), name: n, color: COLORS[d.kids.length % COLORS.length] }); });
    setName('');
  };

  if (!data.kids.length) {
    return (
      <View style={{ flex: 1, backgroundColor: C.night, padding: 28, paddingTop: insets.top + 28, gap: 18 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center' }}><Icon name="back" size={24} color={C.ink} /></Pressable>
        <Text style={{ fontFamily: F.display, fontSize: 40, color: C.ink, letterSpacing: -1 }}>Who’s on the board?</Text>
        <Text style={{ fontFamily: F.body, fontSize: 16, color: C.nightInk2 }}>Add each kid’s first name. Names stay on this device.</Text>
        <Field value={name} onChangeText={setName} placeholder="First name" accessibilityLabel="Kid’s first name" returnKeyType="done" onSubmitEditing={addKid} autoCapitalize="words" />
        <Btn title="Add" onPress={addKid} disabled={!name.trim()} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.night }} contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28, paddingHorizontal: stacked ? 18 : 40, gap: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { tap(); router.back(); }} hitSlop={10}>
            <Icon name="moon" size={stacked ? 40 : 52} color={C.gold} width={1.6} />
          </Pressable>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: stacked ? 34 : 54, lineHeight: stacked ? 38 : 58, color: C.ink, letterSpacing: -1.2 }}>Tonight’s mission</Text>
            <Text style={{ fontFamily: F.body, fontSize: stacked ? 15 : 18, color: C.nightInk2 }}>Tap a step when it’s done. Every star helps the team.</Text>
          </View>
        </View>
        {!stacked ? (
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontFamily: F.display, fontSize: 40, color: C.ink, fontVariant: ['tabular-nums'] }}>{fmtTime(data.settings.bedtime)}</Text>
            <Text style={{ fontFamily: F.med, fontSize: 15, color: C.nightInk2 }}>{toBed > 0 ? `${toBed} min to bedtime` : 'Bedtime'}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: stacked ? 'column' : 'row', gap: 20, alignItems: 'stretch' }}>
        {data.kids.map(k => {
          const done = board.done[k.id] ?? [];
          const col = KID_COLORS[k.color] ?? KID_COLORS.rose;
          return (
            <View key={k.id} style={{ flex: stacked ? undefined : 1, backgroundColor: C.nightRaised, borderRadius: 32, padding: 18, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: col.solid, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed' }} />
                  <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 28, color: C.ink, flexShrink: 1 }}>{k.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(242,193,78,0.14)' }}>
                  <Icon name="star" size={15} fill={C.gold} />
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.gold, fontVariant: ['tabular-nums'] }}>{done.filter(id => data.routine.some(r => r.id === id)).length} of {data.routine.length}</Text>
                </View>
              </View>
              {data.routine.map(step => {
                const on = done.includes(step.id);
                return (
                  <Pressable key={step.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${k.name}: ${step.label}`} onPress={() => { if (!on) success(); else tap(); mutate(d => toggleKidStep(d, today, k.id, step.id)); }} style={({ pressed }) => [{ height: 72, borderRadius: 22, borderWidth: 1.5, borderColor: on ? 'rgba(242,193,78,0.6)' : 'transparent', backgroundColor: on ? 'rgba(242,193,78,0.10)' : 'rgba(255,255,255,0.03)', flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 12, paddingRight: 16 }, pressed && { transform: [{ scale: 0.98 }] }]}>
                    <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: col.tile, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={KID_ICONS[step.icon]} size={26} color={C.ink} />
                    </View>
                    <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 21, color: on ? C.ink : '#DCE0EE' }}>{step.label}</Text>
                    <Star on={on} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <View style={{ width: stacked ? undefined : 240, backgroundColor: C.nightRaised, borderRadius: 32, padding: 22, gap: 14 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 12, letterSpacing: 2.1, color: C.nightInk2 }}>TEAM STARS</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ fontFamily: F.display, fontSize: 84, lineHeight: 86, color: C.gold, fontVariant: ['tabular-nums'] }}>{board.stars}</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 18, color: C.nightInk2 }}>of {board.goal}</Text>
          </View>
          <Progress pct={board.stars / Math.max(1, board.goal)} />
          <Text style={{ fontFamily: F.med, fontSize: 17, lineHeight: 24, color: C.ink }}>{reached ? `You did it! ${board.reward}` : `At ${board.goal}: ${board.reward}`}</Text>
          {reached ? (
            <Btn title="Start a new goal" kind="light" small onPress={() => mutate(d => resetStars(d))} />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => { success(); mutate(d => addKindness(d, today)); }} style={({ pressed }) => [{ minHeight: 64, borderRadius: 22, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 14 }, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Icon name="heart" size={20} color={C.night} width={1.9} />
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.night }}>Caught being kind</Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.nightInk2, textAlign: 'center' }}>Helping with the baby, sharing, cheering a sister on</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Progress({ pct }: { pct: number }) {
  const [w] = useState(() => new Animated.Value(pct));
  useEffect(() => { Animated.timing(w, { toValue: pct, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [pct, w]);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <Animated.View style={{ height: 8, borderRadius: 4, backgroundColor: C.gold, width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}
