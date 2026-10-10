/** Retheme verification — capture public + authed surfaces at every
 *  breakpoint (320→1280), light + dark, and report horizontal overflow.
 *  Usage: PHASE=public|authed|dark node scripts/qa/retheme-shots.mjs  */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";
const OUT = "/home/z/my-project/scripts/qa/shots-retheme";
const PHASE = process.env.PHASE ?? "public";

const WIDTHS = [320, 375, 425, 768, 1024, 1280];

const PUBLIC = [
  { url: "/", name: "landing" },
  { url: "/login", name: "login" },
  { url: "/signup", name: "signup" },
];

const AUTHED = [
  { email: "admin@sanjivani.test", url: "/admin", name: "admin" },
  { email: "greenearth@sanjivani.test", url: "/ngo", name: "ngo" },
  { email: "priya@sanjivani.test", url: "/volunteer", name: "volunteer" },
  { email: "meera@sanjivani.test", url: "/staff", name: "staff" },
];

const browser = await chromium.launch();
let overflowIssues = 0;

async function overflowPx(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
}

async function login(ctx, page, email) {
  await ctx.clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  // dev-mode hydration race: filling before React attaches wipes the state,
  // so the submit then fails zod validation with an empty email.
  await page.waitForTimeout(1500);
  const emailInput = page.getByLabel("Email");
  await emailInput.fill(email);
  await page.getByLabel("Password").fill(PW);
  // assert the controlled inputs really hold the values before submitting
  await page.waitForFunction(
    (v) => document.querySelector("#email")?.value === v,
    email,
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 });
}

if (PHASE === "public") {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: Math.min(900, w * 2) } });
    const page = await ctx.newPage();
    for (const p of PUBLIC) {
      await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(400);
      const ov = await overflowPx(page);
      if (ov > 0) { overflowIssues++; console.log(`OVERFLOW ${p.name} @${w}: +${ov}px`); }
      await page.screenshot({ path: `${OUT}/${p.name}-${w}.png`, fullPage: w <= 425 });
    }
    await ctx.close();
    console.log(`public @${w} done`);
  }
}

if (PHASE === "authed") {
  for (const w of [320, 375, 768, 1024, 1280]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    for (const a of AUTHED) {
      await login(ctx, page, a.email);
      await page.goto(`${BASE}${a.url}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const ov = await overflowPx(page);
      if (ov > 0) { overflowIssues++; console.log(`OVERFLOW ${a.name} @${w}: +${ov}px`); }
      await page.screenshot({ path: `${OUT}/${a.name}-${w}.png`, fullPage: w <= 425 });
      console.log(`captured ${a.name} @${w} (overflow ${ov}px)`);
    }
    await ctx.close();
  }
}

if (PHASE === "dark") {
  for (const [w, label] of [[1280, "desktop"], [375, "mobile"]]) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: 900 },
      colorScheme: "dark",
    });
    const page = await ctx.newPage();
    for (const p of PUBLIC) {
      await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/${p.name}-dark-${label}.png`, fullPage: w <= 425 });
    }
    await login(ctx, page, "admin@sanjivani.test");
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/admin-dark-${label}.png` });
    await ctx.close();
    console.log(`dark ${label} done`);
  }
}

await browser.close();
console.log(overflowIssues === 0 ? "NO HORIZONTAL OVERFLOW anywhere" : `${overflowIssues} overflow issues`);
