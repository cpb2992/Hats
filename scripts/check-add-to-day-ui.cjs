// Disposable profile only. Never reads or edits a real account.
// Today → "+ Add to-do or event" on a chosen day: items with no day of their own land on
// that day; an item that names its own day keeps it.
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
  await new Promise(done => server.listen(8768, '127.0.0.1', done));
  const browser = await chromium.launch();
  try {
    const { freshPersonal } = require('../src/personal/model.ts');
    const { todayISO, addDays } = require('../src/engine/dates.ts');
    const today = todayISO();
    const date = addDays(today, 3);
    const d = freshPersonal();
    d.preferences.onboarded = true;
    const page = await browser.newPage({viewport:{width:390,height:844}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(data => { if (!localStorage.getItem('hats.personal.v2')) localStorage.setItem('hats.personal.v2',JSON.stringify(data)); },d);
    // Today shows neighbouring days side by side; use the button on the day on screen.
    const addButton = async () => {
      const all = page.getByRole('button', { name: '+ Add to-do or event', exact: true });
      await all.first().waitFor();
      for (let tries = 0; tries < 40; tries++) {
        for (const b of await all.all()) {
          const box = await b.boundingBox();
          if (box && box.x >= 0 && box.x + box.width <= page.viewportSize().width) return b;
        }
        await page.waitForTimeout(100);
      }
      throw new Error('No add button on screen');
    };
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('hats.personal.v2')));
    const add = async (text) => {
      await page.goto(`http://127.0.0.1:8768/?date=${date}`);
      await page.getByRole('button', { name: 'Skip the intro', exact: true }).waitFor({ state: 'hidden' });
      await page.waitForTimeout(400);
      await (await addButton()).click();
      await page.getByText('Adding to ', { exact: false }).waitFor();
      await page.getByLabel('What do you want to remember?').fill(text);
      await page.getByRole('button', { name: 'Keep this', exact: true }).click();
    };

    await add('Pick up dry cleaning');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('hats.personal.v2'))?.tasks?.some(t => /dry cleaning/i.test(t.title)));
    let s = await stored();
    assert.equal(s.tasks.find(t => /dry cleaning/i.test(t.title)).date, date, 'To-do lands on the chosen day');

    await add('Dentist at 3pm');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('hats.personal.v2'))?.events?.some(e => /dentist/i.test(e.title)));
    s = await stored();
    const dentist = s.events.find(e => /dentist/i.test(e.title));
    assert.equal(dentist.date, date, 'Event lands on the chosen day');
    assert.equal(dentist.start ?? dentist.time, '15:00');

    await add('Call the plumber tomorrow');
    await page.waitForFunction(() => {
      const d = JSON.parse(localStorage.getItem('hats.personal.v2'));
      return [...(d?.tasks ?? []), ...(d?.events ?? [])].some(t => /plumber/i.test(t.title));
    });
    s = await stored();
    const plumber = [...s.tasks, ...s.events].find(t => /plumber/i.test(t.title));
    assert.equal(plumber.date, addDays(today, 1), 'A day said out loud wins over the chosen day');

    // Opening Capture normally still defaults to today: no "Adding to" banner.
    await page.goto('http://127.0.0.1:8768/capture');
    await page.getByLabel('What do you want to remember?').waitFor();
    assert.equal(await page.getByText('Adding to ', { exact: false }).count(), 0);

    mkdirSync('/tmp/hats-add-day-ui',{recursive:true});
    await page.goto(`http://127.0.0.1:8768/?date=${date}`);
    await page.waitForTimeout(400);
    await (await addButton()).scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({path:'/tmp/hats-add-day-ui/today.png'});
    await (await addButton()).click();
    await page.getByText('Adding to ', { exact: false }).waitFor();
    await page.screenshot({path:'/tmp/hats-add-day-ui/capture.png'});
    assert.deepEqual(errors,[]);
    console.log('Add to day UI: to-do and event land on the chosen day, a spoken day still wins, plain Capture stays on today.');
  } finally { await browser.close(); await new Promise(done => server.close(done)); }
}
main().catch(e => { console.error(e); process.exitCode=1; });
