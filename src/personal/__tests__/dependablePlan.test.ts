import assert from "node:assert/strict";
import test from "node:test";
import { applyDayChange, previewDayChange } from "../dayChange";
import { changeDateTime, confirmChildcare } from "../dateCare";
import { createFirstPlan } from "../firstPlan";
import { makeTask, planDay, materialize } from "../engine";
import { freshPersonal, validData } from "../model";
import { currentPlanNotice, personalReminderPlan, reminderChanges, noticeRevision } from "../reminderPlan";
import { dayTimeline, nowAndNext, routineSteps } from "../timeline";
import { recordUse } from "../productUse";
import { acceptResponsibility, preferEarlier, stopSuggesting } from "../taskFeedback";
import { sharedFromLocal, mergeRemote, type ShareState, type RemoteRow } from "../share";
const date = "2026-11-05";
function fixture() {
  const d = freshPersonal();
  d.preferences.unavailableDays = [];
  d.preferences.gymDays = [];
  d.preferences.school = { on: false };
  d.preferences.kidsRoutine = false;
  d.preferences.weekendStart = "08:00";
  d.preferences.weekendEnd = "22:00";
  d.preferences.notifications = true;
  return d;
}

test("day-change preview is pure, preserves fixed commitments and applies only to its date", () => {
  const d = fixture();
  d.tasks.push(makeTask("Care", "home", date, { essential: true }), makeTask("Optional", "home", date), makeTask("Appointment", "myself", date, { time: "10:00", fixed: true }));
  const before = JSON.stringify(d);
  const p = previewDayChange(d, date, "essentials");
  assert.equal(JSON.stringify(d), before);
  assert.ok(p.changes.some(c => c.title === "Optional" && c.after === null));
  assert.equal(planDay(p.data, date).find(p => p.task.title === "Appointment")?.time, "10:00");
  assert.ok(planDay(p.data, date).find(p => p.task.title === "Care")?.time);
  assert.ok(planDay(p.data, "2026-11-06").find(p => p.task.title === "Optional")?.time);
  assert.deepEqual(p.data.tasks, d.tasks);
});
test("running late changes flexible availability, never the appointment time", () => {
  const d = fixture();
  d.tasks.push(makeTask("Call", "home", date), makeTask("Meeting", "work", date, { fixed: true, time: "09:00" }));
  applyDayChange(d, date, "late", "15:00");
  assert.equal(planDay(d, date).find(p => p.task.title === "Call")?.time, "15:00");
  assert.equal(planDay(d, date).find(p => p.task.title === "Meeting")?.time, "09:00");
  assert.throws(() => applyDayChange(d, date, "late", "25:00"));
  assert.throws(() => applyDayChange(d, "2026-02-30", "off"));
});
test("kids home pauses optional tasks, partner away removes only the partner reminder, regular restores both", () => {
  const d = fixture(); d.preferences.partner = "Alex";
  d.tasks.push(makeTask("Optional", "home", date));
  applyDayChange(d, date, "kids"); applyDayChange(d, date, "partner"); applyDayChange(d, date, "off");
  assert.equal(planDay(d, date)[0].time, null);
  assert.ok(!routineSteps(d, date).some(s => s.key === "partner"));
  applyDayChange(d, date, "regular");
  assert.ok(planDay(d, date)[0].time);
  assert.ok(routineSteps(d, date).some(s => s.key === "partner"));
  assert.ok(!d.workDaysOff?.includes(date));
  assert.equal(validData(JSON.parse(JSON.stringify(d))), true);
});
test("elapsed routine time is unconfirmed, never a completed task or achievement", () => {
  const d = fixture();
  const rows = dayTimeline(d, date, 23*60, date).items.filter(i => i.kind === "routine");
  assert.ok(rows.length > 0 && rows.every(r => !r.done && r.elapsed));
  d.routineDone = { [date]: ["dinner"] };
  assert.equal(routineSteps(d, date, {today:date,nowMin:23*60}).find(i => i.key === "dinner")?.done, true);
});
test("childcare must be explicitly confirmed; a changed date time invalidates confirmation", () => {
  const d = fixture(); d.preferences.kidsRoutine = true;
  d.people.push({ id:"child",name:"Kid",role:"child",interests:"",detail:"" });
  const plan = {id:"date",date,time:"19:00",title:"Dinner out",budget:100,childcare:50,transport:0,note:"",steps:[{title:"Confirm childcare",done:false}]};
  d.dates.push(plan);
  assert.match(dayTimeline(d,date,0,date).items.find(i => i.kind === "date")!.detail!, /needs confirmation/);
  assert.ok(!routineSteps(d,date).some(i => i.covered));
  confirmChildcare(plan,true);
  assert.ok(routineSteps(d,date).some(i => i.covered));
  assert.equal(plan.steps[0].done,true);
  changeDateTime(plan,"18:30");
  assert.ok(!routineSteps(d,date).some(i => i.covered));
  assert.equal(plan.steps[0].done,false);
});
test("one focus selector keeps the daily card and notification aligned for dates and events", () => {
  const d = fixture();
  d.events.push({id:"dentist",date,title:"Dentist",start:"09:00",end:"10:00",source:"hats",allDay:false});
  const focus = nowAndNext(dayTimeline(d,date,9*60+15,date).items,9*60+15).now;
  assert.equal(focus?.title,"Dentist");
  assert.ok(currentPlanNotice(d,date,9*60+15)?.title.includes(focus!.title));
});
test("future date nights, repeating events and appointments get stable occurrence reminders", () => {
  const d = fixture();
  d.events.push({id:"practice",date,title:"Practice",start:"16:00",end:"17:00",allDay:false,source:"hats",repeat:{freq:"day",every:1}});
  d.dates.push({id:"d",date:"2026-11-06",time:"19:00",title:"Dinner out",budget:0,childcare:0,transport:0,note:"",steps:[]});
  const first = personalReminderPlan(d,new Date(`${date}T08:00:00`));
  const second = personalReminderPlan(d,new Date(`${date}T08:01:00`));
  assert.equal(first.scheduled.filter(n => n.title === "Practice").length,7);
  assert.equal(first.scheduled.filter(n => n.title.includes("Dinner out")).length,1);
  assert.deepEqual(reminderChanges(first.scheduled.map(n => ({identifier:n.identifier,revision:noticeRevision(n)})),second.scheduled),{cancel:[],schedule:[]});
});
test("first plan requires no household and preserves real data when setup is already complete", () => {
  const d = fixture();
  createFirstPlan(d,"Pick up prescription",date,"18:00","home",date);
  assert.equal(d.people.length,0);
  assert.equal(d.preferences.kidsRoutine,false);
  assert.equal(routineSteps(d,date).length,0);
  assert.equal(d.tasks[0].fixed,true);
  assert.equal(d.productUse?.firstPlanOn,date);
  assert.equal(validData(d),true);
  const prefs = JSON.stringify(d.preferences);
  createFirstPlan(d,"Call",date,"19:00","work",date);
  assert.equal(JSON.stringify(d.preferences),prefs);
  assert.throws(() => createFirstPlan(d,"",date,"18:00","home",date));
});
test("corrections are reviewable preferences and muted suggestions never hide essential or fixed work", () => {
  const d = fixture(); const task = makeTask("Vacuum", "home", date, {source:"vacuum"}); d.tasks.push(task);
  preferEarlier(d,task,date); stopSuggesting(d,task,date);
  assert.equal(d.memory?.items[0].rule?.kind,"window");
  assert.equal(planDay(d,date).length,0);
  assert.throws(() => stopSuggesting(d,{...task,essential:true},date));
  task.essential = true;
  assert.ok(planDay(d,date).some(p => p.task.id === task.id));
});
test("shared responsibility is accepted only by its owner and other members' work stays out of my plan", () => {
  const d = fixture(); d.household = {id:"house",name:"Home",code:"x",me:"sam",members:[{id:"sam",name:"Sam"},{id:"alex",name:"Alex"}]};
  const task = makeTask("Pickup", "home", date, {shared:true,assignee:"alex",fixed:false,time:"16:00"}); d.tasks.push(task);
  assert.equal(acceptResponsibility(d,task.id,date),false);
  assert.equal(planDay(d,date).length,0);
  d.household.me = "alex";
  assert.equal(acceptResponsibility(d,task.id,date),true);
  assert.equal(task.acceptedBy,"alex");
  assert.equal(sharedFromLocal(d).get(`task:${task.id}`)?.payload.fixed,false);
  task.repeat = "daily"; task.doneAt = `${date}T18:00:00Z`;
  materialize(d,"2026-11-06");
  assert.equal(d.tasks.at(-1)?.acceptedBy,undefined);
});
test("shared wire preserves acceptance, fixed/flexible status and confirmed childcare; private research stays out", () => {
  const d = fixture();
  d.tasks.push(makeTask("Pickup","home",date,{shared:true,assignee:"alex",acceptedBy:"alex",fixed:false,time:"16:00",essential:true}));
  d.dates.push({id:"date",date,title:"Dinner",budget:0,childcare:0,childcareConfirmed:true,transport:0,note:"",steps:[]});
  recordUse(d,date,"dayChanges"); d.productFeedback = [{date,helped:true,missing:"Private feedback"}];
  const shared = [...sharedFromLocal(d).values()];
  assert.ok(!JSON.stringify(shared).includes("Private feedback"));
  const next = fixture();
  const state: ShareState = {householdId:"home",lastPull:"",synced:{}};
  const rows: RemoteRow[] = shared.map(s => ({...s,deleted:false,updated_at:"2026-11-05T12:00:00Z",updated_by:"sam"}));
  mergeRemote(next,rows,state,"alex",[{id:"sam",name:"Sam"},{id:"alex",name:"Alex"}]);
  assert.equal(next.tasks[0].acceptedBy,"alex"); assert.equal(next.tasks[0].fixed,false); assert.equal(next.tasks[0].essential,true);
  assert.equal(next.dates[0].childcareConfirmed,true);
  assert.equal(next.productFeedback,undefined);
});
test("malformed new backup fields are rejected; old backups remain valid", () => {
  const d = fixture();
  assert.equal(validData(d),true);
  assert.equal(validData({...d,dayAdjustments:{[date]:{availableAfter:"25:00"}}}),false);
  assert.equal(validData({...d,productUse:{days:[],dayChanges:-1,corrections:0,sharedAccepted:0}}),false);
  assert.equal(validData({...d,productFeedback:[{date,helped:true,missing:42}]}),false);
});
