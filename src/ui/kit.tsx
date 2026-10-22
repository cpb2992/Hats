import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { HATS } from '../engine/hats';
import type { HatId } from '../engine/types';
import { Icon, type IconName } from './icons';
import { C, F, R } from './theme';

export const tap = () => { if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {}); };
export const thud = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };
export const success = () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); };

export const CAP_PATH = 'M4 15a7 7 0 0 1 14 0c2.5 0 4 .6 4.5 1.6-2 .7-5.5.8-8.5.4H9c-3 0-5-.8-5-2z';
export const CAP_SEAMS = 'M11 8c-1.5 2-2 4.5-2 7M11 8c1.5 2 2.2 4.5 2.2 7';

/** True on wide screens: an unfolded Fold, a tablet, or a phone turned sideways. */
export function useWide() {
  const { width } = useWindowDimensions();
  return width >= 720;
}

type TxtV = 'hero' | 'display' | 'title' | 'h2' | 'h3' | 'body' | 'semi' | 'sub' | 'fine' | 'label' | 'num';
const TXT: Record<TxtV, TextStyle> = {
  hero: { fontFamily: F.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2, color: C.ink },
  display: { fontFamily: F.display, fontSize: 36, lineHeight: 39, letterSpacing: -1, color: C.ink },
  title: { fontFamily: F.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.4, color: C.ink },
  h2: { fontFamily: F.displayMed, fontSize: 21, lineHeight: 26, letterSpacing: -0.2, color: C.ink },
  h3: { fontFamily: F.semi, fontSize: 16, lineHeight: 21, color: C.ink },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.ink },
  semi: { fontFamily: F.semi, fontSize: 15, lineHeight: 20, color: C.ink },
  sub: { fontFamily: F.body, fontSize: 14, lineHeight: 19, color: C.ink2 },
  fine: { fontFamily: F.med, fontSize: 13, lineHeight: 17, color: C.ink2 },
  label: { fontFamily: F.bold, fontSize: 12, lineHeight: 16, letterSpacing: 2.1, color: C.ink2, textTransform: 'uppercase' },
  num: { fontFamily: F.display, fontSize: 40, lineHeight: 42, letterSpacing: -1, color: C.ink, fontVariant: ['tabular-nums'] },
};

export function Txt({ v = 'body', color, style, children, numberOfLines, center }: { v?: TxtV; color?: string; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number; center?: boolean }) {
  return <Text numberOfLines={numberOfLines} style={[TXT[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}>{children}</Text>;
}

/** A scrolling page that leaves room for the floating tab bar. */
export function Screen({ children, tabBar = true, gap = 22, scroll = true, pad = 20 }: { children: ReactNode; tabBar?: boolean; gap?: number; scroll?: boolean; pad?: number }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const inner = <View style={{ width: '100%', maxWidth: wide ? 1080 : 640, alignSelf: 'center', gap }}>{children}</View>;
  const padding = { paddingTop: insets.top + 18, paddingBottom: (tabBar ? 120 : 32) + insets.bottom, paddingLeft: Math.max(pad, insets.left), paddingRight: Math.max(pad, insets.right) };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: C.bg }, padding]}>{inner}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={padding} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {inner}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const s: ViewStyle = { backgroundColor: C.raised, borderRadius: R.card, padding: 20, gap: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' };
  if (!onPress) return <View style={[s, style]}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [s, style, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}>
      {children}
    </Pressable>
  );
}

export function Label({ children, color, right }: { children: ReactNode; color?: string; right?: ReactNode }) {
  if (!right) return <Txt v="label" color={color}>{children}</Txt>;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Txt v="label" color={color}>{children}</Txt>
      {typeof right === 'string' ? <Txt v="fine" style={{ fontVariant: ['tabular-nums'] }}>{right}</Txt> : right}
    </View>
  );
}

type BtnKind = 'gold' | 'ghost' | 'light' | 'quiet';
export function Btn({ title, onPress, kind = 'gold', icon, disabled, style, small, accessibilityLabel }: { title: string; onPress: () => void; kind?: BtnKind; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean; accessibilityLabel?: string }) {
  const h = small ? 46 : 58;
  const bg = kind === 'gold' ? C.gold : kind === 'light' ? C.ink : kind === 'quiet' ? 'rgba(255,255,255,0.06)' : 'transparent';
  const fg = kind === 'gold' ? C.onGold : kind === 'light' ? C.bg : C.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        { height: h, borderRadius: h / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: small ? 18 : 22 },
        kind === 'ghost' && { borderWidth: 1, borderColor: C.line2 },
        disabled && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}>
      {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} width={2} /> : null}
      <Text style={{ fontFamily: kind === 'gold' ? F.bold : F.semi, fontSize: small ? 14.5 : 16, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function CircleBtn({ icon, onPress, label, size = 58, kind = 'ghost', color }: { icon: IconName; onPress: () => void; label: string; size?: number; kind?: 'ghost' | 'quiet' | 'gold'; color?: string }) {
  const bg = kind === 'gold' ? C.gold : kind === 'quiet' ? 'rgba(255,255,255,0.06)' : 'transparent';
  const fg = color ?? (kind === 'gold' ? C.onGold : C.ink);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg },
        kind === 'ghost' && { borderWidth: 1, borderColor: C.line2 },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}>
      <Icon name={icon} size={size > 50 ? 22 : 18} color={fg} width={size > 50 ? 2 : 1.9} />
    </Pressable>
  );
}

/** A hat as a stitched patch with its line symbol. */
export function Patch({ hat, size = 36, stitch = true, color }: { hat: HatId; size?: number; stitch?: boolean; color?: string }) {
  const def = HATS[hat];
  const sw = size >= 40 ? 1.9 : size >= 30 ? 2.2 : 2.8;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={22} fill={color ?? def.color} />
      {stitch ? <Circle cx={24} cy={24} r={18.5} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={size >= 40 ? 1.2 : 1.4} strokeDasharray="2.2 1.9" /> : null}
      <G transform="translate(13 13) scale(0.917)">
        <Path d={def.glyph} fill="none" stroke={C.ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

/** A student as a stitched patch with initials. */
export function InitialsPatch({ initials, size = 44, color = '#3E5C9A' }: { initials: string; size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 48 48" style={{ position: 'absolute' }}>
        <Circle cx={24} cy={24} r={22} fill={color} />
        <Circle cx={24} cy={24} r={18.5} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} strokeDasharray="2.2 1.9" />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.bold, fontSize: size * 0.28, color: C.ink }}>{initials}</Text>
      </View>
    </View>
  );
}

export function Cap({ width = 26, color = C.gold, seams = false }: { width?: number; color?: string; seams?: boolean }) {
  return (
    <Svg width={width} height={width * 0.6} viewBox="3 6.5 20 12">
      <Path d={CAP_PATH} fill={color} />
      {seams ? <Path d={CAP_SEAMS} fill="none" stroke={C.seam} strokeWidth={0.55} strokeDasharray="0.7 0.5" strokeLinecap="round" /> : null}
    </Svg>
  );
}

export function Ring({ size, stroke, pct, color = C.gold, track = 'rgba(255,255,255,0.07)', children }: { size: number; stroke: number; pct: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {p > 0 ? <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} /> : null}
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 22, padding: 4 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { tap(); onChange(o.value); }} style={{ flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : 'transparent' }}>
            <Text style={{ fontFamily: F.semi, fontSize: 14, color: on ? C.bg : C.ink2 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, icon, dot }: { label: string; on?: boolean; onPress?: () => void; icon?: IconName; dot?: string }) {
  const body = (
    <>
      {dot ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: dot }} /> : null}
      {icon ? <Icon name={icon} size={15} color={on ? C.onGold : C.ink2} width={2} /> : null}
      <Text style={{ fontFamily: F.semi, fontSize: 13.5, color: on ? C.onGold : C.ink }}>{label}</Text>
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: on ? C.gold : 'rgba(255,255,255,0.06)' };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [style, pressed && { opacity: 0.8 }]}>
      {body}
    </Pressable>
  );
}

export function Row({ children, onPress, last, minHeight = 58, accessibilityLabel }: { children: ReactNode; onPress?: () => void; last?: boolean; minHeight?: number; accessibilityLabel?: string }) {
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line };
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { big?: boolean }) {
  const { big, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={C.ink3}
      selectionColor={C.gold}
      cursorColor={C.gold}
      {...rest}
      style={[
        { fontFamily: big ? F.displayMed : F.med, fontSize: big ? 22 : 16, color: C.ink, minHeight: big ? 60 : 52, paddingHorizontal: big ? 2 : 16, borderRadius: big ? 0 : 18, backgroundColor: big ? 'transparent' : 'rgba(255,255,255,0.06)', borderBottomWidth: big ? 1.5 : 0, borderBottomColor: C.gold },
        style,
      ]}
    />
  );
}

/** A value with − and + buttons. */
export function Stepper({ value, onMinus, onPlus, label }: { value: string; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={label}>
      <CircleBtn icon="minus" size={40} kind="quiet" label={`Earlier ${label}`} onPress={onMinus} />
      <Text style={{ fontFamily: F.semi, fontSize: 16, color: C.ink, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{value}</Text>
      <CircleBtn icon="plus" size={40} kind="quiet" label={`Later ${label}`} onPress={onPlus} />
    </View>
  );
}

export function TopBar({ left, right, title }: { left?: ReactNode; right?: ReactNode; title?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <View style={{ minWidth: 44 }}>{left}</View>
      {title ? <Txt v="fine">{title}</Txt> : null}
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${label}`} hitSlop={8} onPress={() => { tap(); onPress(); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 }}>
      <Icon name="back" size={20} color={C.gold} width={1.9} />
      <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.gold }}>{label}</Text>
    </Pressable>
  );
}
