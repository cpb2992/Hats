'use no memo';
/**
 * Hats 2.0 home-screen widgets.
 *
 * These are native Android RemoteViews, not React Native Views.  Keep the
 * components limited to the primitives supported by react-native-android-widget.
 * The art, color and thick sticker outlines intentionally match the public
 * app's hat stickers / Today's dark hero card.
 */
import { dayTimeline, nowAndNext, type TimelineItem } from './timeline';
import { Platform } from 'react-native';
import {
  FlexWidget,
  SvgWidget,
  TextWidget,
  requestPinWidget,
  requestWidgetUpdate,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import { nowMinutes, todayISO, fmtTime } from '../engine/dates';
import { finishStep, nextStep, reschedule } from './engine';
import { type PersonalData, type PersonalTask, hatDef } from './model';
import { hatSvg, type HatArtId } from './hatArt';
import { loadPersonal, savePersonal } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Same daylight palette as src/personal/palette.ts and hatArt.ts. */
const C = {
  ink: '#1D2D45',
  deeper: '#14223A',
  paper: '#FFF4E3',
  white: '#FFFDF8',
  muted: '#56647A',
  lightInk: '#E9EFFB',
  sun: '#F7C948',
  sky: '#DCE9FA',
  peach: '#FFE2CA',
  coral: '#E8735A',
  blue: '#3D65A2',
} as const;
const DISPLAY = 'BricolageGrotesque-SemiBold';
const SEMI = 'InterTight-SemiBold';
const BOLD = 'InterTight-Bold';

const STAR = `<${"svg"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><${"path"} d="M16 2.5 19.2 11l8.9 1.6-7 5.9 1.6 9-6.7-4.5-7 4.5 1.6-9-7-5.9 8.8-1.6z" fill="${C.sun}" stroke="${C.ink}" stroke-width="2.1" stroke-linejoin="round"/></svg>`;
const SPARK = `<${"svg"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><${"path"} d="M16 2v9M16 21v9M2 16h9M21 16h9M6 6l6 6M20 20l6 6M26 6l-6 6M12 20l-6 6" stroke="${C.coral}" stroke-width="2.6" stroke-linecap="round"/></svg>`;
const CHECK = `<${"svg"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><${"path"} d="m5 14 6 6L23 7" fill="none" stroke="${C.ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW = `<${"svg"} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><${"path"} d="M5 14h17m-6-6 6 6-6 6" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Only home-related tasks belong in the Home Life widget. */
const HOME_HATS = new Set(['home', 'dad', 'husband', 'pets', 'friends']);

function plannedFocus(data: PersonalData | null, homeOnly: boolean): TimelineItem | null {
  if (!data) return null;
  const now = nowMinutes(), today = todayISO();
  const items = dayTimeline(data, today, now, today).items.filter(i => !homeOnly || (i.tag && HOME_HATS.has(i.tag)));
  return nowAndNext(items, now).now;
}
function plannedTask(data: PersonalData | null, homeOnly: boolean): PersonalTask | null {
  const focus = plannedFocus(data, homeOnly);
  return data?.tasks.find(t => t.id === focus?.taskId) ?? null;
}

function HatSticker({ art, size = 44, tint = C.white }: { art: HatArtId; size?: number; tint?: string }) {
  return (
    <FlexWidget
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: 16,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: C.ink,
        backgroundColor: tint as `#${string}`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <SvgWidget svg={hatSvg(art, 64)} style={{ width: size, height: size }} />
    </FlexWidget>
  );
}

function DoneButton({ taskId, small }: { taskId: string; small: boolean }) {
  return (
    <FlexWidget
      clickAction="PERSONAL_DONE"
      clickActionData={{ id: taskId }}
      accessibilityLabel="Mark the next step complete"
      style={{
        height: small ? 29 : 36,
        paddingHorizontal: small ? 9 : 13,
        backgroundColor: C.sun,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: C.ink,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        flexGap: 5,
      }}
    >
      <SvgWidget svg={CHECK} style={{ width: 14, height: 14 }} />
      <TextWidget text="Done" style={{ fontFamily: BOLD, fontSize: small ? 12 : 13, color: C.ink }} />
    </FlexWidget>
  );
}

function LaterButton({ taskId, small, dark }: { taskId: string; small: boolean; dark: boolean }) {
  return (
    <FlexWidget
      clickAction="PERSONAL_LATER"
      clickActionData={{ id: taskId }}
      accessibilityLabel="Move this step to the next available time"
      style={{
        height: small ? 29 : 36,
        paddingHorizontal: small ? 9 : 14,
        backgroundColor: dark ? '#2F4466' : C.white,
        borderWidth: 2,
        borderBottomWidth: 4,
        borderColor: dark ? '#5A7094' : C.ink,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget
        text="Later"
        style={{ fontFamily: SEMI, fontSize: small ? 12 : 13, color: dark ? C.white : C.ink }}
      />
    </FlexWidget>
  );
}

function NowSticker({ data, width, height }: { data: PersonalData | null; width: number; height: number }) {
  const focus = plannedFocus(data, false);
  const task = plannedTask(data, false);
  const micro = height < 128;
  const compact = height < 188;
  const roomy = height >= 230;
  const narrow = width < 230;
  const art = focus?.hat ?? 'sunhat';
  const role = task ? hatDef(task.hat, data?.customHats).name : 'Your day';
  const title = task ? nextStep(task) : focus?.title ?? 'A little room for what matters.';
  const iconSize = micro ? 22 : compact ? 30 : 43;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Hats next step. ${title}`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 25,
        borderWidth: 2,
        borderBottomWidth: 6,
        borderColor: C.deeper,
        backgroundColor: C.ink,
        paddingHorizontal: micro ? 9 : compact ? 11 : 15,
        paddingVertical: micro ? 7 : compact ? 9 : 13,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <HatSticker art={art} size={iconSize} tint={task ? hatDef(task.hat, data?.customHats).tint : C.sun} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
          <TextWidget text="hats. / NEXT UP" maxLines={1} truncate="END" style={{ fontFamily: BOLD, fontSize: compact ? 10 : 11, color: C.sun }} />
          <TextWidget text={role} maxLines={1} truncate="END" style={{ fontFamily: SEMI, fontSize: compact ? 11 : 12, color: C.lightInk }} />
        </FlexWidget>
        {!narrow && !compact ? <SvgWidget svg={STAR} style={{ width: 22, height: 22 }} /> : null}
      </FlexWidget>

      <TextWidget
        text={title}
        maxLines={micro ? 1 : roomy ? 3 : 2}
        truncate="END"
        style={{ fontFamily: DISPLAY, fontSize: micro ? 16 : compact ? 18 : 21, color: C.white }}
      />

      {task ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 7 }}>
          <DoneButton taskId={task.id} small={compact} />
          {!task.fixed ? <LaterButton taskId={task.id} small={compact} dark /> : null}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <SvgWidget svg={SPARK} style={{ width: 14, height: 14 }} />
          <TextWidget text={focus ? `${fmtTime(focus.time, true)}${focus.detail ? ` · ${focus.detail}` : ''}` : 'Open Hats to see your day'} maxLines={1} truncate="END" style={{ fontFamily: SEMI, fontSize: 11, color: C.lightInk }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function HomeSticker({ data, width, height }: { data: PersonalData | null; width: number; height: number }) {
  const focus = plannedFocus(data, true);
  const task = plannedTask(data, true);
  const micro = height < 128;
  const compact = height < 188;
  const roomy = height >= 230;
  const narrow = width < 230;
  const art = focus?.hat ?? 'cap';
  const title = task ? nextStep(task) : focus?.title ?? 'Good things start at home.';
  const role = task ? hatDef(task.hat, data?.customHats).name : 'All your people. One place.';
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={`Hats home life. ${title}`}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: C.sky,
        borderRadius: 25,
        borderWidth: 2,
        borderBottomWidth: 6,
        borderColor: C.ink,
        paddingHorizontal: micro ? 9 : compact ? 11 : 15,
        paddingVertical: micro ? 7 : compact ? 9 : 13,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <HatSticker art={art} size={micro ? 22 : compact ? 30 : 43} tint={C.peach} />
        <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 2 }}>
          <TextWidget text="hats. / HOME LIFE" maxLines={1} truncate="END" style={{ fontFamily: BOLD, fontSize: compact ? 10 : 11, color: C.blue }} />
          <TextWidget text={role} maxLines={1} truncate="END" style={{ fontFamily: SEMI, fontSize: compact ? 11 : 12, color: C.ink }} />
        </FlexWidget>
        {!narrow && !compact ? <SvgWidget svg={SPARK} style={{ width: 23, height: 23 }} /> : null}
      </FlexWidget>

      <TextWidget
        text={title}
        maxLines={micro ? 1 : roomy ? 3 : 2}
        truncate="END"
        style={{ fontFamily: DISPLAY, fontSize: micro ? 16 : compact ? 18 : 21, color: C.ink }}
      />

      {task ? (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 7 }}>
          <DoneButton taskId={task.id} small={compact} />
          {!task.fixed ? <LaterButton taskId={task.id} small={compact} dark={false} /> : null}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6 }}>
          <TextWidget text="Open your home plan" style={{ fontFamily: BOLD, fontSize: 12, color: C.ink }} />
          <SvgWidget svg={ARROW} style={{ width: 14, height: 14 }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function SaySticker({ width, height }: { width: number; height: number }) {
  const tiny = width < 150 || height < 70;
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'hats://capture' }}
      accessibilityLabel="Open Hats to capture a thought"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        backgroundColor: C.sun,
        borderRadius: tiny ? 18 : 24,
        borderWidth: 2,
        borderBottomWidth: 5,
        borderColor: C.ink,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexGap: tiny ? 5 : 12,
        paddingHorizontal: tiny ? 7 : 14,
      }}
    >
      <SvgWidget svg={hatSvg('wizard', 64)} style={{ width: tiny ? 32 : 49, height: tiny ? 32 : 49 }} />
      {width >= 125 ? (
        <FlexWidget style={{ flexDirection: 'column', flexGap: 2 }}>
          <TextWidget text={tiny ? 'Say it.' : 'Catch that thought.'} maxLines={1} truncate="END" style={{ fontFamily: DISPLAY, fontSize: tiny ? 13 : 17, color: C.ink }} />
          {!tiny ? <TextWidget text="TAP TO ADD" maxLines={1} style={{ fontFamily: BOLD, fontSize: 10, color: C.blue }} /> : null}
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export function PersonalWidget({
  data,
  name,
  size,
}: {
  data: PersonalData | null;
  name: string;
  size?: { width: number; height: number };
}) {
  const width = size?.width ?? 250;
  const height = size?.height ?? (name === 'HatsSay' ? 55 : 120);
  if (name === 'HatsSay') return <SaySticker width={width} height={height} />;
  if (name === 'HatsLog') return <HomeSticker data={data} width={width} height={height} />;
  return <NowSticker data={data} width={width} height={height} />;
}

export async function updatePersonalWidgets(data: PersonalData) {
  if (Platform.OS !== 'android') return;
  for (const widgetName of ['HatsNow', 'HatsLog', 'HatsSay']) {
    await requestWidgetUpdate({
      widgetName,
      renderWidget: (info) => <PersonalWidget data={data} name={widgetName} size={info} />,
    }).catch(() => {});
  }
}

export async function pinPersonalWidget() {
  if (Platform.OS !== 'android') return false;
  return requestPinWidget({ widgetName: 'HatsNow' });
}

export async function personalWidgetHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  let data: PersonalData | null = null;
  try {
    data = await loadPersonal();
  } catch {
    /* An unreadable store must never be overwritten. */
  }
  if (data && props.widgetAction === 'WIDGET_CLICK') {
    const task = data.tasks.find(
      (t) => t.id === String(props.clickActionData?.id ?? ''),
    );
    let changed = false;
    if (task && props.clickAction === 'PERSONAL_DONE') {
      finishStep(task);
      changed = true;
    }
    if (task && props.clickAction === 'PERSONAL_LATER') {
      changed = reschedule(data, task.id, todayISO(), nowMinutes());
    }
    if (changed) {
      data.updatedAt = new Date().toISOString();
      await savePersonal(data);
      const raw = await AsyncStorage.getItem('hats.personal.sync-meta');
      const meta = raw ? JSON.parse(raw) : { owner: null, revision: 0 };
      await AsyncStorage.setItem(
        'hats.personal.sync-meta',
        JSON.stringify({ ...meta, dirty: true }),
      );
      await updatePersonalWidgets(data);
    }
  }
  props.renderWidget(
    <PersonalWidget data={data} name={props.widgetInfo.widgetName} size={props.widgetInfo} />,
  );
}
