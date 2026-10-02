export { expect, test } from "@playwright/test";

/** Shared helpers for the Sanjivani E2E specs. */

export const ADMIN = { email: "admin@sanjivani.test", password: "Passw0rd!" };
export const NGO = { email: "greenearth@sanjivani.test", password: "Passw0rd!" };
export const VOLUNTEER = { email: "priya@sanjivani.test", password: "Passw0rd!" };

export async function login(page: import("@playwright/test").Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function logout(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await page.waitForURL((u) => u.pathname === "/login");
}

export async function signUp(
  page: import("@playwright/test").Page,
  role: "ngo" | "volunteer",
  unique: string,
  extra: { orgName?: string; registrationNumber?: string } = {}
) {
  await page.goto("/signup");
  await page.getByRole("radio", { name: new RegExp(role === "ngo" ? "I'm an NGO" : "I'm a volunteer", "i") }).click();
  await page.getByLabel("Full name").fill(`E2E ${role} ${unique}`);
  await page.getByLabel("Email").fill(`e2e-${role}-${unique}@sanjivani.test`);
  await page.getByLabel("Password").fill("Passw0rd!");
  if (role === "ngo") {
    await page.getByLabel("Organisation name").fill(extra.orgName ?? `E2E Org ${unique}`);
    await page.getByLabel("Registration number").fill(extra.registrationNumber ?? `E2E-${unique}`);
  }
  await page.getByRole("button", { name: /create account/i }).click();
}

/** Unique suffix so repeat runs never collide with seed/constraint data. */
export function uniq(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
