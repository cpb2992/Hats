import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { completeTask, logPoint } from '../engine/actions';
import { nowMinutes, todayISO } from '../engine/dates';
import { loadData, notifyExternalChange, saveData } from '../store/storage';
import { renderFor } from './render';

/**
 * Runs when a widget is added, refreshed, resized or tapped. Taps on Done and +1 change saved data
 * right from the home screen, then redraw the widget; an open app reloads when it hears about it.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetAction === 'WIDGET_DELETED') return;
  const today = todayISO();
  const nowMin = nowMinutes();
  let data = null;
  try { data = await loadData(); } catch { data = null; }
  let flash: string | undefined;

  if (props.widgetAction === 'WIDGET_CLICK' && data) {
    const id = String(props.clickActionData?.id ?? '');
    if (props.clickAction === 'DONE' && id) {
      completeTask(data, id, new Date().toISOString());
      await saveData(data);
      notifyExternalChange();
      flash = 'Done. Nice.';
    } else if (props.clickAction === 'LOG' && id) {
      const st = data.students.find(s => s.id === id);
      const g = st?.goals[0];
      if (st && g && g.kind === 'tally') {
        logPoint(data, st.id, g.id, today, 1);
        await saveData(data);
        notifyExternalChange();
        flash = `Logged for ${st.initials}`;
      }
    }
  }

  props.renderWidget(renderFor(props.widgetInfo.widgetName, data, props.widgetInfo, today, nowMin, flash));
}
