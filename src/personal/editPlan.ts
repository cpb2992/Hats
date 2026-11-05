import type { DatePlan, PersonalEvent } from "./model";
import { validDate } from "./model";
import { parseClock } from "./clock";
import { changeDateTime, confirmChildcare } from "./dateCare";

/** Every edit keeps the same identity so family sync and timeline views stay connected. */
export function editDatePlan(plan: DatePlan, input: {
  title: string; date: string; time: string; note: string;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("Add a name for your date.");
  if (!validDate(input.date)) throw new Error("Use a valid date in YYYY-MM-DD format.");
  const time = parseClock(input.time);
  if (!time) throw new Error("Use a start time like 6:30 PM.");
  // A different day or start time can change childcare arrangements.
  if (plan.date !== input.date) confirmChildcare(plan, false);
  changeDateTime(plan, time);
  plan.date = input.date;
  plan.title = title;
  plan.note = input.note.trim();
}

export function editHatsEvent(event: PersonalEvent, input: {
  title: string; date: string; start: string; end: string;
  location: string; allDay: boolean;
}) {
  if (event.source !== "hats")
    throw new Error("This event belongs to Google Calendar. Edit it there.");
  const title = input.title.trim();
  if (!title) throw new Error("Add an event title.");
  if (!validDate(input.date)) throw new Error("Use a valid date in YYYY-MM-DD format.");
  const start = input.allDay ? "00:00" : parseClock(input.start);
  const end = input.allDay ? "23:59" : parseClock(input.end);
  if (!start || !end) throw new Error("Use times like 6:30 PM and 8:00 PM.");
  if (!input.allDay && end <= start)
    throw new Error("End time must be later than start time.");
  event.title = title;
  event.date = input.date;
  event.start = start;
  event.end = end;
  event.location = input.location.trim();
  event.allDay = input.allDay;
}
