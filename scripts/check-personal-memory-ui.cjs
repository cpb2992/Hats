// Review-only browser check. Uses a disposable local profile, never real account data.
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { resolve, extname } = require("node:path");
const assert = require("node:assert/strict");

async function main() {
  const root = resolve("dist");
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = resolve(root, `.${pathname}`);
    if (!file.startsWith(root + "/") || !existsSync(file) || pathname === "/") file = resolve(root, "index.html");
    const types = { ".js": "application/javascript", ".html": "text/html", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json", ".css": "text/css" };
    res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    res.end(readFileSync(file));
  });
  await new Promise((done) => server.listen(8765, "127.0.0.1", done));
  const browser = await chromium.launch();
  try {
    const { freshPersonal } = require("../src/personal/model.ts");
    const data = freshPersonal();
    data.preferences.onboarded = true;
    data.preferences.name = "Preview";
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((fixture) => {
      if (!localStorage.getItem("hats.personal.v2")) localStorage.setItem("hats.personal.v2", JSON.stringify(fixture));
    }, data);
    await page.goto("http://127.0.0.1:8765/memory");
    await page.getByText("What Hats knows.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Remember about me", exact: true }).click();
    await page.getByPlaceholder("I find it easier to handle home tasks earlier in the evening.").fill("A quiet start helps me focus.");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("A quiet start helps me focus.", { exact: true }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("hats.personal.v2"))?.memory?.items?.length === 1);
    await page.reload();
    await page.getByText("A quiet start helps me focus.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Set a time window", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByText("Used in planning", { exact: false }).waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("hats.personal.v2"))?.memory?.items?.[0]?.rule?.kind === "window");
    // React Native Web keeps the closing sheet mounted until its exit animation ends.
    await page.locator('[aria-modal="true"]').filter({ visible: true }).waitFor({ state: "hidden" });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("hats.personal.v2")));
    assert.equal(stored.memory.items[0].rule.kind, "window");
    mkdirSync("/tmp/hats-memory-ui", { recursive: true });
    await page.getByText("A quiet start helps me focus.", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/hats-memory-ui/mobile.png", fullPage: true });
    await page.setViewportSize({ width: 768, height: 900 });
    await page.screenshot({ path: "/tmp/hats-memory-ui/fold-open.png", fullPage: true });
    assert.deepEqual(errors, []);
    await page.getByRole("button", { name: "Forget", exact: true }).click();
    await page.getByText("A quiet start helps me focus.", { exact: true }).waitFor({ state: "hidden" });
    console.log("Memory UI: create, persist, convert to preference, mobile/fold layout and forget passed.");
    // Capture is an ordinary tab. Neither opening it nor choosing Record starts audio.
    await page.goto("http://127.0.0.1:8765/");
    await page.getByRole("tab", { name: "Capture", exact: true }).click();
    await page.getByText("Capture.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Start recording", exact: true }).count(), 0);
    await page.getByRole("button", { name: /^✓\s*Type$/ }).waitFor();
    const draft = page.getByPlaceholder("A task, a promise, a song, or a useful link…");
    await draft.fill("Keep this typed draft");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/hats-memory-ui/capture-type.png", fullPage: true });
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await page.getByRole("button", { name: "Start recording", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Stop recording", exact: true }).count(), 0);
    assert.equal(await draft.inputValue(), "Keep this typed draft");
    await page.getByRole("tab", { name: "Today", exact: true }).click();
    await page.getByRole("tab", { name: "Capture", exact: true }).click();
    await page.getByRole("button", { name: /^✓\s*Type$/ }).waitFor();
    assert.equal(await draft.inputValue(), "Keep this typed draft");
    await page.goto("http://127.0.0.1:8765/capture?listen=old-shortcut");
    await page.getByText("Capture.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Start recording", exact: true }).count(), 0);
    await page.getByRole("button", { name: /^✓\s*Type$/ }).waitFor();
    console.log("Capture UI: typing by default, explicit recording, draft preserved and legacy auto-listen ignored.");

    // A generic fixture verifies the real file picker and targeted import, without private schedule data.
    await page.goto("http://127.0.0.1:8765/settings");
    await page.getByRole("button", { name: /School day/ }).click();
    const picked = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Import class schedule", exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    const schedule = { format: "hats-school-schedule", version: 1, week: { "4": [
      { start: "08:00", end: "08:40", title: "Department meeting", kind: "meeting", period: 1 },
      { start: "08:45", end: "09:25", title: "8X Science", kind: "class", section: "8X", period: 2 },
    ] } };
    await (await picked).setFiles({ name: "test-class-schedule.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(schedule)) });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("hats.personal.v2"))?.preferences?.school?.week?.["4"]?.[0]?.title === "Department meeting");
    const imported = await page.evaluate(() => JSON.parse(localStorage.getItem("hats.personal.v2")));
    assert.equal(imported.preferences.name, "Preview");
    assert.equal(imported.preferences.school.week["4"][1].section, "8X");
    assert.deepEqual(errors, []);
    console.log("Class schedule UI: selected JSON file, confirmed and merged school periods without replacing profile.");

    await page.goto("http://127.0.0.1:8765/meals");
    await page.getByRole("button", { name: "Meal preferences", exact: true }).click();
    await page.getByRole("textbox", { name: "Enjoy more of · comma-separated", exact: true }).fill("rice");
    await page.getByRole("textbox", { name: "Skip in suggestions · comma-separated", exact: true }).fill("mushrooms");
    await page.getByRole("textbox", { name: "Maximum active cooking minutes · blank for any", exact: true }).fill("30");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator('[aria-modal="true"]').filter({ visible: true }).waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Add my own meal", exact: true }).click();
    await page.getByRole("textbox", { name: "Meal name", exact: true }).fill("Test rice bowl");
    await page.getByRole("textbox", { name: "Ingredients · commas or one per line", exact: true }).fill("Rice\nTomatoes");
    await page.getByRole("textbox", { name: "Active cooking minutes", exact: true }).fill("15");
    await page.getByRole("textbox", { name: "Your directions and prep notes · one step per line", exact: true }).fill("Cook rice\nAdd tomatoes");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Edit my meal", exact: true }).waitFor();
    await page.locator('[aria-modal="true"]').filter({ visible: true }).waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Edit my meal", exact: true }).click();
    await page.getByRole("textbox", { name: "Active cooking minutes", exact: true }).fill("10");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.locator('[aria-modal="true"]').filter({ visible: true }).waitFor({ state: "hidden" });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("hats.personal.v2"))?.meals?.some((m) => m.name === "Test rice bowl" && m.minutes === 10));
    await page.goto("http://127.0.0.1:8765/meals");
    await page.getByRole("button", { name: /^Idea for tonight: Test rice bowl/ }).waitFor();
    const mealPrefs = await page.evaluate(() => JSON.parse(localStorage.getItem("hats.personal.v2")).preferences.mealPreferences);
    assert.deepEqual(mealPrefs, { likes: ["rice"], avoid: ["mushrooms"], maxActiveMinutes: 30, ownFirst: true });
    await page.screenshot({ path: "/tmp/hats-memory-ui/meal-input.png", fullPage: true });
    console.log("Meal input UI: preferences persist, custom meal saves/edits and one saved dinner leads suggestions.");

    const prepPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await prepPage.clock.install({ time: new Date("2026-11-05T08:10:00") });
    const prepData = freshPersonal();
    prepData.preferences.onboarded = true;
    prepData.preferences.unavailableDays = [4];
    prepData.preferences.school = { on: true, week: { "4": [
      { start: "08:00", end: "08:40", title: "Prep", kind: "off", note: "Planning", period: 1 },
      { start: "08:45", end: "09:25", title: "8X Science", kind: "class", section: "8X", period: 2 },
    ] } };
    const { makeTask } = require("../src/personal/engine.ts");
    prepData.tasks = [makeTask("Print lab packets", "work", "2026-11-05", { id: "print", minutes: 15, createdAt: "2026-11-01T08:00:00Z" }),
      makeTask("Reply to a message", "work", "2026-11-05", { id: "reply", minutes: 10, createdAt: "2026-11-01T09:00:00Z" })];
    await prepPage.addInitScript((fixture) => localStorage.setItem("hats.personal.v2", JSON.stringify(fixture)), prepData);
    await prepPage.goto("http://127.0.0.1:8765/");
    const card = prepPage.getByTestId("prep-mode");
    await card.getByText("25 usable minutes.", { exact: true }).waitFor();
    await card.getByText("Print lab packets", { exact: true }).waitFor();
    await card.scrollIntoViewIfNeeded();
    await prepPage.screenshot({ path: "/tmp/hats-memory-ui/prep-mode.png", fullPage: true });
    await card.getByRole("button", { name: "Another fit", exact: true }).click();
    await card.getByText("Reply to a message", { exact: true }).waitFor();
    await card.getByRole("button", { name: "Done", exact: true }).click();
    await prepPage.waitForFunction(() => !!JSON.parse(localStorage.getItem("hats.personal.v2")).tasks.find((t) => t.id === "reply").doneAt);
    await prepPage.clock.fastForward(31 * 60 * 1000);
    await card.waitFor({ state: "hidden" });
    console.log("Prep Mode UI: actual time window, alternative fit, real task completion and automatic end at bell passed.");
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
