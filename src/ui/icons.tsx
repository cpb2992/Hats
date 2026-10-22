import Svg, { Path } from 'react-native-svg';
import type { KidIcon } from '../engine/types';

/** One line style everywhere: 24-point grid, 1.75 stroke, round ends. */
export const ICONS = {
  now: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  focus: 'M9 2h6M12 4a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 9v4l2.5 2',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4',
  type: 'M5 7V5h14v2M12 5v14M9 19h6',
  check: 'M20 6 9 17l-5-5',
  next: 'M5 12h14M13 6l6 6-6 6',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  people: 'M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 9M22 21a7 7 0 0 0-5-6.7',
  plus: 'M12 5v14M5 12h14',
  plusCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8',
  calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
  camera: 'M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  groups: 'M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM14 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z',
  evidence: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 13l2 2 4-4',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  power: 'M12 3v8M6.4 6.4a8 8 0 1 0 11.2 0',
  recap: 'M4 20h16M7 16v-4M12 16V8M17 16V9',
  dinner: 'M4 10h16M5 10v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7M2 10h2M20 10h2M9.5 7c0-1 1-1.2 1-2.2M14 7c0-1 1-1.2 1-2.2',
  laundry: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM4 7h16M12 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z',
  bath: 'M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  gym: 'M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M10 21v-6h4v6',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'm15 6-6 6 6 6',
  down: 'm6 9 6 6 6-6',
  chevron: 'm9 6 6 6-6 6',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  doc: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  play: 'M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z',
  pause: 'M8 5v14M16 5v14',
  snow: 'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  minus: 'M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
} as const;

export type IconName = keyof typeof ICONS;

export const KID_ICONS: Record<KidIcon, string> = {
  backpack: 'M6 8a6 6 0 0 1 12 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2zM9 4.5V3h6v1.5M9 13h6v4H9z',
  bowl: 'M3 11h18c0 5-4 9-9 9s-9-4-9-9zM8 4.5v3M12 3.5v4M16 4.5v3',
  tooth: 'M7 3c-2.2 0-4 1.8-4 4.2 0 2.8 1.4 4.3 1.9 7.2.5 3 .9 6.6 2.6 6.6s1.6-4.5 4.5-4.5 2.8 4.5 4.5 4.5 2.1-3.6 2.6-6.6c.5-2.9 1.9-4.4 1.9-7.2C21 4.8 19.2 3 17 3c-2 0-3 1-5 1S9 3 7 3z',
  shirt: 'M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3c0 1.7-1.8 3-4 3S8 4.7 8 3z',
  book: 'M3 5.5c3-1.5 6-1.5 9 0v14c-3-1.5-6-1.5-9 0zM21 5.5c-3-1.5-6-1.5-9 0v14c3-1.5 6-1.5 9 0z',
  bath: ICONS.bath,
  moon: ICONS.moon,
  star: ICONS.star,
};

export function Icon({ name, d, size = 22, color = '#F3F1EA', width = 1.75, fill = 'none' }: { name?: IconName; d?: string; size?: number; color?: string; width?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d ?? (name ? ICONS[name] : '')} fill={fill} stroke={fill === 'none' ? color : 'none'} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
