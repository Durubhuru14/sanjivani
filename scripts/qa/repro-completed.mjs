/**
 * Deeper repro: test Mark completed (AlertDialog path), cancel, and
 * campaigns with team members / applications / funds attached.
 */
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const NGO = { email: "greenearth@sanjivani.test", password: "Passw0rd!" };

const browser = await chromium.launch();
const ctx = await browser.newContext({ baseURL: BASE });
const page = await ctx.newPage();

const problems = [];
page.on("console", (msg) => {
  if (msg.type() === "error") problems.push(`[console.error] ${msg.text().slice(0, 400)}`);
});
page.on("pageerror", (err) => problems.push(`[pageerror] ${String(err).slice(0, 600)}`));
page.on("response", (res) => {
  if (res.status() >= 400 && res.url().includes(BASE)) {
    problems.push(`[http ${res.status()}] ${res.request().method()} ${res.url().replace(BASE, "")}`);
  }
});

async function report() {
  const toasts = await page.locator("[data-sonner-toast], [role='status']").allTextContents();
  return toasts;
}

await page.goto("/login");
await page.getByLabel("Email").fill(NGO.email);
await page.getByLabel("Password").fill(NGO.password);
await page.getByRole("button", { name: /log in/i }).click();
await page.waitForURL((u) => u.pathname.startsWith("/ngo"));

// List all campaigns with their current status
await page.goto("/ngo/campaigns");
await page.waitForLoadState("networkidle");
const cards = await page.locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])").all();
console.log("Campaigns:", cards.length);

for (const card of cards) {
  const href = await card.getAttribute("href");
  await page.goto(href);
  await page.waitForLoadState("networkidle");
  const title = await page.locator("h1").first().textContent();
  const badges = await page.locator("[data-slot='badge'], .inline-flex.rounded-full").allTextContents();
  console.log(`\n--- ${title} (${href}) badges=${JSON.stringify(badges.slice(0, 4))}`);

  const completedBtn = page.getByRole("button", { name: /mark completed/i });
  if ((await completedBtn.count()) > 0) {
    console.log("Clicking Mark completed (dialog)...");
    await completedBtn.first().click();
    await page.waitForTimeout(500);
    const confirm = page.getByRole("button", { name: /yes, continue/i });
    if ((await confirm.count()) > 0) {
      await confirm.first().click();
      await page.waitForTimeout(3500);
      console.log("Toasts:", JSON.stringify(await report()));
    }
  } else {
    console.log("No Mark completed button (status already terminal or upcoming)");
  }
}

console.log("\n===== PROBLEMS CAPTURED =====");
console.log(problems.length ? problems.join("\n") : "(none)");

await browser.close();
