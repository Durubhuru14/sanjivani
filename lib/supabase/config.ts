/**
 * Backend configuration state (production).
 *
 * The app talks to exactly one backend: Supabase. When the env vars are
 * missing (fresh clone, no .env.local), middleware redirects every page to
 * the /setup screen with configuration instructions — the app never boots
 * half-configured.
 */
export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** No backend configured — show the setup screen. */
export const setupRequired = !supabaseConfigured;
