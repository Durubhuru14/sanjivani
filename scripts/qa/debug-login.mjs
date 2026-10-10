/** Debug the demo-mode login flow: capture URL, console, network, toasts. */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[console]", m.type(), m.text().slice(0, 200)); });
page.on("requestfailed", (r) => console.log("[reqfail]", r.method(), r.url().slice(0, 120), r.failure()?.errorText));
page.on("response", (r) => { if (r.status() >= 400) console.log("[http]", r.status(), r.url().slice(0, 120)); });

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByLabel("Email").fill("admin@sanjivani.test");
await page.getByLabel("Password").fill("Passw0rd!");
await page.getByRole("button", { name: /log in/i }).click();

for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(2500);
  console.log(`t=${(i + 1) * 2.5}s url=`, page.url(), "| toast:", await page.locator("[data-sonner-toast], [role=status], [role=alert]").allInnerTexts().catch(() => []));
}
await page.screenshot({ path: "/home/z/my-project/scripts/qa/shots-retheme/debug-login.png" });
await browser.close();
