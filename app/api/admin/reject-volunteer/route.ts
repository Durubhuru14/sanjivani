import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/api";

const schema = z.object({ profileId: z.uuid() });

/** POST /api/admin/reject-volunteer (spec §8). */
export async function POST(req: NextRequest) {
  const auth = await requireRole("admin");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  const { error } = await auth.supabase
    .from("volunteers")
    .update({ verification_status: "rejected" })
    .eq("profile_id", parsed.data.profileId);
  if (error) return fail(error.message, "DB_ERROR", 400);

  return ok({ profileId: parsed.data.profileId, status: "rejected" });
}
