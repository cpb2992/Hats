import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { Platform } from "react-native";
import type { PersonalData } from "./model";
import { applyPersonalReminders, noticeRevision, personalReminderPlan, type Notice, type ReminderPort } from "./reminderPlan";

const channel = "hats-personal";
const liveChannel = "hats-personal-plan";
let channelsReady = false;
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: notification.request.content.data?.personalLive !== true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

async function ensureChannels() {
  if (channelsReady) return;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(channel, {
      name: "Personal reminders",
      importance: AndroidImportance.DEFAULT,
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    });
    await Notifications.setNotificationChannelAsync(liveChannel, {
      name: "Current plan · silent",
      importance: AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
      lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
    });
  }
  await Notifications.setNotificationCategoryAsync("personalTask", [
    { identifier: "PERSONAL_DONE", buttonTitle: "Next step done", options: { opensAppToForeground: true } },
    { identifier: "PERSONAL_LATER", buttonTitle: "Next available time", options: { opensAppToForeground: true } },
  ]);
  channelsReady = true;
}
export async function enableReminders() {
  if (Platform.OS === "web") throw new Error("Phone notifications are available in the installed app.");
  const result = await Notifications.requestPermissionsAsync();
  if (!result.granted) throw new Error("Allow notifications in your phone settings to receive reminders.");
  await ensureChannels();
}

async function post(notice: Notice, live: boolean) {
  await Notifications.scheduleNotificationAsync({
    identifier: notice.identifier,
    content: {
      title: notice.title,
      body: notice.body,
      sound: false,
      ...(live ? { sticky: true, autoDismiss: false } : {}),
      ...(notice.taskId ? { categoryIdentifier: "personalTask" } : {}),
      data: { url: notice.url, ...(notice.taskId ? { taskId: notice.taskId } : {}),
        personalLive: live, personalRevision: noticeRevision(notice) },
    },
    trigger: live ? { channelId: liveChannel } : {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(notice.at!),
      channelId: channel,
    },
  });
}
const port: ReminderPort = {
  scheduled: async () => (await Notifications.getAllScheduledNotificationsAsync()).map((n) => ({ identifier: n.identifier, revision: n.content.data?.personalRevision })),
  presented: async () => (await Notifications.getPresentedNotificationsAsync()).map((n) => ({ identifier: n.request.identifier, revision: n.request.content.data?.personalRevision })),
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  dismiss: (id) => Notifications.dismissNotificationAsync(id),
  post,
};

// Saves and minute ticks can overlap. Serialize native reads/writes to prevent duplicates.
let pending = Promise.resolve();
export function syncPersonalReminders(data: PersonalData): Promise<void> {
  if (Platform.OS === "web") return Promise.resolve();
  const operation = pending.catch(() => {}).then(async () => {
    const permission = await Notifications.getPermissionsAsync();
    const enabled = permission.granted && data.preferences.notifications;
    if (enabled) await ensureChannels();
    await applyPersonalReminders(port, personalReminderPlan(data), enabled, Platform.OS === "android");
  });
  pending = operation;
  return operation;
}
