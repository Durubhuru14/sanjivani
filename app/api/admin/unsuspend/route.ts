import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/api";

const schema = z.object({ profileId: z.uuid() });

/** POST /api/admin/unsuspend — restores access with data intact (spec §8). */
export async function POST(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  const { data, error } = await auth.supabase
    .from("profiles")
    .update({ suspended: false })
    .eq("id", parsed.data.profileId)
    .select("id")
    .maybeSingle();
  if (error) return fail(error.message, "DB_ERROR", 400);
  // a valid-but-nonexistent id is a quiet no-op in PostgREST — surface it
  // instead of reporting success for something that changed nothing
  if (!data) return fail("That account no longer exists.", "NOT_FOUND", 404);

  return ok({ profileId: parsed.data.profileId, suspended: false });
}
