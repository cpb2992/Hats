import type { PlannedTask } from "./engine";

/**
 * Pure selection logic for the home-screen widget. A fixed appointment from
 * yesterday or an already-ended slot must not keep appearing as "next up".
 * The day planner itself decides when flexible tasks safely fit.
 */
export type WidgetNextPhase = "now" | "upcoming" | "flexible" | "waiting" | "clear";
export interface WidgetNext {
  item: PlannedTask | null;
  phase: WidgetNextPhase;
}

function minuteOf(time: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function chooseWidgetNext(
  plan: readonly PlannedTask[],
  today: string,
  nowMin: number,
): WidgetNext {
  const open = plan.filter((entry) => !entry.task.doneAt);
  const timed = open.flatMap((item) => {
    // Fixed commitments from earlier dates remain in the backlog, not today.
    if (!item.time || (item.task.fixed && item.task.date !== today)) return [];
    const at = minuteOf(item.time);
    return at === null ? [] : [{ item, at }];
  });

  const active = timed
    .filter(({ item, at }) => at <= nowMin && nowMin < at + Math.max(5, item.task.minutes))
    .sort((a, b) =>
      Number(b.item.task.fixed) - Number(a.item.task.fixed) ||
      Number(b.item.task.essential) - Number(a.item.task.essential) ||
      b.at - a.at,
    )[0];
  if (active) return { item: active.item, phase: "now" };

  // The next fixed commitment takes priority over an optional future to-do.
  const future = timed.filter(({ at }) => at > nowMin);
  const nextFixed = future
    .filter(({ item }) => item.task.fixed)
    .sort((a, b) => a.at - b.at)[0];
  if (nextFixed) return { item: nextFixed.item, phase: "upcoming" };

  // A flexible task appears only when Hats has actually found it an opening.
  const nextFlexible = future
    .filter(({ item }) => !item.task.fixed)
    .sort((a, b) =>
      a.at - b.at || Number(b.item.task.essential) - Number(a.item.task.essential),
    )[0];
  if (nextFlexible) return { item: nextFlexible.item, phase: "flexible" };

  // Don't claim everything is complete while tasks are still waiting for room.
  return { item: null, phase: open.length > 0 ? "waiting" : "clear" };
}
