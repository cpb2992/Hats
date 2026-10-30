/**
 * When to ask for a Play Store rating. Only after someone has clearly gotten value (several days of
 * use and a real pile of finished tasks), only at a good moment (just after shutting the day down),
 * and at most once every four months. Google also limits how often the prompt can appear.
 */
import { addDays } from './dates';
import type { AppData } from './types';

export const REVIEW_MIN_DONE = 15;
export const REVIEW_MIN_DAYS = 5;
export const REVIEW_GAP_DAYS = 120;

export function shouldAskForReview(data: AppData, today: string, lastAsked: string | null): boolean {
  if (lastAsked && addDays(lastAsked, REVIEW_GAP_DAYS) > today) return false;
  const done = data.tasks.filter(t => t.done).length;
  const daysUsed = Object.values(data.days).filter(d => d.planned || d.shutdown).length;
  return done >= REVIEW_MIN_DONE && daysUsed >= REVIEW_MIN_DAYS;
}
