import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDemoBrowserClient } from "@/lib/demo/client";
import { demoActive } from "@/lib/demo/flag";

/**
 * Browser client.
 * Real Supabase when env is configured; otherwise the in-memory demo client
 * (queries transport through POST /api/demo so every browser shares the
 * server-side seeded store). The demo client is cast to the SupabaseClient
 * contract — it implements the surface the app uses.
 */
export const supabaseConfigured = !demoActive;

export function createClient(): SupabaseClient {
  if (demoActive) {
    return createDemoBrowserClient() as unknown as SupabaseClient;
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
