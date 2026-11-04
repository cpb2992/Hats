/// <reference types="node" />
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { freshPersonal, validData } from "../../src/personal/model";
import { makeTask } from "../../src/personal/engine";
import { todayISO, timeOf, nowMinutes } from "../../src/engine/dates";
const data=freshPersonal(), clock=new Date(), today=todayISO(clock);
data.preferences.onboarded=true;data.preferences.name="Sample";data.preferences.partner="";
data.preferences.school={on:false};data.preferences.unavailableDays=[];data.preferences.gymDays=[];
data.preferences.kidsRoutine=false;data.preferences.routinesConfigured=false;data.preferences.notifications=true;
const due=new Date(clock.getTime()+180000), dueDate=todayISO(due), dueTime=timeOf(nowMinutes(due));
data.tasks.push(makeTask("Native scheduled reminder","home",dueDate,{id:"native-ci-task",time:dueTime,fixed:true}));
data.events.push({id:"native-ci-event",date:today,title:"Native active event",start:timeOf(Math.max(0,nowMinutes(clock)-5)),end:timeOf(Math.min(1439,nowMinutes(clock)+10)),allDay:false,source:"hats",hat:"home"});
assert.equal(validData(data),true);
writeFileSync(process.env.HATS_NATIVE_FIXTURE!,JSON.stringify(data));
writeFileSync(process.env.HATS_NATIVE_META!,JSON.stringify({date:today,due:new Date(`${dueDate}T${dueTime}:00`).getTime(),expected:"Native scheduled reminder"}));
console.log("Disposable native fixture generated; no personal data included.");
