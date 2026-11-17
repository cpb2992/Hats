import { addDays } from "../engine/dates";
import type { PersonalData } from "./model";

/** Aggregate counts stay in the user's encrypted data. Never sent to an analytics service. */
export function recordUse(data: PersonalData, day: string, event?: "dayChanges" | "corrections" | "sharedAccepted" | "firstPlan") {
  data.productUse ??= { days: [], dayChanges: 0, corrections: 0, sharedAccepted: 0 };
  const use = data.productUse;
  use.days = [...new Set([...use.days, day])].filter(d => d >= addDays(day, -35)).sort();
  if (event === "firstPlan") use.firstPlanOn ??= day;
  else if (event) use[event]++;
}
