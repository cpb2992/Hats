import type { PersonalData, PersonalTask } from "./model";
import { id } from "./model";
import { keepMemory } from "./memory";
import { recordUse } from "./productUse";

export function preferEarlier(data: PersonalData, task: PersonalTask, date: string) {
  const at = new Date().toISOString();
  keepMemory(data, { id: id(), hat: task.hat, text: "I prefer tasks for this hat earlier in the day, when there is a safe opening.", source: "you", createdAt: at, updatedAt: at, rule: { kind: "window", start: "06:00", end: "17:00" } });
  recordUse(data, date, "corrections");
}
export function stopSuggesting(data: PersonalData, task: PersonalTask, date: string) {
  if (task.fixed || task.essential) throw new Error("Keep fixed commitments and essential care visible. Edit the task instead.");
  data.mutedSuggestions = [...new Set([...(data.mutedSuggestions ?? []), task.source ?? task.id])];
  recordUse(data, date, "corrections");
}
export function acceptResponsibility(data: PersonalData, taskId: string, date: string) {
  const task = data.tasks.find(t => t.id === taskId);
  const me = data.household?.me;
  if (!task?.shared || !me || task.assignee !== me) return false;
  task.acceptedBy = me;
  recordUse(data, date, "sharedAccepted");
  return true;
}
