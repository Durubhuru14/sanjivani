import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createDemoServerClient } from "@/lib/demo/server-client";
import { demoActive } from "@/lib/demo/flag";

/**
 * Service-role client. Server-side ONLY (API routes / server actions).
 * Never import this from a Client Component — the key must stay out of the browser bundle.
 * In demo mode it maps to the in-memory store (service-role semantics).
 */
export function createAdminClient(): SupabaseClient {
  if (demoActive) {
    return createDemoServerClient() as unknown as SupabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for this server-side operation. Add it to .env.local (never commit it)."
    );
  }
  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
