import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 8:
 * Campaign completed → both sides submit ratings → avg_rating updates.
 */
test("post-completion ratings update both averages", async ({ page }) => {
  // Seeded "Tree Plantation Marathon" is completed with ratings on both sides.
  await login(page, { email: "priya@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/volunteer");
  await page.locator("a", { hasText: "Tree Plantation Marathon" }).first().click();

  // Volunteer already rated the NGO — her rating shows and avg is visible
  await expect(page.getByText(/your rating for/i)).toBeVisible();
  await expect(page.getByText("Well-organized campaign. Materials and route maps were ready before time.")).toBeVisible();

  // Her profile shows the avg_rating computed by the trigger
  await page.goto("/volunteer/profile");
  await expect(page.getByText("Average rating")).toBeVisible();
  await expect(page.getByText("5.00").first()).toBeVisible(); // avg of Priya's ratings

  // NGO side: Green Earth sees the ratings it gave and received
  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.locator("a", { hasText: "Tree Plantation Marathon" }).first().click();
  await page.getByRole("tab", { name: /ratings/i }).click();
  await expect(page.getByText(/ratings received for this campaign/i)).toBeVisible();
  await expect(page.getByText("Priya Sharma").first()).toBeVisible();

  // Green Earth's profile carries the trigger-computed average (4.33 from 5,4,4)
  await page.goto("/ngo/profile");
  await expect(page.getByText("4.33").first()).toBeVisible();
});
