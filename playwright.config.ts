import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests for Sanjivani's critical flows (spec §19).
 *
 * Prerequisites:
 *   1. Supabase running locally with migrations + seed applied:
 *        supabase db reset
 *   2. Dev server:  npm run dev   (or `bun run dev`)
 *
 * Run:  npm run test:e2e
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
