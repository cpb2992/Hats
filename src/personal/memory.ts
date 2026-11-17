import { addDays, todayISO } from "../engine/dates";
import type { PersonalData, PersonalHat, PersonalTask } from "./model";

export type MemoryRule =
  | { kind: "priority" }
  | { kind: "window"; start: string; end: string }
  | { kind: "small"; minutes: number };
export interface PersonalMemory {
  id: string;
  text: string;
  hat: PersonalHat;
  source: "you" | "pattern";
  createdAt: string;
  updatedAt: string;
  expiresOn?: string;
  rule?: MemoryRule;
}
export interface MemoryState {
  items: PersonalMemory[];
  learnFromCompletions: boolean;
  dismissed: string[];
}
export const emptyMemory = (): MemoryState => ({ items: [], learnFromCompletions: false, dismissed: [] });
export const activeMemories = (data: PersonalData, date: string) =>
  (data.memory?.items ?? []).filter((m) => !m.expiresOn || m.expiresOn >= date);

/** One live rule per hat and kind. New corrections replace old preferences. */
export function keepMemory(data: PersonalData, memory: PersonalMemory) {
  data.memory ??= emptyMemory();
  data.memory.items = data.memory.items.filter((m) =>
    m.id !== memory.id && !(memory.rule && m.hat === memory.hat && m.rule?.kind === memory.rule.kind),
  );
  data.memory.items.push(memory);
}
export function taskMemories(data: PersonalData, task: PersonalTask, date: string) {
  return activeMemories(data, date).filter((m) => m.hat === task.hat);
}
export function memoryPriority(data: PersonalData, task: PersonalTask, date: string) {
  const memories = taskMemories(data, task, date);
  return Number(memories.some((m) => m.rule?.kind === "priority")) * 2 +
    Number(memories.some((m) => m.rule?.kind === "small" && task.minutes <= m.rule.minutes));
}
export function preferredWindow(data: PersonalData, task: PersonalTask, date: string) {
  const rule = taskMemories(data, task, date).find((m) => m.rule?.kind === "window")?.rule;
  return rule?.kind === "window" ? rule : null;
}

export interface MemorySuggestion {
  key: string;
  hat: PersonalHat;
  count: number;
  days: number;
  start: string;
  end: string;
}
/** Completion is evidence of timing, never proof of preference. Review before use.
 * Ignore appointments, other household members, future timestamps and old history.
 */
export function memorySuggestions(data: PersonalData, today: string): MemorySuggestion[] {
  if (!data.memory?.learnFromCompletions) return [];
  const first = addDays(today, -28);
  const groups = new Map<PersonalHat, { day: string; band: number }[]>();
  const seen = new Set<string>();
  for (const task of data.tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    if (!task.doneAt || task.fixed || (task.assignee && task.assignee !== data.household?.me)) continue;
    const completed = new Date(task.doneAt);
    if (!Number.isFinite(completed.getTime())) continue;
    const day = todayISO(completed);
    // Wait until the next day so today's incomplete sample cannot steer the plan.
    if (day < first || day >= today) continue;
    const hour = completed.getHours();
    const band = hour < 6 || hour >= 23 ? -1 : hour < 12 ? 0 : hour < 17 ? 1 : 2;
    groups.set(task.hat, [...(groups.get(task.hat) ?? []), { day, band }]);
  }
  const out: MemorySuggestion[] = [];
  for (const [hat, entries] of groups) {
    if (activeMemories(data, today).some((m) => m.hat === hat && m.rule?.kind === "window")) continue;
    for (let band = 0; band < 3; band++) {
      const hits = entries.filter((e) => e.band === band);
      const days = new Set(hits.map((h) => h.day)).size;
      const key = `timing:${hat}:${band}`;
      if (hits.length < 4 || days < 3 || hits.length / entries.length < 0.7 || data.memory.dismissed.includes(key)) continue;
      const [start, end] = [["06:00", "12:00"], ["12:00", "17:00"], ["17:00", "23:00"]][band];
      out.push({ key, hat, count: hits.length, days, start, end });
    }
  }
  return out;
}
