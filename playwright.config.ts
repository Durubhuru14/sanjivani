import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for Sanjivani's critical flows (spec §19).
 *
 * Prerequisites: a local Supabase backend with migrations + seed applied:
 *
 *   supabase start          # local Supabase (Docker)
 *   supabase db reset       # migrations + seed.sql
 *   # .env.local pointing at http://127.0.0.1:54321 (see .env.example)
 *
 * Then `npm run test:e2e` boots the dev server itself and runs every spec.
 * To test another backend instead, point E2E_BASE_URL at it and set
 * E2E_NO_SERVER=1 (the dev server is then expected to be already running):
 *
 *   E2E_NO_SERVER=1 E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // flows share seeded data and are order-sensitive
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  timeout: 60_000,
});
