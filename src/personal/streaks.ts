import { addDays, weekStart, daysBetween } from "../engine/dates";
import type { Habit } from "./model";

/** Daily streaks count days; weekly streaks count weeks in which the chosen target was met. */
export function streakFor(habit: Habit, today: string) {
  const dates = [...new Set(habit.checkins.filter((d) => d <= today))].sort();
  if (habit.frequency === "daily") {
    const set = new Set(dates);
    let cursor = set.has(today) ? today : addDays(today, -1);
    let current = 0;
    while (set.has(cursor)) {
      current++;
      cursor = addDays(cursor, -1);
    }
    let best = 0,
      run = 0,
      previous = "";
    for (const date of dates) {
      run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    }
    return {
      current,
      best,
      progress: set.has(today) ? 1 : 0,
      target: 1,
      unit: "day",
      done: set.has(today),
    };
  }
  const counts = new Map<string, number>();
  for (const date of dates) {
    const week = weekStart(date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  const thisWeek = weekStart(today);
  const met = (week: string) => (counts.get(week) ?? 0) >= habit.target;
  let cursor = met(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  let current = 0;
  while (met(cursor)) {
    current++;
    cursor = addDays(cursor, -7);
  }
  let best = 0,
    run = 0,
    previous = "";
  for (const week of [...counts.keys()].sort()) {
    if (!met(week)) {
      run = 0;
      previous = week;
      continue;
    }
    run = previous && daysBetween(previous, week) === 7 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = week;
  }
  return {
    current,
    best,
    progress: counts.get(thisWeek) ?? 0,
    target: habit.target,
    unit: "week",
    done: dates.includes(today),
  };
}
