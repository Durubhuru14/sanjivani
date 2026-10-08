import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 7:
 * Fund allocation — NGO allocates, marks paid, remaining budget updates;
 * over-budget allocation is rejected.
 */
test("fund allocation lifecycle keeps the budget consistent", async ({ page }) => {
  await login(page, { email: "brightfutures@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.locator("a", { hasText: "After-School Tutoring Program" }).first().click();
  await page.getByRole("tab", { name: /funds/i }).click();

  // 1. Read the current remaining budget from the summary card
  const remainingCard = page.locator("div", { hasText: /^Remaining/ }).getByRole("paragraph").nth(1);
  const beforeText = await remainingCard.textContent();
  const before = Number((beforeText ?? "0").replace(/[₹,]/g, ""));

  // 2. Allocate to Priya
  const amount = 250;
  await page.locator("#fund-member").click();
  await page.getByRole("option", { name: /priya sharma/i }).click();
  await page.locator("#fund-amount").fill(String(amount));
  await page.getByRole("button", { name: /^allocate$/i }).click();
  await expect(page.getByText(/allocation recorded/i).first()).toBeVisible();

  // 3. Remaining budget decreased by exactly the allocated amount
  await expect(remainingCard).toHaveText(new RegExp(`₹${(before - amount).toLocaleString("en-IN")}`));

  // 4. Mark paid
  const pendingRow = page.locator("tr", { hasText: new RegExp(`₹${amount.toLocaleString("en-IN")}`) })
    .filter({ hasText: "Pending" })
    .first();
  await pendingRow.getByRole("button", { name: /mark paid/i }).click();
  await expect(page.getByText(/marked paid/i).first()).toBeVisible();

  // 5. Over-budget allocation is rejected with a friendly error
  await page.locator("#fund-member").click();
  await page.getByRole("option", { name: /priya sharma/i }).click();
  await page.locator("#fund-amount").fill(String(before + 100000));
  await page.getByRole("button", { name: /^allocate$/i }).click();
  await expect(page.getByText(/amount too high/i).first()).toBeVisible();
  await expect(page.getByText(/is left in this campaign's budget/i).first()).toBeVisible();
});
