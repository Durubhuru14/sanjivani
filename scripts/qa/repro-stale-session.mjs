/**
 * Hypothesis test: middleware redirect on a server-action POST breaks the
 * action with "Invalid Server Actions request" (what the user saw).
 *
 * Simulates: NGO page open in tab -> user logs in as another role (or gets
 * suspended / session dies) in another tab -> clicks "Mark ongoing" on the
 * stale NGO page.
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
page.on("pageerror", (err) => problems.push(`[pageerror] ${String(err).slice(0, 400)}`));

// 1. login as NGO
await page.goto("/login");
await page.getByLabel("Email").fill(NGO.email);
await page.getByLabel("Password").fill(NGO.password);
await page.getByRole("button", { name: /log in/i }).click();
await page.waitForURL((u) => u.pathname.startsWith("/ngo"));

// 2. open a campaign page (stays open, like a user tab)
await page.goto("/ngo/campaigns");
await page.waitForLoadState("networkidle");
const link = await page
  .locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])")
  .first();
const href = await link.getAttribute("href");
await page.goto(href);
await page.waitForLoadState("networkidle");
console.log("Campaign page open:", href);

// 3. simulate "logged in as another role in another tab":
//    read the demo cookie, then swap it for the admin's session.
//    We discover the admin uid via the demo login in a second context? Simpler:
//    just DELETE the session cookie (simulates expired session).
const cookies = await ctx.cookies();
const demoCookie = cookies.find((c) => c.name.includes("demo") || c.name.includes("sb"));
console.log("Cookie in play:", demoCookie?.name);

// --- Scenario A: session cookie removed (expired)
await ctx.clearCookies();
console.log("\n=== Scenario A: session cookie cleared, click Mark ongoing ===");
const btn = page.getByRole("button", { name: /mark ongoing|mark completed/i }).first();
if ((await btn.count()) > 0) {
  await btn.click();
  await page.waitForTimeout(4000);
  console.log("URL after click:", page.url());
  const toasts = await page.locator("[data-sonner-toast], [role='status']").allTextContents();
  console.log("Toasts:", JSON.stringify(toasts));
} else {
  console.log("No status button on this campaign (already terminal)");
}

await browser.close();

console.log("\n===== PROBLEMS CAPTURED =====");
console.log(problems.length ? problems.join("\n") : "(none)");
