import { expect, test, login } from "./helpers";

/**
 * Spec §19 flow 6:
 * NGO creates a chat room with a subset of the team → only those members see
 * the room and can exchange a realtime message; a non-member cannot.
 *
 * Each actor runs in its own browser context — the demo session is a single
 * cookie, and the realtime step needs the NGO and Rahul signed in at the
 * same time.
 */
test("chat room is visible only to its selected members", async ({ browser }) => {
  // 1. NGO creates a room with just Rahul from the seeded campaign team
  const ngoContext = await browser.newContext();
  const ngo = await ngoContext.newPage();
  await login(ngo, { email: "brightfutures@sanjivani.test", password: "Passw0rd!" });
  await ngo.goto("/ngo/campaigns");
  await ngo.locator("a", { hasText: "After-School Tutoring Program" }).first().click();
  await ngo.locator("a", { hasText: /chat rooms/i }).first().click();
  await ngo.getByRole("button", { name: /new room/i }).click();
  const dialog = ngo.getByRole("dialog");
  await dialog.getByLabel(/room name/i).fill("E2E Private Room");
  await dialog
    .getByRole("checkbox")
    .and(ngo.locator("label", { hasText: "Rahul Patil" }).locator("button"))
    .first()
    .click();
  await dialog.getByRole("button", { name: /create room/i }).click();
  await ngo.waitForURL(/\/chat\/.+$/);
  await expect(ngo.getByRole("heading", { name: "E2E Private Room" })).toBeVisible();

  // 2. Rahul (member) sees the room and receives a realtime message
  const rahulContext = await browser.newContext();
  const rahul = await rahulContext.newPage();
  await login(rahul, { email: "rahul@sanjivani.test", password: "Passw0rd!" });
  await rahul.goto("/volunteer");
  const roomLink = rahul.locator("a", { hasText: "E2E Private Room" });
  await expect(roomLink).toBeVisible();
  await roomLink.click();

  // 3. NGO sends a message; Rahul receives it in realtime
  //    (the NGO context is still inside the room it created)
  await ngo.getByLabel("Message", { exact: true }).fill("Hello from the E2E room test!");
  await ngo.getByRole("button", { name: /send message/i }).click();
  await expect(
    rahul.getByText("Hello from the E2E room test!")
  ).toBeVisible({ timeout: 15_000 });

  // 4. A non-member of the room (Priya) cannot see it
  const priyaContext = await browser.newContext();
  const priya = await priyaContext.newPage();
  await login(priya, { email: "priya@sanjivani.test", password: "Passw0rd!" });
  await priya.goto("/volunteer");
  await expect(priya.locator("a", { hasText: "E2E Private Room" })).toHaveCount(0);
  // And direct navigation is blocked (notFound — RLS hides the room row)
  const roomId = new URL(ngo.url()).pathname.split("/").pop() ?? "";
  const resp = await priya.goto(`/volunteer/chat/${roomId}`);
  await expect(priya.getByRole("heading", { name: "E2E Private Room" })).toHaveCount(0);

  await Promise.all([ngoContext.close(), rahulContext.close(), priyaContext.close()]);
  expect(resp).toBeTruthy();
});
