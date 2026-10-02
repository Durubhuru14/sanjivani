import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 9:
 * Invite-only campaign — NGO invites a volunteer → the volunteer accepts →
 * an accepted application exists and they can be added to the team.
 */
test("invite-only campaign joins through an invitation", async ({ page }) => {
  // Aisha has a pending invite to the seeded invite-only campaign
  await login(page, { email: "aisha@sanjivani.test", password: "Passw0rd!" });

  // 1. The invite-only campaign is NOT in public browse
  await page.goto("/volunteer/browse");
  await expect(page.locator("a", { hasText: "Winter Shelter Support" })).toHaveCount(0);

  // 2. She sees the invitation and accepts it
  await page.goto("/volunteer/invites");
  const inviteCard = page.locator("div.rounded-xl", { hasText: "Winter Shelter Support" });
  await expect(inviteCard.getByText("Upcoming")).toBeVisible();
  await inviteCard.getByRole("button", { name: /accept invite/i }).click();
  await expect(page.getByText(/invitation accepted/i)).toBeVisible();
  await expect(inviteCard).toHaveCount(0); // moved out of pending

  // 3. The campaign is now reachable and her application is accepted
  await page.goto("/volunteer");
  await page.locator("a", { hasText: "Winter Shelter Support" }).first().click();
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();

  // 4. The NGO can add her to the team
  await login(page, { email: "brightfutures@sanjivani.test", password: "Passw0rd!" });
  await page.goto("/ngo/campaigns");
  await page.locator("a", { hasText: "Winter Shelter Support" }).first().click();
  await page.getByRole("tab", { name: /team & hours/i }).click();
  await page.getByRole("button", { name: /add member/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await dialog.getByRole("option", { name: /aisha khan/i }).click();
  await dialog.getByRole("button", { name: /add to team/i }).click();
  await expect(page.locator("li", { hasText: "Aisha Khan" }).first()).toBeVisible();
});
