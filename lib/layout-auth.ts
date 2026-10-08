import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME } from "@/lib/supabase/middleware";
import type { Profile, Role } from "@/lib/types";

/**
 * Profile loader for role layouts. Middleware already guards prefixes,
 * this keeps layouts resilient (defense in depth) and gives children data.
 */
export async function requireLayoutProfile(role: Role): Promise<{
  profile: Profile;
  email: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?error=incomplete");
  if ((profile as Profile).suspended) redirect("/suspended");
  if ((profile as Profile).role !== role) redirect(ROLE_HOME[(profile as Profile).role] ?? "/login");

  return { profile: profile as Profile, email: user.email ?? null, supabase };
}
