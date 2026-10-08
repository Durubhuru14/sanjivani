import { expect, test, login, logout, uniq } from "./helpers";

/**
 * Spec §19 flow 5:
 * NGO invites a staff member by email → that person signs up with the matching
 * email → ngo_staff flips to active and they are assignable to a team.
 */
test("staff invite is claimed at signup and becomes assignable", async ({ page }) => {
  const suffix = uniq();
  const email = `e2e-staff-${suffix}@sanjivani.test`;

  // 1. NGO invites a staff member
  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/staff");
  await page.getByLabel("Name").fill(`E2E Staff ${suffix}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /^invite$/i }).click();
  await expect(page.getByText(/invite sent/i).first()).toBeVisible();
  const staffRow = page.locator("li", { hasText: email });
  await expect(staffRow.getByText("Invited")).toBeVisible();
  await logout(page);

  // 2. That person signs up with the matching email — invite auto-detected
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  // the invite check runs on blur of the email field
  await page.getByLabel("Email").blur();
  await expect(page.getByText(/staff invite from/i)).toBeVisible();
  await page.getByLabel("Full name").fill(`E2E Staff ${suffix}`);
  await page.getByLabel("Password").fill("Passw0rd!");
  await page.getByRole("button", { name: /create account/i }).click();

  // 3. They land on the staff dashboard scoped to the NGO
  await page.waitForURL("**/staff");
  await expect(page.getByRole("heading", { name: /staff dashboard/i })).toBeVisible();
  await expect(page.getByText("Green Earth Foundation").first()).toBeVisible();

  // 4. The roster now shows them active, and the NGO can assign them to a team
  await login(page, { email: "greenearth@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/staff");
  await expect(staffRow.getByText("Active")).toBeVisible();

  await page.goto("/ngo/campaigns");
  await page.locator("a", { hasText: "River Clean-Up Drive" }).first().click();
  await page.getByRole("tab", { name: /team & hours/i }).click();
  await page.getByLabel(/new team name/i).fill(`E2E Crew ${suffix}`);
  await page.getByRole("button", { name: /add team/i }).click();
  const teamCard = page.locator("div.rounded-xl", { hasText: `E2E Crew ${suffix}` });
  await teamCard.getByRole("button", { name: /add member/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  // Radix portals the option list outside the dialog DOM — scope to the page
  await page.getByRole("option", { name: new RegExp(`E2E Staff ${suffix}`) }).click();
  await dialog.getByRole("button", { name: /add to team/i }).click();
  await expect(teamCard.locator("li", { hasText: `E2E Staff ${suffix}` })).toBeVisible();
});
