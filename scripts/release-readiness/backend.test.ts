/// <reference types="node" />
// Disposable local Supabase only. This refuses the hosted production URL.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { freshPersonal } from "../../src/personal/model";
import { makeTask } from "../../src/personal/engine";
import { sharedFromLocal, mergeRemote, type ShareState, type RemoteRow } from "../../src/personal/share";
import { acceptResponsibility } from "../../src/personal/taskFeedback";

async function main() {
  const config = JSON.parse(readFileSync(process.env.HATS_LOCAL_STATUS!, "utf8"));
  const base = new URL(config.API_URL);
  assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Only a disposable local backend may be tested");
  const anon = config.ANON_KEY ?? config.PUBLISHABLE_KEY;
  const admin = config.SERVICE_ROLE_KEY ?? config.SECRET_KEY;
  assert.ok(anon && admin, "Local API keys must be available without printing them");
  const request = async (path: string, token: string | null, body?: unknown, method = body === undefined ? "GET" : "POST", administrative = false) => {
    const response = await fetch(new URL(path, base), {
      method,
      headers: { apikey: administrative ? admin : anon, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return { status: response.status, ok: response.ok, value: text ? JSON.parse(text) : null };
  };
  const users: { id: string; token: string; refresh: string }[] = [];
  try {
    for (let i = 0; i < 3; i++) {
      const email = `hats-ci-${randomUUID()}@example.invalid`, password = randomUUID() + "aA7!";
      const created = await request("/auth/v1/admin/users", admin, { email, password, email_confirm: true }, "POST", true);
      assert.equal(created.ok, true, `Disposable account ${i + 1} created`);
      const signed = await request("/auth/v1/token?grant_type=password", null, { email, password });
      assert.equal(signed.ok, true, `Disposable account ${i + 1} signed in`);
      users.push({ id: signed.value.user.id, token: signed.value.access_token, refresh: signed.value.refresh_token });
    }
    const [a,b,outsider] = users;
    const profileA = freshPersonal(), profileB = freshPersonal();
    profileA.notes.push({id:"private-note",hat:"myself",kind:"reflection",text:"Private test note: must never be visible to another account",createdAt:new Date().toISOString()});
    for (const [user,profile] of [[a,profileA],[b,profileB]] as const) {
      const saved = await request("/rest/v1/rpc/save_personal_state", user.token, { p_expected:0,p_payload:profile });
      assert.equal(saved.value,1,"First account snapshot revision");
    }
    const crossRead = await request(`/rest/v1/personal_state?user_id=eq.${a.id}`,b.token);
    assert.deepEqual(crossRead.value,[],"Account B cannot read A's profile");
    const crossWrite = await request(`/rest/v1/personal_state?user_id=eq.${a.id}`,b.token,{payload:profileB},"PATCH");
    assert.ok(!crossWrite.ok || crossWrite.value.length===0,"Account B cannot overwrite A's profile");
    const anonymous = await request("/rest/v1/personal_state",null);
    assert.ok(!anonymous.ok,"Anonymous profiles are inaccessible");
    const stale = await request("/rest/v1/rpc/save_personal_state",a.token,{p_expected:0,p_payload:profileA});
    assert.equal(stale.ok,false,"Stale revisions are rejected");
    assert.match(stale.value.message,/SYNC_CONFLICT/);
    const savedAgain = await request("/rest/v1/rpc/save_personal_state",a.token,{p_expected:1,p_payload:profileA});
    assert.equal(savedAgain.value,2);
    console.log("PASS: real Auth sessions, private snapshot isolation, anonymous denial and revision conflict handling");

    const created = await request("/rest/v1/rpc/create_household",a.token,{p_name:"Disposable test household",p_display:"Sam"});
    assert.equal(created.ok,true,"Create household");
    const home = created.value;
    const joined = await request("/rest/v1/rpc/join_household",b.token,{p_code:home.invite_code,p_display:"Alex"});
    assert.equal(joined.ok,true,"Join from the second account");
    const date="2026-11-10";
    profileA.household={id:home.id,name:home.name,code:home.invite_code,me:a.id,members:[{id:a.id,name:"Sam"},{id:b.id,name:"Alex"}]};
    profileA.tasks.push(makeTask("Sample pickup","home",date,{id:"pickup",shared:true,assignee:b.id,time:"16:00",fixed:false,essential:true}));
    profileA.dates.push({id:"date",date,title:"Sample date",budget:0,childcare:0,transport:0,childcareConfirmed:true,note:"",steps:[]});
    profileA.productFeedback=[{date,helped:true,missing:"Private feedback must not be family shared"}];
    const send = async (profile: typeof profileA, token: string) => {
      const rows=[...sharedFromLocal(profile).values()].map(item=>({...item,household_id:home.id,deleted:false}));
      assert.ok(!JSON.stringify(rows).includes("Private feedback"));
      const result=await request("/rest/v1/household_items?on_conflict=household_id,id",token,rows);
      assert.equal(result.ok,true,"Write shared items through a real user session");
    };
    await send(profileA,a.token);
    const received=await request(`/rest/v1/household_items?household_id=eq.${home.id}`,b.token);
    assert.equal(received.ok,true);assert.equal(received.value.length,2);
    assert.ok(received.value.every((row:RemoteRow)=>row.updated_by===a.id),"Server stamps the authenticated writer");
    profileB.household={...profileA.household,me:b.id};
    const state:ShareState={householdId:home.id,lastPull:"",synced:{}};
    mergeRemote(profileB,received.value,state,b.id,profileA.household.members);
    assert.equal(profileB.tasks[0].fixed,false,"Flexible status survives the wire");
    assert.equal(profileB.tasks[0].essential,true);
    assert.equal(profileB.dates[0].childcareConfirmed,true);
    assert.equal(acceptResponsibility(profileB,"pickup",date),true);
    await send(profileB,b.token);
    const reflected=await request(`/rest/v1/household_items?household_id=eq.${home.id}&id=eq.task:pickup`,a.token);
    assert.equal(reflected.value[0].payload.acceptedBy,b.id,"Acceptance arrives on the original account");
    const outsideRead=await request(`/rest/v1/household_items?household_id=eq.${home.id}`,outsider.token);
    assert.deepEqual(outsideRead.value,[],"Outside accounts cannot read the household");
    const outsideWrite=await request("/rest/v1/household_items",outsider.token,{household_id:home.id,id:"task:intrusion",kind:"task",payload:{title:"Forbidden"},deleted:false});
    assert.equal(outsideWrite.ok,false,"Outside accounts cannot write into the household");
    const privateAgain=await request(`/rest/v1/personal_state?user_id=eq.${a.id}`,b.token);
    assert.deepEqual(privateAgain.value,[],"Joining a family never exposes a private profile");
    await request("/rest/v1/rpc/leave_household",b.token,{});
    const afterLeaving=await request(`/rest/v1/household_items?household_id=eq.${home.id}`,b.token);
    assert.deepEqual(afterLeaving.value,[],"Leaving revokes access to shared rows");
    console.log("PASS: two-account household transfer, acceptance, care confirmation, private/shared boundaries and revoked membership");
  } finally {
    for(const user of users) await request(`/auth/v1/admin/users/${user.id}`,admin,undefined,"DELETE",true);
  }
  console.log("Local-backend integration passed. No hosted accounts or production data were used.");
}
main().catch(error=>{ console.error(error instanceof Error ? error.message : "Local backend test failed"); process.exitCode=1; });
