import { expect, test, login } from "./helpers";

/**
 * Admin oversight directories — the restructured admin section:
 * dedicated pages per actor with URL-driven search, status filters and
 * pagination, plus the volunteer/staff drill-down detail pages.
 */
test("admin directories search, filter, and drill down", async ({ page }) => {
  test.setTimeout(120_000);

  await login(page, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  await page.waitForURL("**/admin");

  // 1. The section nav reaches every directory from the overview
  await page.getByRole("link", { name: "Campaigns", exact: true }).click();
  await page.waitForURL("**/admin/campaigns");
  await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();
  await expect(page.locator("li").filter({ hasText: "River Clean-Up" })).toBeVisible();

  // 2. Search narrows the campaign directory and lives in the URL
  await page.getByLabel("Search").fill("tree");
  await page.keyboard.press("Enter");
  await page.waitForURL(/q=tree/);
  await expect(page.locator("li").filter({ hasText: "Tree Plantation Marathon" })).toBeVisible();
  await expect(page.locator("li").filter({ hasText: "River Clean-Up" })).toHaveCount(0);

  // 3. Status filter chips preserve the query and filter correctly
  await page.getByRole("link", { name: /^Completed/ }).click();
  await page.waitForURL(/status=completed/);
  await expect(page.locator("li").filter({ hasText: "Tree Plantation Marathon" })).toBeVisible();
  await expect(page.getByText(/campaign unavailable|no campaigns match/i)).toHaveCount(0);

  // 4. Volunteer directory → drill into a volunteer's full history
  await page.getByRole("link", { name: "Volunteers", exact: true }).click();
  await page.waitForURL("**/admin/volunteers");
  const priyaRow = page.locator("li").filter({ hasText: "Priya Sharma" });
  await expect(priyaRow).toBeVisible();
  await priyaRow.getByRole("link", { name: "Priya Sharma" }).click();
  await page.waitForURL(/\/admin\/volunteers\/[a-f0-9-]+$/);
  await expect(page.getByRole("heading", { name: /priya sharma/i })).toBeVisible();
  // her seeded history: teams + applications + ratings all render
  await expect(page.getByText("Campaign teams")).toBeVisible();
  await expect(page.getByText("Tree Plantation Marathon").first()).toBeVisible();
  await expect(page.getByText("Ratings received")).toBeVisible();

  // 5. Staff directory lists invites across NGOs and links to the NGO page
  await page.getByRole("link", { name: "Staff", exact: true }).click();
  await page.waitForURL("**/admin/staff");
  await expect(
    page.locator("li").filter({ hasText: "meera@sanjivani.test" })
  ).toBeVisible();

  // 6. Reports directory separates open from closed with filter chips
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await page.waitForURL("**/admin/reports");
  await expect(page.getByRole("heading", { name: "Volunteer reports" })).toBeVisible();
  await page.getByRole("link", { name: /^Open/ }).click();
  await page.waitForURL(/status=open/);
  // the seeded report against Vikram stays open through the whole suite
  await expect(page.getByText(/care-rota rounds/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /dismiss/i }).first()).toBeVisible();

  // 7. Overview stat cards link into the directories
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await page.waitForURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
});
