'use no memo';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { HATS } from '../engine/hats';
import type { AppData } from '../engine/types';
import type { LogView, NowView } from '../engine/widgets';
import { logView, nowView } from '../engine/widgets';

/** Home-screen widgets, drawn in the Premium style: dark ink, warm white, one gold. */

export const WIDGETS = { now: 'HatsNow', log: 'HatsLog', say: 'HatsSay' } as const;

const BG = '#161C19';
const INK = '#F3F1EA';
const INK2 = '#9AA39D';
const GOLD = '#F2C14E';
const ON_GOLD = '#0D110F';
const RAISED = '#1E2521';
const DISPLAY = 'BricolageGrotesque-SemiBold';
const SEMI = 'InterTight-SemiBold';
const BOLD = 'InterTight-Bold';
const MED = 'InterTight-Medium';

const CAP = 'M4 15a7 7 0 0 1 14 0c2.5 0 4 .6 4.5 1.6-2 .7-5.5.8-8.5.4H9c-3 0-5-.8-5-2z';
const capSvg = (color = GOLD) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 6.5 20 12"><path d="${CAP}" fill="${color}"/></svg>`;
const lineSvg = (d: string, color: string, w = 2) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MIC = 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4';
const CHECK = 'M20 6 9 17l-5-5';
const PLAY = 'M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z';
const playSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${PLAY}" fill="${ON_GOLD}"/></svg>`;

function patchSvg(hat: keyof typeof HATS) {
  const def = HATS[hat];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="${def.color}"/><circle cx="24" cy="24" r="18.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.3" stroke-dasharray="2.2 1.9"/><g transform="translate(13 13) scale(0.917)"><path d="${def.glyph}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}

function Header({ label, status }: { label: string; status: string }) {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <SvgWidget svg={capSvg()} style={{ width: 24, height: 15 }} />
        <TextWidget text={label} style={{ fontSize: 12, fontFamily: BOLD, color: GOLD }} />
      </FlexWidget>
      <TextWidget text={status} maxLines={1} truncate="END" style={{ fontSize: 12, fontFamily: SEMI, color: INK2 }} />
    </FlexWidget>
  );
}

export function NowWidget({ view, height, flash }: { view: NowView; height: number; flash?: string }) {
  const roomy = height >= 150;
  const label = view.mode === 'class' ? 'IN CLASS' : view.mode === 'meeting' ? 'MEETING' : 'NOW';
  const open = view.mode === 'meeting' ? { clickAction: 'OPEN_URI', clickActionData: { uri: 'hats://capture' } } : { clickAction: 'OPEN_APP' };
  return (
    <FlexWidget
      {...open}
      accessibilityLabel={`Hats. ${label}: ${view.title}`}
      style={{ width: 'match_parent', height: 'match_parent', backgroundColor: BG, borderRadius: 24, padding: 16, flexDirection: 'column', justifyContent: 'space-between' }}>
      <Header label={label} status={flash ?? view.status} />
      <TextWidget text={view.title} maxLines={roomy ? 3 : 2} truncate="END" style={{ fontSize: roomy ? 24 : 19, fontFamily: DISPLAY, color: INK }} />
      {view.mode === 'task' && view.hat && view.taskId ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
          <SvgWidget svg={patchSvg(view.hat)} style={{ width: 24, height: 24 }} />
          <TextWidget text={view.meta ?? ''} maxLines={1} truncate="END" style={{ fontSize: 12, fontFamily: MED, color: INK2 }} />
          <FlexWidget style={{ flex: 1 }} />
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: `hats://focus?id=${view.taskId}&max=${view.focusMin ?? 25}` }}
            accessibilityLabel={`Focus for ${view.focusMin} minutes`}
            style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
            <SvgWidget svg={playSvg} style={{ width: 14, height: 14 }} />
            <TextWidget text={`${view.focusMin}m`} style={{ fontSize: 14, fontFamily: BOLD, color: ON_GOLD }} />
          </FlexWidget>
          <FlexWidget
            clickAction="DONE"
            clickActionData={{ id: view.taskId }}
            accessibilityLabel="Done"
            style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(243, 241, 234, 0.25)', alignItems: 'center', justifyContent: 'center' }}>
            <SvgWidget svg={lineSvg(CHECK, INK, 2.6)} style={{ width: 18, height: 18 }} />
          </FlexWidget>
        </FlexWidget>
      ) : view.mode === 'clear' ? (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'hats://capture' }}
          accessibilityLabel="Say anything"
          style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: RAISED, flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <SvgWidget svg={lineSvg(MIC, GOLD)} style={{ width: 16, height: 16 }} />
          <TextWidget text="Say anything" style={{ fontSize: 13, fontFamily: SEMI, color: INK }} />
        </FlexWidget>
      ) : (
        <TextWidget text={view.waiting ?? ''} maxLines={1} truncate="END" style={{ fontSize: 12, fontFamily: MED, color: INK2 }} />
      )}
    </FlexWidget>
  );
}

export function LogWidget({ view, width, flash }: { view: LogView; width: number; flash?: string }) {
  const fit = Math.max(2, Math.min(6, Math.floor((width - 32) / 62)));
  const shown = view.students.slice(0, fit);
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'hats://caseload' }} accessibilityLabel={`Hats caseload. ${view.header}`} style={{ width: 'match_parent', height: 'match_parent', backgroundColor: BG, borderRadius: 24, padding: 16, flexDirection: 'column', justifyContent: 'space-between' }}>
      <Header label={view.header.toUpperCase()} status={flash ?? view.sub} />
      {shown.length ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {shown.map(st => (
            <FlexWidget
              key={st.id}
              {...(st.trials ? { clickAction: 'OPEN_URI', clickActionData: { uri: `hats://student/${st.id}` } } : { clickAction: 'LOG', clickActionData: { id: st.id } })}
              accessibilityLabel={st.trials ? `Open ${st.initials} to log a check` : `Log one for ${st.initials}`}
              style={{ flexDirection: 'column', alignItems: 'center', flexGap: 4 }}>
              <FlexWidget style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#3E5C9A', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.45)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
                <TextWidget text={st.initials} style={{ fontSize: 13, fontFamily: BOLD, color: INK }} />
              </FlexWidget>
              <TextWidget text={st.trials ? `${st.count} · x/n` : `${st.count} · +1`} style={{ fontSize: 11, fontFamily: SEMI, color: st.count ? GOLD : INK2 }} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <TextWidget text="Add students by initials in Hats → Caseload." maxLines={2} style={{ fontSize: 14, fontFamily: MED, color: INK2 }} />
      )}
    </FlexWidget>
  );
}

export function SayWidget({ width }: { width: number }) {
  const wide = width >= 140;
  return (
    <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: 'hats://capture' }} accessibilityLabel="Say anything" style={{ width: 'match_parent', height: 'match_parent', backgroundColor: GOLD, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexGap: 10 }}>
      <SvgWidget svg={lineSvg(MIC, ON_GOLD, 2)} style={{ width: 26, height: 26 }} />
      {wide ? <TextWidget text="Say anything" style={{ fontSize: 17, fontFamily: DISPLAY, color: ON_GOLD }} /> : null}
    </FlexWidget>
  );
}

function SetupWidget() {
  return (
    <FlexWidget clickAction="OPEN_APP" accessibilityLabel="Open Hats to get started" style={{ width: 'match_parent', height: 'match_parent', backgroundColor: BG, borderRadius: 24, padding: 16, flexDirection: 'column', justifyContent: 'center', flexGap: 8 }}>
      <SvgWidget svg={capSvg()} style={{ width: 40, height: 24 }} />
      <TextWidget text="Open Hats to pick your hats." style={{ fontSize: 15, fontFamily: SEMI, color: INK }} />
    </FlexWidget>
  );
}

export function renderFor(name: string, data: AppData | null, size: { width: number; height: number }, today: string, nowMin: number, flash?: string) {
  if (name === WIDGETS.say) return <SayWidget width={size.width} />;
  if (!data || !data.settings.onboarded) return <SetupWidget />;
  if (name === WIDGETS.log) return <LogWidget view={logView(data, today, nowMin)} width={size.width} flash={flash} />;
  return <NowWidget view={nowView(data, today, nowMin)} height={size.height} flash={flash} />;
}
