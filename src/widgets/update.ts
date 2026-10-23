import { Platform } from 'react-native';
import { requestPinWidget, requestWidgetUpdate } from 'react-native-android-widget';
import { nowMinutes, todayISO } from '../engine/dates';
import type { AppData } from '../engine/types';
import { renderFor, WIDGETS } from './render';

export const widgetsSupported = Platform.OS === 'android';

/** Redraws any Hats widgets on the home screen from the app's current data. */
export async function updateWidgets(data: AppData): Promise<void> {
  if (!widgetsSupported) return;
  const today = todayISO();
  const nowMin = nowMinutes();
  for (const name of [WIDGETS.now, WIDGETS.log]) {
    try {
      await requestWidgetUpdate({ widgetName: name, renderWidget: info => renderFor(name, data, info, today, nowMin) });
    } catch {
      // No widget of this kind on the home screen, or the launcher isn't ready.
    }
  }
}

/** Asks the launcher to place a widget. Returns false when the launcher can't do it from inside an app. */
export async function pinWidget(name: string): Promise<boolean> {
  if (!widgetsSupported) return false;
  try { return await requestPinWidget({ widgetName: name }); } catch { return false; }
}
