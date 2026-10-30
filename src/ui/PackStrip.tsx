/** The hats you wear, each opening its pack. Sits under Up next on the Now screen. */
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { hatName, wornHats } from '../engine/hats';
import { PACKS, packSummary } from '../engine/packs';
import { useApp } from '../store/AppStore';
import { Label, Patch, tap, Txt } from './kit';
import { C } from './theme';

export function PackStrip() {
  const { data, today } = useApp();
  const hats = wornHats().filter(id => data.hats.find(h => h.id === id)?.on);
  if (!hats.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <Label>Your hats</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
        {hats.map(id => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={`${hatName(id)}: ${PACKS[id].title}`}
            onPress={() => { tap(); router.push(`/pack/${id}`); }}
            style={({ pressed }) => [{ width: 150, minHeight: 108, borderRadius: 22, backgroundColor: C.raised, padding: 14, gap: 8 }, pressed && { transform: [{ scale: 0.97 }] }]}>
            <Patch hat={id} size={32} />
            <View style={{ gap: 2 }}>
              <Txt v="semi" numberOfLines={1}>{PACKS[id].title}</Txt>
              <Txt v="fine" numberOfLines={2}>{PACKS[id].list ? packSummary(data, id, today) : hatName(id)}</Txt>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
