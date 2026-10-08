/**
 * SENIOR QA SWEEP — click every button on every page as every role.
 *
 * Strategy:
 *  - per role: login -> crawl all same-origin links from the role home
 *  - on every page: click every visible button EXCEPT a hard skip-list
 *    (sign out, permanent deletes, reject-on-seed-pending) — the dedicated
 *    e2e specs cover those flows; this sweep hunts for the class of bug
 *    the user hit (dead buttons, protocol errors, 500s, silent failures)
 *  - auto-accept window.confirm/alert; dialogs get closed with Escape
 *  - capture pageerror / console.error / http>=400 / error toasts per click
 *  - the server is restarted with a clean seed afterwards, so mid-sweep
 *    data mutations are expected and fine
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const PW = "Passw0rd!";

const ROLES = [
  { name: "admin", email: "admin@sanjivani.test", home: "/admin" },
  { name: "ngo-greenearth", email: "greenearth@sanjivani.test", home: "/ngo" },
  { name: "ngo-brightfutures", email: "brightfutures@sanjivani.test", home: "/ngo" },
  { name: "ngo-pending-newhope", email: "newhope@sanjivani.test", home: "/ngo" },
  { name: "staff-meera", email: "meera@sanjivani.test", home: "/staff" },
  { name: "volunteer-priya", email: "priya@sanjivani.test", home: "/volunteer" },
  { name: "volunteer-aisha", email: "aisha@sanjivani.test", home: "/volunteer" },
];

// buttons never clicked by the sweep (covered by dedicated e2e specs /
// they end the session or destroy seed data needed by later sweep pages)
const SKIP = [
  /sign out/i,
  /^delete/i,
  /delete permanently/i,
  /^reject/i,
  /^remove/i, // destructive on seed teams/allocations — spec-covered
  /^approve/i, // changes seed pending states — spec-covered
  /mark reviewed/i,
  /^dismiss/i,
];

const results = [];
const browser = await chromium.launch();

for (const role of ROLES) {
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  const problems = [];
  page.on("dialog", (d) => d.accept().catch(() => {}));
  page.on("pageerror", (e) => problems.push({ kind: "pageerror", detail: String(e).slice(0, 220) }));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // the browser logs "Failed to load resource" for every 4xx fetch even when
    // the app handles it gracefully — tracked via the http log instead
    if (/^Failed to load resource/i.test(m.text())) return;
    problems.push({ kind: "console.error", detail: m.text().slice(0, 220) });
  });
  const httpLog = [];
  page.on("response", (res) => {
    const u = res.url();
    if (res.status() >= 400 && u.startsWith(BASE) && !u.includes("_next/")) {
      httpLog.push(`[${res.status()}] ${res.request().method()} ${u.replace(BASE, "").slice(0, 90)}`);
    }
  });

  // ---- login
  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(role.email);
    await page.getByLabel("Password").fill(PW);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20_000 });
  } catch (e) {
    results.push({ role: role.name, page: "LOGIN", error: String(e).slice(0, 200) });
    await ctx.close();
    continue;
  }

  // ---- crawl links from home
  const seen = new Set();
  const queue = [role.home];
  const pagesVisited = [];
  let guard = 0;
  while (queue.length && guard < 40) {
    guard++;
    const path = queue.shift();
    if (seen.has(path)) continue;
    seen.add(path);
    try {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 25_000 });
      await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {});
      const finalPath = new URL(page.url()).pathname;
      pagesVisited.push(`${path}${finalPath !== path ? ` -> ${finalPath}` : ""}`);

      // collect links
      const hrefs = await page.$$eval("a[href]", (as) =>
        as.map((a) => a.getAttribute("href")).filter(Boolean)
      );
      for (const h of hrefs) {
        if (h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("http")) continue;
        const clean = h.split("?")[0].split("#")[0];
        if (clean && !seen.has(clean) && !clean.startsWith("/login")) queue.push(clean);
      }

      // ---- click every button
      const buttons = page.locator("button:visible");
      const n = await buttons.count();
      for (let i = 0; i < n; i++) {
        const btn = buttons.nth(i);
        let label = "";
        try {
          label = ((await btn.textContent()) ?? "").trim().slice(0, 60) || (await btn.getAttribute("aria-label")) || "";
        } catch { continue; }
        if (!label || SKIP.some((re) => re.test(label))) continue;
        if (!(await btn.isVisible().catch(() => false))) continue;
        if (!(await btn.isEnabled().catch(() => false))) continue;

        const before = problems.length;
        try {
          await btn.click({ timeout: 4000 });
        } catch {
          continue; // covered/overlapped — not an app error
        }
        await page.waitForTimeout(1200);
        // a suspend click must be undone immediately so later roles keep access
        if (/^suspend$/i.test(label)) {
          const unsuspend = page.getByRole("button", { name: /unsuspend/i }).first();
          await unsuspend.click({ timeout: 6000 }).catch(() => {});
          await page.waitForTimeout(1500);
        }
        // close any dialog that opened
        const dialogCancel = page.locator("[data-slot='dialog-content'] button, [role='dialog'] button").filter({ hasText: /cancel|keep|close/i }).first();
        if ((await dialogCancel.count().catch(() => 0)) > 0) {
          await dialogCancel.click().catch(() => {});
        } else {
          await page.keyboard.press("Escape").catch(() => {});
        }
        await page.waitForTimeout(400);
        if (problems.length > before) {
          const added = problems.slice(before);
          results.push({ role: role.name, page: path, button: label, problems: added.map((p) => `${p.kind}: ${p.detail}`).slice(0, 3) });
          problems.length = before; // dedupe repeated
        }
        // if the click navigated away, go back to the page
        if (new URL(page.url()).pathname !== finalPath) {
          await page.goto(path, { waitUntil: "domcontentloaded", timeout: 25_000 }).catch(() => {});
          await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        }
      }
    } catch (e) {
      results.push({ role: role.name, page: path, error: String(e).slice(0, 200) });
    }
  }

  // 5xx = real failures; 4xx = triage list (handled business rejections are expected)
  const hardHttp = httpLog.filter((l) => /\[5\d\d\]/.test(l));
  const softHttp = httpLog.filter((l) => !/\[5\d\d\]/.test(l) && !/\[404\] GET \/api\/demo/.test(l));
  results.push({ role: role.name, summary: { pages: pagesVisited.length, httpErrors: [...new Set(hardHttp)].slice(0, 15), softHttp: [...new Set(softHttp)].slice(0, 15), pagesVisited } });
  await ctx.close();
}

await browser.close();

// ---- report
console.log("\n================ QA SWEEP REPORT ================\n");
let totalProblems = 0;
for (const r of results) {
  if (r.summary) {
    console.log(`\n[${r.role}] visited ${r.summary.pages} pages`);
    console.log(`  routes: ${r.summary.pagesVisited.join(", ")}`);
    if (r.summary.httpErrors.length) {
      totalProblems += r.summary.httpErrors.length;
      console.log(`  HARD HTTP>=500: ${r.summary.httpErrors.join(" | ")}`);
    }
    if (r.summary.softHttp?.length) {
      console.log(`  4xx (triage): ${r.summary.softHttp.join(" | ")}`);
    }
  } else if (r.error) {
    totalProblems++;
    console.log(`\n[${r.role}] PAGE ERROR on ${r.page}: ${r.error}`);
  } else {
    totalProblems += r.problems?.length ?? 0;
    console.log(`\n[${r.role}] PROBLEM on ${r.page} (button: "${r.button}")`);
    r.problems.forEach((p) => console.log(`   - ${p}`));
  }
}
console.log(`\n================ ${totalProblems} problems ================`);
