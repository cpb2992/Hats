import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ALL_HATS, HATS } from '../engine/hats';
import type { HatId } from '../engine/types';
import { notificationsAllowed } from '../services/notifications';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { Btn, Cap, Field, Patch, Screen, tap, Txt, useWide } from '../ui/kit';
import { C } from '../ui/theme';

export default function Welcome() {
  const { data, mutate, startDemo } = useApp();
  const wide = useWide();
  const [name, setName] = useState(data.settings.name);
  const [on, setOn] = useState<HatId[]>(data.hats.filter(h => h.on).map(h => h.id));
  const count = on.length;

  const finish = async (demo: boolean) => {
    mutate(d => {
      d.settings.name = name.trim();
      d.settings.onboarded = true;
      d.hats = d.hats.map(h => ({ ...h, on: on.includes(h.id) }));
    });
    await notificationsAllowed(true).catch(() => false);
    if (demo) { startDemo(); router.replace('/'); }
    else router.replace('/morning');
  };

  return (
    <Screen tabBar={false} gap={26}>
      <View style={{ gap: 18, paddingTop: 12 }}>
        <Cap width={56} />
        <Txt v="display">Which hats do you wear?</Txt>
        <Txt v="sub">Each hat gets its own color and symbol. Hats sorts everything you capture into one of them.</Txt>
      </View>
      <Field value={name} onChangeText={setName} placeholder="Your first name" accessibilityLabel="Your first name" autoCapitalize="words" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ALL_HATS.map(id => {
          const sel = on.includes(id);
          return (
            <Pressable
              key={id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={HATS[id].name}
              onPress={() => { tap(); setOn(o => (sel ? o.filter(x => x !== id) : [...o, id])); }}
              style={({ pressed }) => [{ width: wide ? '23%' : '47.5%', flexGrow: 1, height: 116, borderRadius: 24, backgroundColor: C.raised, padding: 16, justifyContent: 'space-between', borderWidth: 1.5, borderColor: sel ? C.gold : 'transparent', opacity: sel ? 1 : 0.55 }, pressed && { transform: [{ scale: 0.97 }] }]}>
              <Patch hat={id} size={44} />
              <View style={{ gap: 1 }}>
                <Txt v="semi">{HATS[id].name}</Txt>
                <Txt v="fine">{HATS[id].meaning}</Txt>
              </View>
              {sel ? (
                <View style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: 12, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={13} color={C.onGold} width={3.2} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ gap: 10 }}>
        <Btn title={count ? `Wear these ${count}` : 'Pick at least one'} disabled={!count} onPress={() => finish(false)} />
        <Btn title="Look around with sample data first" kind="quiet" small onPress={() => finish(true)} />
        <Txt v="fine" center>Everything stays on this phone. Student details stay initials only.</Txt>
      </View>
    </Screen>
  );
}
