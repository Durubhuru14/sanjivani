import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/api";

const schema = z.object({ profileId: z.uuid() });

/**
 * POST /api/admin/suspend (spec §8).
 * RLS allows only admins to flip `suspended`; data is preserved for a later
 * unsuspend. The middleware redirects the user on their next request.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;
  if (parsed.data.profileId === auth.profile.id) {
    return fail("You cannot suspend your own admin account.", "SELF_SUSPEND", 400);
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ suspended: true })
    .eq("id", parsed.data.profileId);
  if (error) return fail(error.message, "DB_ERROR", 400);

  return ok({ profileId: parsed.data.profileId, suspended: true });
}
