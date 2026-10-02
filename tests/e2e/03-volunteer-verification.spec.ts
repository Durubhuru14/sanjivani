import { expect, test, login, uniq } from "./helpers";

/**
 * Spec §19 flow 3:
 * Volunteer verification — pending → admin approves → verified badge on profile.
 */
test("volunteer verification adds the badge without gating core use", async ({ page }) => {
  const suffix = uniq();

  // 1. Volunteer signs up — usable immediately while pending
  await page.goto("/signup");
  await page.getByRole("radio", { name: /i'm a volunteer/i }).click();
  await page.getByLabel("Full name").fill(`E2E Badge ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-badge-${suffix}@sanjivani.test`);
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/volunteer");

  // Can browse while pending (spec: core features usable while pending)
  await page.goto("/volunteer/browse");
  await expect(page.getByRole("heading", { name: /browse campaigns/i })).toBeVisible();

  // Profile shows pending, no badge yet
  await page.goto("/volunteer/profile");
  await expect(page.getByText("Pending")).toBeVisible();
  await expect(page.getByTestId("verified-badge")).toHaveCount(0);

  // 2. Admin approves the volunteer
  await login(page, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const row = page.locator("li", { hasText: `E2E Badge ${suffix}` });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/is now verified/i)).toBeVisible();
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();

  // 3. The badge now shows on the volunteer profile
  await login(page, { email: `e2e-badge-${suffix}@sanjivani.test`, password: "Passw0rd!" });
  await page.goto("/volunteer/profile");
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
});
