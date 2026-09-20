import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api";
import type { Profile } from "@/lib/types";

export interface AuthContext {
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

/** Returns the signed-in user's profile + a server client, or a fail() response. */
export async function requireUser(): Promise<AuthContext | { error: ReturnType<typeof fail> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: fail("You need to be signed in.", "UNAUTHORIZED", 401) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: fail("Profile not found.", "NO_PROFILE", 403) };
  if (profile.suspended) return { error: fail("Your account is suspended.", "SUSPENDED", 403) };

  return { profile: profile as Profile, supabase };
}

export async function requireRole(
  ...roles: Array<Profile["role"]>
): Promise<AuthContext | { error: ReturnType<typeof fail> }> {
  const ctx = await requireUser();
  if ("error" in ctx) return ctx;
  if (!roles.includes(ctx.profile.role)) {
    return { error: fail("You do not have permission to do that.", "FORBIDDEN", 403) };
  }
  return ctx;
}
