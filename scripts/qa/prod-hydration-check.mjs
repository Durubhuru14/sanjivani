/** Prod hydration check: does the login form appear after hydration? */
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ baseURL: "http://localhost:3000" });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${String(e).slice(0, 300)}`));
page.on("requestfailed", (r) => errors.push(`REQFAIL: ${r.url().slice(-80)} ${r.failure()?.errorText}`));

await page.goto("/login", { waitUntil: "networkidle", timeout: 30_000 });
console.log("After networkidle:");
console.log("  email label count:", await page.getByLabel("Email").count());
console.log("  buttons:", await page.locator("button").count());
console.log("  scripts on page:", await page.locator("script[src]").count());

await page.waitForTimeout(6000);
console.log("After +6s:");
console.log("  email label count:", await page.getByLabel("Email").count());

// try forcing a reload with cache disabled
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(4000);
console.log("After reload:");
console.log("  email label count:", await page.getByLabel("Email").count());
console.log("  title:", await page.title());

console.log("\nErrors captured:");
console.log(errors.length ? errors.slice(0, 12).join("\n") : "(none)");
await browser.close();
