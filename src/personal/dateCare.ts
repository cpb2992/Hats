import type { DatePlan } from "./model";
export function confirmChildcare(plan: DatePlan, confirmed: boolean) {
  plan.childcareConfirmed = confirmed;
  for (const step of plan.steps) if (/confirm childcare/i.test(step.title)) step.done = confirmed;
}
export function changeDateTime(plan: DatePlan, time: string) {
  if ((plan.time ?? "19:00") !== time) confirmChildcare(plan, false);
  plan.time = time;
}
