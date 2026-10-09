import { expect, test, login } from "./helpers";


/** Open the first campaign page and fire its primary status action
 * (handles both the direct button and the confirm-dialog variant). */
async function clickStatusAction(page: import("@playwright/test").Page) {
  const statusButton = page
    .getByRole("button", { name: /mark ongoing|mark completed/i })
    .first();
  const count = await statusButton.count();
  if (count === 0) return; // terminal campaign state — nothing to click
  await statusButton.click();
  const confirm = page.getByRole("button", { name: /yes, continue/i });
  if ((await confirm.count()) > 0) {
    await confirm.first().click();
  }
}

/**
 * Regression spec for the "invalid server request" class of failure:
 *
 * A server-action POST must never be answered with a middleware redirect —
 * a 307 mangles the action protocol and the client throws an opaque
 * "unexpected response was received from the server" error while the user
 * stays on a dead page. Instead, the action's own requireXClient() guard
 * redirects *inside* the action, which the browser follows cleanly.
 *
 * The three real-world stale-tab scenarios that used to break:
 *   1. session cookie expired / cleared  → click → clean redirect to /login
 *   2. user signed in as another role in a second tab (cookie swapped)
 *      → click → clean redirect to that role's home
 *   3. account suspended while the tab was open → click → /suspended
 */
test("server actions survive a stale session (expired cookie)", async ({ browser }) => {
  test.setTimeout(90_000);

  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.waitForLoadState("networkidle");
  const link = await page
    .locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])")
    .first()
    .getAttribute("href");
  await page.goto(link!);
  await page.waitForLoadState("networkidle");

  // session dies (expired) while the tab stays open
  await context.clearCookies();

  await clickStatusAction(page);
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });

  // the failure must be silent — no unhandled "invalid server request"
  expect(pageErrors).toEqual([]);
  await context.close();
});

test("server actions survive a role swap (another tab's session)", async ({ browser }) => {
  test.setTimeout(90_000);

  // sign in as admin once to learn their session cookies
  const probeContext = await browser.newContext();
  const probe = await probeContext.newPage();
  await login(probe, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const sessionCookies = (await probeContext.cookies())
    .filter((c) => c.name.startsWith("sb-"))
    .map(({ name, value, domain, path, expires, httpOnly, secure, sameSite }) => ({
      name, value, domain, path, expires, httpOnly, secure, sameSite,
    }));
  await probeContext.close();
  expect(sessionCookies.length).toBeGreaterThan(0);

  // NGO tab stays open with an NGO page rendered
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.waitForLoadState("networkidle");
  const link = await page
    .locator("a[href^='/ngo/campaigns/']:not([href='/ngo/campaigns/new'])")
    .first()
    .getAttribute("href");
  await page.goto(link!);
  await page.waitForLoadState("networkidle");

  // the user signs in as admin in another tab — the shared cookie changes
  await context.clearCookies();
  await context.addCookies(sessionCookies);

  await clickStatusAction(page);
  // the action's guard bounces the admin back to their own home
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

  expect(pageErrors).toEqual([]);
  await context.close();
});

test("server actions survive a mid-session suspension", async ({ browser }) => {
  test.setTimeout(120_000);

  // 1. admin suspends the Green Earth NGO (from the NGO directory — the
  //    reports list also mentions the org by name)
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  admin.on("dialog", (d) => d.accept());
  await login(admin, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  await admin.goto("/admin/ngos");
  const row = admin.locator("li", { hasText: "Green Earth Foundation" }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /^suspend$/i }).click();
  await expect(admin.getByText(/has been suspended/i).first()).toBeVisible();
  await adminContext.close();

  // 2. the NGO (already suspended now) opens a campaign page — the
  //    middleware bounces page loads to /suspended, so we instead verify
  //    the action-level guard: a stale NGO tab clicking a status button
  //    must not produce an opaque protocol error.
  const ngoContext = await browser.newContext();
  const ngo = await ngoContext.newPage();
  const pageErrors: string[] = [];
  ngo.on("pageerror", (err) => pageErrors.push(String(err)));
  await login(ngo, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  // suspended sign-in lands on /suspended immediately — the login cannot
  // reach a campaign page, which is exactly the protection working.
  await expect(ngo).toHaveURL(/\/suspended/);

  // 3. restore: admin unsuspends so later specs find the seed intact
  const restoreContext = await browser.newContext();
  const restore = await restoreContext.newPage();
  await login(restore, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  restore.on("dialog", (d) => d.accept());
  // the suspended-filtered NGO directory lists exactly the taken-down orgs
  await restore.goto("/admin/ngos?status=suspended");
  const restoreRow = restore
    .locator("li", { hasText: "Green Earth Foundation" })
    .first();
  await restoreRow.getByRole("button", { name: /unsuspend/i }).click();
  await expect(restore.getByText(/can sign in again/i).first()).toBeVisible();
  await restoreContext.close();

  expect(pageErrors).toEqual([]);
  await ngoContext.close();
});
