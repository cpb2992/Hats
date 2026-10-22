import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { CAP_PATH, CAP_SEAMS } from './kit';
import { C } from './theme';

/** Quiet spot illustrations for empty and celebration moments, drawn in the same line style as the icons. */
export function AllClearSpot({ size = 150 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Circle cx={100} cy={82} r={58} fill={C.raised2} />
      <Circle cx={89} cy={26} r={3.5} fill="none" stroke={C.ink2} strokeWidth={1.75} />
      <Path d="M89 30v22" stroke={C.ink2} strokeWidth={1.75} strokeLinecap="round" />
      <G transform="translate(34 16.5) scale(5)">
        <Path d={CAP_PATH} fill="none" stroke={C.gold} strokeWidth={0.35} strokeLinejoin="round" />
        <Path d={CAP_SEAMS} fill="none" stroke={C.gold} strokeWidth={0.25} strokeDasharray="0.5 0.4" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export function WeekDoneSpot({ size = 150 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Path d="M36 126h128" stroke="#3A443F" strokeWidth={1.75} strokeLinecap="round" />
      <Rect x={52} y={92} width={22} height={34} rx={5} fill="none" stroke={C.ink2} strokeWidth={1.75} />
      <Rect x={89} y={70} width={22} height={56} rx={5} fill="none" stroke={C.ink2} strokeWidth={1.75} />
      <Rect x={126} y={46} width={22} height={80} rx={5} fill={C.goldSoft} stroke={C.gold} strokeWidth={1.75} />
      <G transform="translate(118 16) rotate(-12 18 20) scale(1.7)">
        <Path d={CAP_PATH} fill={C.gold} />
      </G>
    </Svg>
  );
}

export function EmptyPeopleSpot({ size = 150 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 200 150">
      <Circle cx={78} cy={70} r={30} fill="#3E5C9A" />
      <Circle cx={78} cy={70} r={25} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.4} strokeDasharray="3 2.6" />
      <Circle cx={124} cy={84} r={24} fill={C.raised2} />
      <Circle cx={124} cy={84} r={20} fill="none" stroke={C.gold} strokeWidth={1.4} strokeDasharray="3 2.6" />
      <Path d="M124 76v16M116 84h16" stroke={C.gold} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}
