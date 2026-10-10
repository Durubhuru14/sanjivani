/** Extra spot-checks: data-dense views (admin oversight tabs, browse). */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";
const OUT = "/home/z/my-project/scripts/qa/shots-retheme";
const browser = await chromium.launch();

async function login(ctx, page, email) {
  await ctx.clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.waitForFunction(
    (v) => document.querySelector("#email")?.value === v,
    email,
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 });
}

const SHOTS = [
  { email: "admin@sanjivani.test", url: "/admin/ngos", name: "admin-ngos", widths: [375, 1280] },
  { email: "admin@sanjivani.test", url: "/admin/campaigns", name: "admin-campaigns", widths: [375] },
  { email: "admin@sanjivani.test", url: "/admin/ngos/c0000000-0000-4000-8000-000000000002", name: "admin-ngo-detail", widths: [375, 1280] },
  { email: "priya@sanjivani.test", url: "/volunteer/browse", name: "volunteer-browse", widths: [375, 1280] },
  { email: "greenearth@sanjivani.test", url: "/ngo/campaigns/c0000000-0000-4000-8000-000000000001", name: "ngo-campaign-detail", widths: [375, 1280] },
  { email: "greenearth@sanjivani.test", url: "/ngo/staff", name: "ngo-staff", widths: [375] },
];

for (const shot of SHOTS) {
  for (const w of shot.widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    try {
      await login(ctx, page, shot.email);
      await page.goto(`${BASE}${shot.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const ov = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      await page.screenshot({ path: `${OUT}/${shot.name}-${w}.png`, fullPage: w <= 425 });
      console.log(`captured ${shot.name} @${w} (overflow ${ov}px)`);
    } catch (e) {
      console.log(`FAILED ${shot.name} @${w}: ${String(e).split("\n")[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
