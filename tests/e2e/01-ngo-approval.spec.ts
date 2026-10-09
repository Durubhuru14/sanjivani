import { expect, test, login, uniq } from "./helpers";

/**
 * Spec §19 flow 1:
 * Signup → NGO pending → admin approves → NGO creates campaign.
 */
test("NGO signup, admin approval, and first campaign", async ({ page }) => {
  const suffix = uniq();

  // 1. Sign up as an NGO
  await page.goto("/signup");
  await page.getByRole("radio", { name: /i'm an ngo/i }).click();
  await page.getByLabel("Full name").fill(`E2E Founder ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-ngo-${suffix}@sanjivani.test`);
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByLabel("Organisation name").fill(`E2E Foundation ${suffix}`);
  await page.getByLabel("Registration number").fill(`E2E-REG-${suffix}`);
  await page.getByRole("button", { name: /create account/i }).click();

  // 2. Pending-approval screen shows
  await page.waitForURL("**/ngo");
  await expect(page.getByText(/approval in progress/i)).toBeVisible();

  // 3. Admin approves
  await login(page, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  await page.waitForURL("**/admin");
  // the pending NGO shows in the approval queue AND the oversight directory
  const orgRow = page.locator("li", { hasText: `E2E Foundation ${suffix}` }).first();
  await expect(orgRow).toBeVisible();
  await orgRow.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/approved — they were notified/i).first()).toBeVisible();

  // 4. The NGO can now create a campaign
  await login(page, { email: `e2e-ngo-${suffix}@sanjivani.test`, password: "Passw0rd!" });
  await page.waitForURL("**/ngo");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await page.goto("/ngo/campaigns/new");
  await page.getByLabel("Title").fill(`E2E Campaign ${suffix}`);
  await page.getByLabel("Description").fill("Campaign created by the E2E flow.");
  await page.getByLabel("Start date").fill("2026-11-01");
  await page.getByLabel("End date").fill("2026-11-30");
  await page.getByLabel("Total budget (₹)").fill("10000");
  await page.getByRole("button", { name: /create campaign/i }).click();
  await page.waitForURL(new RegExp(`/ngo/campaigns/.+`));
  await expect(page.getByRole("heading", { name: `E2E Campaign ${suffix}` })).toBeVisible();
  await expect(page.getByText("₹10,000")).toBeVisible();
});
