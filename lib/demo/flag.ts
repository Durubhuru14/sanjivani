/**
 * Demo mode — activation flag (client + server safe).
 *
 * No Supabase env configured → the app boots into demo mode: every
 * supabase client is swapped for an in-memory, seeded mock and the
 * whole product is walkable with the accounts from the README
 * (password `Passw0rd!`) without any external service.
 */
export const demoActive =
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const DEMO_COOKIE = "sv-demo-user";
