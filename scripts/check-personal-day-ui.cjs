// Disposable profile only. Never reads or edits a real account.
const { chromium } = require('playwright');
const { createServer } = require('node:http');
const { readFileSync, existsSync, mkdirSync } = require('node:fs');
const { resolve, extname } = require('node:path');
const assert = require('node:assert/strict');
async function main() {
  const root = resolve('dist');
  const server = createServer((req, res) => {
    let file = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + '/') || !existsSync(file) || file === root) file = resolve(root, 'index.html');
    res.setHeader('Content-Type', ({'.js':'application/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.css':'text/css'})[extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise(done => server.listen(8766, '127.0.0.1', done));
  const browser = await chromium.launch();
  try {
    const { freshPersonal } = require('../src/personal/model.ts');
    const { todayISO, addDays } = require('../src/engine/dates.ts');
    const date = addDays(todayISO(), 2);
    const d = freshPersonal();
    d.preferences.onboarded = true;
    d.preferences.unavailableDays = [0,1,2,3,4,5,6];
    d.preferences.school = { on: true };
    d.dates.push({id:'review-date',date,time:'19:00',title:'Date night · dinner out',budget:100,childcare:0,transport:0,steps:[],note:''});
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(data => { if (!localStorage.getItem('hats.personal.v2')) localStorage.setItem('hats.personal.v2',JSON.stringify(data)); },d);
    await page.goto(`http://127.0.0.1:8766/?date=${date}`);
    const plan = page.getByRole('button',{name:'Plan: Date night · dinner out, 7:00 PM',exact:true});
    await plan.waitFor();
    await plan.scrollIntoViewIfNeeded();
    const card = page.getByText('Plans for this day',{exact:true}).locator('..').locator('..');
    await card.getByRole('button',{name:'Edit day',exact:true}).click();
    await page.getByRole('button',{name:'Day off work',exact:true}).click();
    await page.getByRole('button',{name:'Save day',exact:true}).click();
    await page.waitForFunction(date => JSON.parse(localStorage.getItem('hats.personal.v2'))?.workDaysOff?.includes(date),date);
    await page.reload();
    await plan.waitFor();
    await plan.scrollIntoViewIfNeeded();
    await card.getByText('Day off work · just this date',{exact:true}).waitFor();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hats.personal.v2')));
    assert.deepEqual(stored.preferences.unavailableDays,[0,1,2,3,4,5,6]);
    assert.equal(stored.dates.length,1);
    mkdirSync('/tmp/hats-day-ui',{recursive:true});
    await page.screenshot({path:'/tmp/hats-day-ui/phone.png'});
    await page.setViewportSize({width:768,height:900});
    await plan.scrollIntoViewIfNeeded();
    await page.screenshot({path:'/tmp/hats-day-ui/fold.png'});
    await card.getByRole('button',{name:'Edit day',exact:true}).click();
    await page.getByRole('button',{name:'Regular schedule',exact:true}).click();
    await page.getByRole('button',{name:'Save day',exact:true}).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('hats.personal.v2'))?.workDaysOff?.length === 0);
    assert.deepEqual(errors,[]);
    console.log('Day schedule UI: future date plan, one-day exception, persistence, restoration and phone/fold screenshots passed.');
  } finally { await browser.close(); await new Promise(done => server.close(done)); }
}
main().catch(e => { console.error(e); process.exitCode=1; });
