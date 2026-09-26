import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { staffInviteSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/** POST /api/ngo/staff/invite — create a `ngo_staff` invite (spec §8). */
export async function POST(req: NextRequest) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, staffInviteSchema);
  if (!parsed.success) return parsed.response;
  const { invited_email, invited_name } = parsed.data;

  // friendlier duplicate check before the unique index rejects it
  const { data: existing } = await auth.supabase
    .from("ngo_staff")
    .select("id, status")
    .eq("ngo_id", auth.profile.id)
    .ilike("invited_email", invited_email.trim())
    .limit(1);
  if (existing && existing.length > 0 && existing[0].status === "active") {
    return fail("This email is already an active staff member.", "ALREADY_ACTIVE", 409);
  }

  const { data, error } = await auth.supabase
    .from("ngo_staff")
    .insert({
      ngo_id: auth.profile.id,
      invited_email: invited_email.trim(),
      invited_name: invited_name.trim(),
      status: "invited",
    })
    .select("id")
    .single();

  if (error) {
    const friendly = friendlyDbError(error);
    return fail(friendly.message, friendly.code, 400);
  }

  return ok({ staffId: data.id, status: "invited" });
}
