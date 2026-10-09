import { expect, test, login, logout } from "./helpers";

/**
 * Spec §19 flow 4:
 * NGO reports a volunteer → report appears in the admin queue.
 */
test("NGO reports a volunteer and admin reviews it", async ({ page }) => {
  // 1. NGO opens the completed seeded campaign and reports Vikram
  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.locator("a", { hasText: "Tree Plantation Marathon" }).first().click();
  await page.getByRole("tab", { name: /team & hours/i }).click();

  const reportButton = page.getByRole("button", { name: /^report$/i }).first();
  await reportButton.click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/what happened\?/i)
    .fill("E2E: skipped the morning briefing and left the site early without informing the team lead.");
  await dialog.getByRole("button", { name: /submit report/i }).click();
  await expect(page.getByText(/report submitted/i).first()).toBeVisible();
  await logout(page);

  // 2. The report lands in the admin queue
  await login(page, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const reportCard = page.locator("li", { hasText: "E2E: skipped the morning briefing" });
  await expect(reportCard).toBeVisible();
  await expect(reportCard.getByText("Open")).toBeVisible();

  // 3. Admin marks it reviewed
  await reportCard.getByRole("button", { name: /mark reviewed/i }).click();
  await expect(page.getByText(/report marked reviewed/i).first()).toBeVisible();

  // 4. The reviewed report lives in the reports directory now — the overview
  //    queue only shows open reports
  await page.goto("/admin/reports");
  const reviewedCard = page.locator("li", { hasText: "E2E: skipped the morning briefing" });
  await expect(reviewedCard).toBeVisible();
  await expect(reviewedCard.getByText("Reviewed")).toBeVisible();
});
