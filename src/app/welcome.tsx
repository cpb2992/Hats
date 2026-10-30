import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ALL_HATS, HAT_GROUPS, hatName, HATS, SCHOOL_HATS, TEACHING_HATS } from '../engine/hats';
import { PACKS } from '../engine/packs';
import { defaultSchedule, hasBlocks } from '../engine/schedule';
import type { HatId } from '../engine/types';
import { notificationsAllowed } from '../services/notifications';
import { useApp } from '../store/AppStore';
import { Icon } from '../ui/icons';
import { Btn, Cap, Field, Label, Patch, Screen, tap, Txt, useWide } from '../ui/kit';
import { C } from '../ui/theme';

export default function Welcome() {
  const { data, mutate, startDemo } = useApp();
  const wide = useWide();
  const [name, setName] = useState(data.settings.name);
  const [on, setOn] = useState<HatId[]>(data.hats.filter(h => h.on).map(h => h.id));
  const count = on.length;

  const finish = async (demo: boolean) => {
    const teaching = on.some(id => TEACHING_HATS.includes(id));
    mutate(d => {
      d.settings.name = name.trim();
      d.settings.onboarded = true;
      d.hats = d.hats.map(h => ({ ...h, on: on.includes(h.id) }));
      // Teachers start from a typical bell schedule and school hours; everyone else from a plain 9 to 5.
      if (teaching && !hasBlocks(d.settings.schedule)) {
        d.settings.schedule = defaultSchedule();
        d.settings.schoolStart = '07:30';
        d.settings.shutdown = '16:15';
      }
    });
    await notificationsAllowed(true).catch(() => false);
    if (demo) { startDemo(); router.replace('/'); }
    // Anyone with a working-day hat sets up their hours (and bells, for teachers) next; that's what makes Now work.
    else if (on.some(id => SCHOOL_HATS.includes(id))) router.replace('/schedule?setup=1');
    else router.replace('/morning');
  };

  return (
    <Screen tabBar={false} gap={26}>
      <View style={{ gap: 18, paddingTop: 12 }}>
        <Cap width={56} />
        <Txt v="display">Which hats do you wear?</Txt>
        <Txt v="sub">Pick every role you juggle. Each hat brings its own pack of tools, and Hats sorts what you capture into them so you see one thing at a time. You can rename them later.</Txt>
      </View>
      <Field value={name} onChangeText={setName} placeholder="Your first name" accessibilityLabel="Your first name" autoCapitalize="words" />
      {HAT_GROUPS.map(g => (
        <View key={g.id} style={{ gap: 12 }}>
          <Label>{g.label}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ALL_HATS.filter(id => HATS[id].group === g.id).map(id => {
              const sel = on.includes(id);
              return (
                <Pressable
                  key={id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: sel }}
                  accessibilityLabel={hatName(id)}
                  onPress={() => { tap(); setOn(o => (sel ? o.filter(x => x !== id) : [...o, id])); }}
                  style={({ pressed }) => [{ width: wide ? '23%' : '47.5%', flexGrow: 1, minHeight: 116, borderRadius: 24, backgroundColor: C.raised, padding: 16, justifyContent: 'space-between', borderWidth: 1.5, borderColor: sel ? C.gold : 'transparent', opacity: sel ? 1 : 0.55 }, pressed && { transform: [{ scale: 0.97 }] }]}>
                  <Patch hat={id} size={44} />
                  <View style={{ gap: 1 }}>
                    <Txt v="semi">{hatName(id)}</Txt>
                    <Txt v="fine">{HATS[id].meaning}</Txt>
                    <Txt v="fine" color={sel ? C.gold : C.ink3}>+ {PACKS[id].title}</Txt>
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
        </View>
      ))}
      <View style={{ gap: 10 }}>
        <Btn title={count ? `Wear these ${count}` : 'Pick at least one'} disabled={!count} onPress={() => finish(false)} />
        <Btn title="Look around with sample data first" kind="quiet" small onPress={() => finish(true)} />
        <Txt v="fine" center>Everything stays on this phone. No account, no ads.</Txt>
      </View>
    </Screen>
  );
}
