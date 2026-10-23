import { Platform } from 'react-native';

/** Hats Premium: deep ink, warm white, one gold. Gold always means "the one thing that needs you". The cap is navy. */
export const C = {
  bg: '#0D110F',
  deep: '#070908',
  raised: '#161C19',
  raised2: '#1E2521',
  sunk: '#121815',
  line: 'rgba(255,255,255,0.06)',
  line2: 'rgba(255,255,255,0.14)',
  glass: 'rgba(30,37,33,0.96)',
  ink: '#F3F1EA',
  ink2: '#9AA39D',
  ink3: '#7F8882',
  gold: '#F2C14E',
  goldSoft: 'rgba(242,193,78,0.12)',
  goldTab: 'rgba(242,193,78,0.14)',
  goldLine: 'rgba(242,193,78,0.38)',
  onGold: '#0D110F',
  navy: '#243C70',
  stitch: '#F3F1EA',
  green: '#7FB069',
  rust: '#C7714F',
  night: '#0F1530',
  nightRaised: '#182046',
  nightInk2: '#A9B1CF',
};

/** Bricolage Grotesque for big moments, Inter Tight for everything else. */
export const F = {
  display: 'BricolageGrotesque_600SemiBold',
  displayMed: 'BricolageGrotesque_500Medium',
  body: 'InterTight_400Regular',
  med: 'InterTight_500Medium',
  semi: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
};

export const R = { card: 28, tile: 22, pill: 999, control: 22 };

export const KID_COLORS: Record<string, { solid: string; tile: string }> = {
  rose: { solid: '#B85C7C', tile: 'rgba(184,92,124,0.32)' },
  teal: { solid: '#2F7D6D', tile: 'rgba(47,125,109,0.40)' },
  plum: { solid: '#7B5A9E', tile: 'rgba(123,90,158,0.38)' },
  ochre: { solid: '#C08F2E', tile: 'rgba(192,143,46,0.34)' },
};

export const recoveryColor = (r: number | null) => (r == null ? C.ink3 : r >= 67 ? C.green : r >= 34 ? C.gold : C.rust);

export const shadow = Platform.select({
  android: { elevation: 10 },
  default: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
});
