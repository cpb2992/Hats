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
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
