import { expect, test, login, uniq } from "./helpers";

/**
 * Spec §19 flow 2:
 * Signup → Volunteer applies → NGO accepts → volunteer appears on team.
 */
test("volunteer applies, NGO accepts, team assignment", async ({ page }) => {
  const suffix = uniq();

  // 1. Volunteer signs up
  await page.goto("/signup");
  await page.getByRole("radio", { name: /i'm a volunteer/i }).click();
  await page.getByLabel("Full name").fill(`E2E Volunteer ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-vol-${suffix}@sanjivani.test`);
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/volunteer");
  await expect(page.getByText(/hi e2e volunteer/i)).toBeVisible();

  // 2. Browse public campaigns and apply to the seeded ongoing campaign
  await page.goto("/volunteer/browse");
  await page.getByPlaceholder(/search by title/i).fill("After-School Tutoring");
  await page.getByRole("button", { name: "Search" }).click();
  const card = page.locator("a", { hasText: "After-School Tutoring Program" }).first();
  await card.click();
  await page.getByRole("button", { name: /apply to join/i }).click();
  await expect(page.getByText(/application sent/i)).toBeVisible();
  await expect(page.getByText("Pending")).toBeVisible();

  // 3. NGO accepts the application
  await login(page, { email: "brightfutures@sanjivani.test", password: "Passw0rd!" });
  await page.waitForURL("**/ngo");
  const appRow = page.locator("li", { hasText: `E2E Volunteer ${suffix}` });
  await expect(appRow).toBeVisible();
  await appRow.getByRole("link", { name: "Review" }).click();
  await page.getByRole("button", { name: /^accept$/i }).click();
  await expect(page.getByText(/can now be added to a team/i)).toBeVisible();

  // 4. Add to team — the volunteer becomes assignable
  await page.getByRole("tab", { name: /team & hours/i }).click();
  await page.getByRole("button", { name: /add member/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await dialog.getByRole("option", { name: new RegExp(`E2E Volunteer ${suffix}`) }).click();
  await dialog.getByRole("button", { name: /add to team/i }).click();
  await expect(
    page.locator("li", { hasText: `E2E Volunteer ${suffix}` }).first()
  ).toBeVisible();

  // 5. The volunteer appears on the team on their side
  await login(page, { email: `e2e-vol-${suffix}@sanjivani.test`, password: "Passw0rd!" });
  await page.goto("/volunteer");
  await expect(page.getByText("After-School Tutoring Program").first()).toBeVisible();
});
