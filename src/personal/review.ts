/**
 * When to ask for a Play Store rating: only after someone has clearly gotten value (15 things
 * finished across at least 5 different days), right after they check something off, and at most
 * once every four months. Google also limits how often its rating sheet appears.
 */
import { addDays } from "../engine/dates";
import type { PersonalData } from "./model";

export const REVIEW_MIN_DONE = 15;
export const REVIEW_MIN_DAYS = 5;
export const REVIEW_GAP_DAYS = 120;

export function shouldAskForReview(data: PersonalData, today: string, lastAsked: string | null): boolean {
  if (lastAsked && addDays(lastAsked, REVIEW_GAP_DAYS) > today) return false;
  const done = data.tasks.filter((t) => t.doneAt);
  const days = new Set(done.map((t) => t.doneAt!.slice(0, 10)));
  return done.length >= REVIEW_MIN_DONE && days.size >= REVIEW_MIN_DAYS;
}
