/** "Hand-crafted ledger" skin verification — capture the key surfaces at
 *  every breakpoint (320→1280), light + dark, and report horizontal
 *  overflow. Usage: PHASE=public|authed|dark node scripts/qa/ledger-shots.mjs
 *  Accounts are demo-mode (password Passw0rd!). */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";
const OUT = "/home/z/my-project/scripts/qa/shots-ledger";
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
  await page.waitForTimeout(1500);
  const emailInput = page.getByLabel("Email");
  await emailInput.fill(email);
  await page.getByLabel("Password").fill(PW);
  await page.waitForFunction(
    (v) => document.querySelector("#email")?.value === v,
    email,
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60000 });
  await page.waitForTimeout(1200);
}

async function shot(ctx, page, url, name, width, dark = false) {
  await page.setViewportSize({ width, height: Math.max(720, Math.round(width * 1.5)) });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60000 });
  if (dark) {
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch {}
    });
    await page.waitForTimeout(600);
  }
  // let the reveal + count-up animations settle, and walk the page so every
  // scroll-reveal section is visible before the fullPage capture (otherwise
  // [data-reveal] sections below the fold photograph at opacity 0)
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 110));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 350));
  });
  const overflow = await overflowPx(page);
  if (overflow > 0) {
    overflowIssues++;
    console.log(`  !! horizontal overflow ${overflow}px on ${name}-${width}${dark ? "-dark" : ""}`);
  }
  await page.screenshot({ path: `${OUT}/${name}-${width}${dark ? "-dark" : ""}.png`, fullPage: true });
  console.log(`  captured ${name}-${width}${dark ? "-dark" : ""} (overflow ${overflow}px)`);
}

import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

if (PHASE === "public") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  for (const target of PUBLIC) {
    for (const w of WIDTHS) {
      await shot(ctx, page, target.url, target.name, w);
    }
  }
  await ctx.close();
}

if (PHASE === "authed") {
  for (const target of AUTHED) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(ctx, page, target.email);
    await shot(ctx, page, target.url, target.name, 1280);
    await shot(ctx, page, target.url, target.name, 768);
    await shot(ctx, page, target.url, target.name, 375);
    await shot(ctx, page, target.url, target.name, 320);
    await ctx.close();
  }
}

if (PHASE === "dark") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await shot(ctx, page, "/", "landing", 1280, true);
  await shot(ctx, page, "/login", "login", 1280, true);
  await shot(ctx, page, "/signup", "signup", 1280, true);
  for (const target of AUTHED.slice(0, 2)) {
    await login(ctx, page, target.email);
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch {}
    });
    await page.waitForTimeout(400);
    await shot(ctx, page, target.url, target.name, 1280, true);
  }
  await ctx.close();
}

if (PHASE === "dense") {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(ctx, page, "admin@sanjivani.test");
  await shot(ctx, page, "/admin/ngos", "admin-ngos", 1280);
  await shot(ctx, page, "/admin/ngos", "admin-ngos", 375);
  await shot(ctx, page, "/admin/campaigns", "admin-campaigns", 1280);
  await shot(ctx, page, "/admin/volunteers", "admin-volunteers", 375);
  await ctx.close();
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await login(ctx2, page2, "greenearth@sanjivani.test");
  await shot(ctx2, page2, "/ngo/campaigns", "ngo-campaigns", 1280);
  await shot(ctx2, page2, "/ngo/campaigns", "ngo-campaigns", 375);
  await ctx2.close();
  const ctx3 = await browser.newContext();
  const page3 = await ctx3.newPage();
  await login(ctx3, page3, "priya@sanjivani.test");
  await shot(ctx3, page3, "/volunteer/browse", "vol-browse", 1280);
  await shot(ctx3, page3, "/volunteer/browse", "vol-browse", 375);
  await ctx3.close();
}

await browser.close();
console.log(overflowIssues === 0 ? "NO horizontal overflow anywhere." : `${overflowIssues} overflow issues!`);
