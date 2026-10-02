import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 10:
 * Admin suspends a profile → their next request redirects to /suspended and
 * writes are rejected (RLS); unsuspending restores access with data intact.
 *
 * Tarun is seeded with profiles.suspended = true, so the flow runs:
 * unsuspend → sign in (data intact) → suspend → next request redirects.
 */
test("suspension blocks access and unsuspend restores it", async ({ page, context }) => {
  const admin = await context.newPage();

  // 1. Admin unsuspends Tarun (seeded suspended)
  await login(admin, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const tarunRow = admin.locator("li", { hasText: "Tarun Mehta" });
  await expect(tarunRow).toBeVisible();
  await tarunRow.getByRole("button", { name: /unsuspend/i }).click();
  await expect(admin.getByText(/can sign in again/i)).toBeVisible();
  await admin.close();

  // 2. Tarun signs in — access restored, data intact
  const tarun = await context.newPage();
  await login(tarun, { email: "tarun@sanjivani.test", password: "Passw0rd!" });
  await tarun.waitForURL("**/volunteer");
  await expect(tarun.getByText(/hi tarun/i)).toBeVisible();

  // 3. Admin suspends Tarun again (accept the confirmation dialog)
  const admin2 = await context.newPage();
  page.on("dialog", (d) => d.accept());
  await login(admin2, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const suspendRow = admin2.locator("li", { hasText: "Tarun Mehta" });
  await suspendRow.getByRole("button", { name: /^suspend$/i }).click();
  await expect(admin2.getByText(/has been suspended/i)).toBeVisible();
  await admin2.close();

  // 4. Tarun's very next request is redirected to /suspended
  await tarun.goto("/volunteer/browse");
  await tarun.waitForURL("**/suspended");
  await expect(tarun.getByText(/account has been suspended/i)).toBeVisible();
  // The page also keeps his data summary (nothing was deleted)
  await expect(tarun.getByText(/nothing has been deleted/i)).toBeVisible();

  // 5. He can still sign out from the suspended page
  await tarun.getByRole("button", { name: /sign out/i }).click();
  await tarun.waitForURL("**/login");
  await tarun.close();
});
