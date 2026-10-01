import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createDemoServerClient } from "@/lib/demo/server-client";
import { demoActive } from "@/lib/demo/flag";

/**
 * Server client (server components / route handlers / server actions).
 * Real Supabase when env is configured; otherwise the demo client that
 * executes directly against the in-memory seeded store.
 */
export async function createClient(): Promise<SupabaseClient> {
  if (demoActive) {
    return createDemoServerClient() as unknown as SupabaseClient;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — middleware refreshes sessions instead
          }
        },
      },
    }
  );
}
