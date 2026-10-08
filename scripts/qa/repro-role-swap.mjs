/**
 * Scenario B: role swap — NGO page open, user logs in as ADMIN in another
 * tab (cookie now admin) → click NGO action → should cleanly land on /admin.
 * Scenario C: NGO suspended mid-browse → click → should land on /suspended.
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const NGO = { email: "greenearth@sanjivani.test", password: "Passw0rd!" };
const ADMIN = { email: "admin@sanjivani.test", password: "Passw0rd!" };

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();

const problems = [];
page.on("console", (m) => { if (m.type() === "error") problems.push(`[console.error] ${m.text().slice(0, 200)}`); });
page.on("pageerror", (e) => problems.push(`[pageerror] ${String(e).slice(0, 300)}`));

async function ngoCampaignPage() {
  await page.goto("/ngo/campaigns");
  await page.waitForLoadState("networkidle");
  const link = await page
    .locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])")
    .first()
    .getAttribute("href");
  await page.goto(link);
  await page.waitForLoadState("networkidle");
}

// login NGO
await page.goto("/login");
await page.getByLabel("Email").fill(NGO.email);
await page.getByLabel("Password").fill(NGO.password);
await page.getByRole("button", { name: /log in/i }).click();
await page.waitForURL((u) => u.pathname.startsWith("/ngo"));
await ngoCampaignPage();
console.log("NGO campaign page open");

// swap cookie to admin WITHOUT reloading the page (simulates another tab login)
const cookies = await ctx.cookies();
const demoCookie = cookies.find((c) => c.name === "sv-demo-user");

// login as admin in a SEPARATE context to get their cookie value
const ctx2 = await browser.newContext({ baseURL: BASE });
const p2 = await ctx2.newPage();
await p2.goto("/login");
await p2.getByLabel("Email").fill(ADMIN.email);
await p2.getByLabel("Password").fill(ADMIN.password);
await p2.getByRole("button", { name: /log in/i }).click();
await p2.waitForURL((u) => u.pathname.startsWith("/admin"));
const adminCookies = await ctx2.cookies();
const adminUid = adminCookies.find((c) => c.name === "sv-demo-user")?.value;
await ctx2.close();
console.log("admin uid:", adminUid, "| ngo uid:", demoCookie?.value);

// overwrite the NGO page's cookie with the admin session
await ctx.addCookies([{ name: "sv-demo-user", value: adminUid, url: BASE }]);

console.log("\n=== Scenario B: role-swapped click ===");
const btn = page.getByRole("button", { name: /mark ongoing/i }).first();
if ((await btn.count()) > 0) {
  await btn.click();
  await page.waitForTimeout(4000);
  console.log("URL after click:", page.url(), "(expect /admin)");
} else {
  console.log("No mark-ongoing button (status state) — trying mark completed");
  const c = page.getByRole("button", { name: /mark completed/i }).first();
  if ((await c.count()) > 0) { await c.click(); await page.waitForTimeout(800); await page.getByRole("button", { name: /yes, continue/i }).click(); await page.waitForTimeout(4000); console.log("URL:", page.url()); }
}

console.log("\n===== PROBLEMS =====");
console.log(problems.length ? problems.join("\n") : "(none)");
await browser.close();
