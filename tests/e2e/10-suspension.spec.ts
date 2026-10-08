import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 10:
 * Admin suspends a profile → their next request redirects to /suspended and
 * writes are rejected (RLS); unsuspending restores access with data intact.
 *
 * Tarun is seeded with profiles.suspended = true, so the flow runs:
 * unsuspend → sign in (data intact) → suspend → next request redirects.
 *
 * Each actor runs in its own browser context — sessions must not leak into
 * each other, and step 4 needs Tarun's session to stay alive while the admin
 * acts from a different one.
 */
test("suspension blocks access and unsuspend restores it", async ({ browser }) => {
  // dev-mode compiles several routes across five pages — allow extra time
  test.setTimeout(150_000);

  // 1. Admin unsuspends Tarun (seeded suspended)
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await login(admin, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  const tarunRow = admin.locator("li", { hasText: "Tarun Mehta" });
  await expect(tarunRow).toBeVisible();
  await tarunRow.getByRole("button", { name: /unsuspend/i }).click();
  await expect(admin.getByText(/can sign in again/i).first()).toBeVisible();
  await adminContext.close();

  // 2. Tarun signs in — access restored, data intact
  const tarunContext = await browser.newContext();
  const tarun = await tarunContext.newPage();
  await login(tarun, { email: "tarun@sanjivani.test", password: "Passw0rd!" });
  await tarun.waitForURL("**/volunteer");
  await expect(tarun.getByRole("heading", { name: /^hi tarun/i })).toBeVisible();

  // 3. Admin suspends Tarun again — from the platform oversight volunteers
  //    directory (suspension never needs a report)
  const admin2Context = await browser.newContext();
  const admin2 = await admin2Context.newPage();
  admin2.on("dialog", (d) => d.accept());
  await login(admin2, { email: "admin@sanjivani.test", password: "Passw0rd!" });
  await admin2.getByRole("tab", { name: /volunteers/i }).click();
  // scope to the active oversight tabpanel — the pending-verification queue
  // higher up the page lists Tarun too
  const suspendRow = admin2
    .getByRole("tabpanel")
    .locator("li", { hasText: "Tarun Mehta" })
    .first();
  await expect(suspendRow).toBeVisible();
  await suspendRow.getByRole("button", { name: /^suspend$/i }).click();
  await expect(admin2.getByText(/has been suspended/i).first()).toBeVisible();
  await admin2Context.close();

  // 4. Tarun's very next request is redirected to /suspended
  await tarun.goto("/volunteer/browse");
  await tarun.waitForURL("**/suspended");
  await expect(tarun.getByText(/account has been suspended/i)).toBeVisible();
  // The page also keeps his data summary (nothing was deleted)
  await expect(tarun.getByText(/nothing has been deleted/i)).toBeVisible();

  // 5. He can still sign out from the suspended page
  await tarun.getByRole("button", { name: /sign out/i }).click();
  await tarun.waitForURL("**/login");
  await tarunContext.close();
});
