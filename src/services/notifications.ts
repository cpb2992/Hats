import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { planNotifications } from '../engine/notify';
import type { AppData } from '../engine/types';

export const remindersSupported = Platform.OS !== 'web';

const FOCUS_LIVE = 'focus-live';
const FOCUS_END = 'focus-end';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || Platform.OS !== 'android') return;
  // eslint-disable-next-line import/namespace -- AndroidImportance is re-exported from the package index
  const I = Notifications.AndroidImportance;
  await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: I.DEFAULT, lightColor: '#F2C14E' });
  // eslint-disable-next-line import/namespace -- AndroidNotificationVisibility is re-exported from the package index
  await Notifications.setNotificationChannelAsync('focus', { name: 'Focus timer', importance: I.LOW, lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, showBadge: false });
  await Notifications.setNotificationChannelAsync('times-up', { name: 'Focus finished', importance: I.HIGH, lightColor: '#F2C14E' });
  channelsReady = true;
}

/** Asks for permission only when `ask` is true; otherwise just reports the current state. */
export async function notificationsAllowed(ask: boolean): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

/** Replaces Hats' scheduled reminders with the plan for the coming week. Leaves a running focus timer alone. */
export async function syncReminders(data: AppData): Promise<void> {
  if (!remindersSupported || !data.settings.onboarded) return;
  if (!(await notificationsAllowed(false))) return;
  await ensureChannels();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter(n => n.identifier.startsWith('sync-')).map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  for (const p of planNotifications(data, new Date())) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, data: { url: p.url }, color: '#F2C14E' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: 'reminders' },
    });
  }
}

/** Shows the running focus timer on the lock screen and schedules the "time's up" alert. */
export async function startFocusNotice(title: string, endsAt: Date): Promise<void> {
  if (!remindersSupported || !(await notificationsAllowed(false))) return;
  await ensureChannels();
  const ends = endsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_LIVE,
    content: { title: `Focusing · until ${ends}`, body: title, sticky: true, autoDismiss: false, data: { url: '/' }, color: '#F2C14E' },
    trigger: Platform.OS === 'android' ? { channelId: 'focus' } : null,
  });
  await Notifications.cancelScheduledNotificationAsync(FOCUS_END).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: FOCUS_END,
    content: { title: 'Time’s up', body: `${title}. Done, or five more minutes?`, data: { url: '/' }, color: '#F2C14E' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: 'times-up' },
  });
}

export async function stopFocusNotice(): Promise<void> {
  if (!remindersSupported) return;
  await Notifications.cancelScheduledNotificationAsync(FOCUS_END).catch(() => {});
  await Notifications.dismissNotificationAsync(FOCUS_LIVE).catch(() => {});
}

export async function sendTestReminder(): Promise<boolean> {
  if (!(await notificationsAllowed(true))) return false;
  await ensureChannels();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Hats is set', body: 'Reminders will look like this.', color: '#F2C14E' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: 'reminders' },
  });
  return true;
}
