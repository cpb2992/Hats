import * as Notifications from "expo-notifications";
import {
  AndroidImportance,
  AndroidNotificationVisibility,
} from "expo-notifications";
import { Platform } from "react-native";
import { addDays, todayISO, nowMinutes } from "../engine/dates";
import { planDay } from "./engine";
import type { PersonalData } from "./model";

const channel = "hats-personal";
if (Platform.OS !== "web")
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
export async function enableReminders() {
  if (Platform.OS === "web")
    throw new Error("Phone notifications are available in the installed app.");
  const result = await Notifications.requestPermissionsAsync();
  if (!result.granted)
    throw new Error(
      "Allow notifications in your phone settings to receive reminders.",
    );
  await Notifications.setNotificationChannelAsync(channel, {
    name: "Personal reminders",
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
  await Notifications.setNotificationCategoryAsync("personal-task", [
    {
      identifier: "PERSONAL_DONE",
      buttonTitle: "Next step done",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "PERSONAL_LATER",
      buttonTitle: "Next available time",
      options: { opensAppToForeground: true },
    },
  ]);
}
export async function syncPersonalReminders(data: PersonalData) {
  if (Platform.OS === "web") return;
  const permission = await Notifications.getPermissionsAsync();
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing)
    if (
      n.identifier.startsWith("personal-") ||
      n.identifier.startsWith("sync-")
    )
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
  if (!permission.granted || !data.preferences.notifications) {
    await Notifications.dismissNotificationAsync("personal-now");
    return;
  }
  await Notifications.setNotificationChannelAsync(channel, {
    name: "Personal reminders",
    importance: AndroidImportance.DEFAULT,
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  });
  await Notifications.setNotificationCategoryAsync("personal-task", [
    {
      identifier: "PERSONAL_DONE",
      buttonTitle: "Next step done",
      options: { opensAppToForeground: true },
    },
    {
      identifier: "PERSONAL_LATER",
      buttonTitle: "Next available time",
      options: { opensAppToForeground: true },
    },
  ]);
  const today = todayISO();
  const now = nowMinutes();
  for (let n = 0; n < 7; n++)
    for (const [name, time] of [
      ["morning", data.preferences.morningReminder],
      ["evening", data.preferences.eveningReminder],
    ]) {
      const date = new Date(`${addDays(today, n)}T${time}:00`);
      if (date.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `personal-${name}-${n}`,
        content: {
          title:
            name === "morning"
              ? "A little room for what matters"
              : "Your evening, made simpler",
          body: "Open Hats for your personal plan.",
          data: { url: "/" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: channel,
        },
      });
    }
  const plan = planDay(data, today, now);
  let count = 0;
  for (const item of plan) {
    if (!item.time) continue;
    const at = new Date(`${item.date}T${item.time}:00`);
    if (at.getTime() <= Date.now() + 60000) continue;
    if (count++ >= 12) break;
    await Notifications.scheduleNotificationAsync({
      identifier: `personal-task-${item.task.id}`,
      content: {
        title: "A personal commitment is ready",
        body: "Open Hats to see your next step.",
        categoryIdentifier: "personal-task",
        data: { url: "/", taskId: item.task.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        channelId: channel,
      },
    });
  }
  const next = plan.find((x) => x.time);
  if (next) {
    await Notifications.scheduleNotificationAsync({
      identifier: "personal-now",
      content: {
        title: "Hats · your personal plan",
        body: "A next step is ready when you are.",
        sticky: true,
        autoDismiss: false,
        categoryIdentifier: "personal-task",
        data: { url: "/", taskId: next.task.id },
      },
      trigger: Platform.OS === "android" ? { channelId: channel } : null,
    });
  } else await Notifications.dismissNotificationAsync("personal-now");
}
