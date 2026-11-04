// Disposable, made-up data only. Does not contact real accounts or send feedback.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, mkdirSync } = require('node:fs');
const { resolve, extname } = require('node:path');
const assert = require('node:assert/strict');
async function main() {
  const root = resolve('dist');
  const server = createServer((req,res) => {
    let file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if (!file.startsWith(root+'/') || !existsSync(file) || file===root) file=resolve(root,'index.html');
    res.setHeader('Content-Type',({'.js':'application/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.css':'text/css'})[extname(file)]||'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise(done=>server.listen(8767,'127.0.0.1',done));
  const browser=await chromium.launch();
  try {
    const { freshPersonal }=require('../src/personal/model.ts');
    const { makeTask }=require('../src/personal/engine.ts');
    const { todayISO,addDays }=require('../src/engine/dates.ts');
    const date=addDays(todayISO(),1), base='http://127.0.0.1:8767';
    const d=freshPersonal();d.preferences.onboarded=true;d.preferences.school={on:false};d.preferences.unavailableDays=[];d.preferences.gymDays=[];d.preferences.partner='Alex';d.preferences.kidsRoutine=true;
    d.preferences.weekendStart='08:00';d.preferences.weekendEnd='22:00';
    d.people.push({id:'kid',name:'Sam',role:'child',interests:'',detail:''});
    d.tasks.push(makeTask('Optional tidy','home',date,{id:'optional'}),makeTask('Health appointment','myself',date,{id:'appointment',fixed:true,time:'10:00'}));
    d.dates.push({id:'sample-date',date,time:'19:00',title:'Date night · dinner out',budget:100,childcare:50,transport:0,note:'',steps:[{title:'Confirm childcare',done:false}]});
    const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(data=>{if(!localStorage.getItem('hats.personal.v2'))localStorage.setItem('hats.personal.v2',JSON.stringify(data));},d);
    const settled=async()=>{await page.getByRole('button',{name:'Skip the intro',exact:true}).waitFor({state:'hidden'});};
    await page.goto(`${base}/?date=${date}`);await settled();
    const card=page.getByText('Plans for this day',{exact:true}).locator('..').locator('..');
    await card.getByRole('button',{name:'My day changed',exact:true}).click();
    await page.getByText('Preview for this date',{exact:true}).waitFor();
    await page.getByText(/Optional tidy:.*waits for another opening/).waitFor();
    // Preview is not a write.
    assert.equal(await page.evaluate(date=>JSON.parse(localStorage.getItem('hats.personal.v2')).dayAdjustments?.[date],date),undefined);
    mkdirSync('/tmp/hats-dependable-ui',{recursive:true});
    await page.screenshot({path:'/tmp/hats-dependable-ui/phone-day-change.png',fullPage:true});
    await page.getByRole('button',{name:'Apply day change',exact:true}).click();
    await page.waitForFunction(date=>JSON.parse(localStorage.getItem('hats.personal.v2')).dayAdjustments?.[date]?.essentialsOnly===true,date);
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    await page.waitForFunction(date=>!JSON.parse(localStorage.getItem('hats.personal.v2')).dayAdjustments?.[date],date);
    await page.goto(`${base}/hat/husband`);await settled();
    await page.getByRole('checkbox',{name:'Childcare confirmed for this date',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hats.personal.v2')).dates[0].childcareConfirmed===true);
    await page.goto(`${base}/task/optional`);await settled();
    await page.getByRole('button',{name:'Earlier',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('hats.personal.v2')).memory?.items?.[0]?.rule?.kind==='window');
    await page.goto(`${base}/feedback`);await settled();
    await page.getByPlaceholder('What was missing, confusing, or still on your mind?').fill('I still had to coordinate a pickup outside Hats.');
    await page.getByRole('button',{name:'Save feedback privately',exact:true}).click();
    await page.getByText('I still had to coordinate a pickup outside Hats.',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/hats-dependable-ui/phone-feedback.png',fullPage:true});
    await page.goto(`${base}/day-change?date=${date}`);await settled();
    await page.setViewportSize({width:768,height:900});
    await page.getByText('Preview for this date',{exact:true}).waitFor();
    await page.screenshot({path:'/tmp/hats-dependable-ui/fold-day-change.png',fullPage:true});
    assert.deepEqual(errors,[]);
    // Separate first-use context with no private household setup.
    const first=await browser.newPage({viewport:{width:390,height:844}});
    await first.goto(`${base}/welcome`);
    await first.getByRole('button',{name:'Skip the intro',exact:true}).waitFor({state:'hidden'});
    await first.getByRole('button',{name:'Start with one real plan',exact:true}).click();
    await first.getByPlaceholder('Pick up a prescription').fill('A real first commitment');
    await first.getByRole('button',{name:'Show my day',exact:true}).click();
    await first.waitForFunction(()=>JSON.parse(localStorage.getItem('hats.personal.v2'))?.tasks?.some(t=>t.title==='A real first commitment'));
    const stored=await first.evaluate(()=>JSON.parse(localStorage.getItem('hats.personal.v2')));
    assert.equal(stored.preferences.kidsRoutine,false);assert.equal(stored.people.length,0);assert.ok(stored.productUse.firstPlanOn);
    await first.getByRole('button',{name:'Plan: A real first commitment, 6:00 PM',exact:true}).waitFor();
    await first.screenshot({path:'/tmp/hats-dependable-ui/phone-first-plan.png'});
    console.log('Dependable planner UI: preview before write, apply, Undo, childcare confirmation, corrections, private feedback, first useful plan and phone/fold screenshots passed.');
  }finally{await browser.close();await new Promise(done=>server.close(done));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
