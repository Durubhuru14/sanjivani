/** UI/UX sanity pass — capture the key pages post-fix on the prod build. */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";
const OUT = "/home/z/my-project/scripts/qa/shots";

const SHOTS = [
  { email: "admin@sanjivani.test", url: "/admin", name: "sanity-admin" },
  { email: "greenearth@sanjivani.test", url: "/ngo", name: "sanity-ngo" },
  { email: "greenearth@sanjivani.test", url: "/ngo/campaigns/c0000000-0000-4000-8000-000000000001", name: "sanity-ngo-campaign" },
  { email: "priya@sanjivani.test", url: "/volunteer", name: "sanity-volunteer" },
  { email: "priya@sanjivani.test", url: "/volunteer/browse", name: "sanity-volunteer-browse" },
  { email: "meera@sanjivani.test", url: "/staff", name: "sanity-staff" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

// landing + login first (no auth)
await page.goto("/", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/sanity-landing.png`, fullPage: false });
await page.goto("/login", { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/sanity-login.png` });

for (const shot of SHOTS) {
  await ctx.clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(shot.email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  await page.goto(shot.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
  console.log("captured", shot.name);
}

// mobile spot-check of the three dashboards
await ctx.close();
const mctx = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } });
const mp = await mctx.newPage();
for (const [email, url, name] of [
  ["admin@sanjivani.test", "/admin", "sanity-admin-mobile"],
  ["greenearth@sanjivani.test", "/ngo", "sanity-ngo-mobile"],
  ["priya@sanjivani.test", "/volunteer", "sanity-volunteer-mobile"],
]) {
  await mctx.clearCookies();
  await mp.goto("/login");
  await mp.getByLabel("Email").fill(email);
  await mp.getByLabel("Password").fill(PW);
  await mp.getByRole("button", { name: /log in/i }).click();
  await mp.waitForURL((u) => !u.pathname.startsWith("/login"));
  await mp.goto(url, { waitUntil: "networkidle" });
  await mp.waitForTimeout(600);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await mp.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captured", name, "| horizontal overflow:", overflow, "px");
}

await browser.close();
console.log("done");
