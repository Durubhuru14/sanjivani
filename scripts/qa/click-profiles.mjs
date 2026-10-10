/** Supplementary sweep: profile pages + staff accept-invite (missed by the
 * link crawler because they sit behind the account dropdown). */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";

const CASES = [
  { name: "admin", email: "admin@sanjivani.test", routes: ["/admin/profile"] },
  { name: "ngo-greenearth", email: "greenearth@sanjivani.test", routes: ["/ngo/profile"] },
  { name: "ngo-pending-newhope", email: "newhope@sanjivani.test", routes: ["/ngo/profile"] },
  { name: "staff-meera", email: "meera@sanjivani.test", routes: ["/staff/profile", "/staff/accept-invite"] },
  { name: "volunteer-priya", email: "priya@sanjivani.test", routes: ["/volunteer/profile", "/staff/accept-invite"] },
];

const SKIP = [/sign out/i, /^delete/i, /^reject/i, /^remove/i, /^approve/i, /mark reviewed/i, /^dismiss/i];

const browser = await chromium.launch();
let problems = 0;

for (const c of CASES) {
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept().catch(() => {}));
  const errs = [];
  page.on("pageerror", (e) => errs.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/^Failed to load resource/i.test(m.text()))
      errs.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 500 && r.url().startsWith(BASE) && !r.url().includes("_next/"))
      errs.push(`http${r.status()}: ${r.url().replace(BASE, "")}`);
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(c.email);
  await page.getByLabel("Password").fill(PW);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });

  for (const route of c.routes) {
    try {
      await page.goto(route, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      const final = new URL(page.url()).pathname;
      const buttons = page.locator("button:visible");
      const n = await buttons.count();
      let clicked = 0;
      for (let i = 0; i < n; i++) {
        const btn = buttons.nth(i);
        const label = ((await btn.textContent().catch(() => "")) ?? "").trim().slice(0, 50);
        if (!label || SKIP.some((re) => re.test(label))) continue;
        if (!(await btn.isVisible().catch(() => false))) continue;
        if (!(await btn.isEnabled().catch(() => false))) continue;
        const before = errs.length;
        await btn.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(1000);
        // avatar "Remove" is skipped; close dialogs
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(300);
        if (errs.length > before) {
          console.log(`[${c.name}] ${route} "${label}": ${errs.slice(before).join(" | ")}`);
          errs.length = before;
          problems++;
        }
        if (new URL(page.url()).pathname !== final) {
          await page.goto(route).catch(() => {});
        }
        clicked++;
      }
      console.log(`[${c.name}] ${route} -> ${final === route ? "ok" : `redirected to ${final}`} (${clicked} buttons clicked)`);
    } catch (e) {
      console.log(`[${c.name}] ${route} ERROR: ${String(e).slice(0, 150)}`);
      problems++;
    }
  }
  await ctx.close();
}
await browser.close();
console.log(`\n===== profile sweep: ${problems} problems =====`);
