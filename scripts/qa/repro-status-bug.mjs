/**
 * Reproduce the reported bug: NGO clicks "Mark ongoing" / "Mark completed"
 * on a campaign -> "invalid server request".
 * Captures: network failures, console errors, page errors, toasts.
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const NGO = { email: "greenearth@sanjivani.test", password: "Passw0rd!" };

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();

const problems = [];
page.on("console", (msg) => {
  if (msg.type() === "error") problems.push(`[console.error] ${msg.text().slice(0, 300)}`);
});
page.on("pageerror", (err) => problems.push(`[pageerror] ${String(err).slice(0, 500)}`));
page.on("response", (res) => {
  const ct = res.headers()["content-type"] ?? "";
  if (res.status() >= 400 && res.url().includes(BASE)) {
    problems.push(`[http ${res.status()}] ${res.request().method()} ${res.url().replace(BASE, "")} ct=${ct}`);
  }
});

// --- login as NGO
await page.goto("/login");
await page.getByLabel("Email").fill(NGO.email);
await page.getByLabel("Password").fill(NGO.password);
await page.getByRole("button", { name: /log in/i }).click();
await page.waitForURL((u) => u.pathname.startsWith("/ngo"));
console.log("Logged in as NGO:", page.url());

// --- go to campaigns list, open the first campaign (exclude /new)
await page.goto("/ngo/campaigns");
await page.waitForLoadState("networkidle");
const links = await page
  .locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])")
  .all();
console.log("Campaign links found:", links.length);
const href = await links[0].getAttribute("href");
console.log("Opening campaign:", href);
await page.goto(href);
await page.waitForLoadState("networkidle");

// --- find the status button
const ongoingBtn = page.getByRole("button", { name: /mark ongoing/i });
const count = await ongoingBtn.count();
console.log("'Mark ongoing' buttons:", count);
if (count > 0) {
  await ongoingBtn.first().click();
  await page.waitForTimeout(4000);
  // capture any toast
  const toasts = await page.locator("[data-sonner-toast], [role='status']").allTextContents();
  console.log("Toasts after click:", JSON.stringify(toasts));
  console.log("URL now:", page.url());
  // check status badge changed
  const badge = await page.locator("text=/ongoing|upcoming/i").first().textContent().catch(() => null);
  console.log("Badge text now:", badge);
}

console.log("\n===== PROBLEMS CAPTURED =====");
console.log(problems.length ? problems.join("\n") : "(none)");

await browser.close();
