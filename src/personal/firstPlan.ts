import { makeTask } from "./engine";
import { HAT_IDS, validDate, type BuiltInHat, type PersonalData } from "./model";
import { recordUse } from "./productUse";
/** A real first commitment, without inventing a family or working hours. */
export function createFirstPlan(data: PersonalData, title: string, date: string, time: string, hat: BuiltInHat, today: string) {
  if (!title.trim() || title.trim().length > 200 || !validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !["home", "work", "myself"].includes(hat)) throw new Error("Add a title, valid date and start time.");
  if (!data.preferences.onboarded) {
    data.preferences.onboarded = true;
    data.preferences.kidsRoutine = false;
    data.preferences.routinesConfigured = false;
    data.preferences.bathNights = "off";
    data.preferences.unavailableDays = [];
    data.preferences.school = { on: false };
    data.preferences.hiddenHats = HAT_IDS.filter(h => !["home", "work", "myself"].includes(h));
    data.preferences.hatNames = { work: "Work" };
    data.preferences.hatArt = { work: "bowler" };
  }
  data.tasks.push(makeTask(title.trim(), hat, date, { time, fixed: true }));
  recordUse(data, today, "firstPlan");
}
