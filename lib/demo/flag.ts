/**
 * Demo mode — a separate, opt-in runtime (NOT part of normal deployment).
 *
 * It only activates when the app is explicitly run with demo mode enabled
 * (NEXT_PUBLIC_DEMO_MODE=1, e.g. via `npm run demo`). Every supabase client
 * is then swapped for the in-memory, seeded store and the whole product is
 * walkable with the accounts from the README (password `Passw0rd!`).
 *
 * Without the flag: if Supabase env vars are configured the app runs against
 * the real backend; if nothing is configured, middleware redirects to /setup
 * with configuration instructions.
 */
export const demoActive =
  process.env.NEXT_PUBLIC_DEMO_MODE === "1" || process.env.DEMO_MODE === "1";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Neither demo nor a real backend — show the setup screen. */
export const setupRequired = !demoActive && !supabaseConfigured;

export const DEMO_COOKIE = "sv-demo-user";
