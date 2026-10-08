import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { inviteRespondSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/**
 * POST /api/campaigns/[id]/invites/[inviteId]/respond (spec §8).
 * Accept → invite becomes accepted + an accepted applications row is created.
 * Decline → invite becomes declined.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const auth = await requireRole("volunteer");
  if ("error" in auth) return auth.error;
  const { id: campaignId, inviteId } = await params;

  const parsed = await parseBody(req, inviteRespondSchema);
  if (!parsed.success) return parsed.response;
  const { action } = parsed.data;

  const supabase = auth.supabase;

  const { data: invite } = await supabase
    .from("campaign_invites")
    .select("id, volunteer_id, status")
    .eq("id", inviteId)
    .limit(1)
    .maybeSingle();
  if (!invite) return fail("Invitation not found.", "NOT_FOUND", 404);
  if (invite.volunteer_id !== auth.profile.id) {
    return fail("This invitation belongs to another volunteer.", "FORBIDDEN", 403);
  }
  if (invite.status !== "pending") {
    return fail("This invitation has already been answered.", "INVITE_ANSWERED", 409);
  }

  const nextStatus = action === "accept" ? "accepted" : "declined";

  const { error: updateError } = await supabase
    .from("campaign_invites")
    .update({ status: nextStatus })
    .eq("id", inviteId);
  if (updateError) {
    const friendly = friendlyDbError(updateError);
    return fail(friendly.message, friendly.code, 400);
  }

  if (action === "accept") {
    const { error: appError } = await supabase.from("applications").insert({
      volunteer_id: auth.profile.id,
      campaign_id: campaignId,
      status: "accepted",
    });
    if (appError) {
      const friendly = friendlyDbError(appError);
      const conflict = ["DUPLICATE", "DUPLICATE_APPLICATION", "23505"].includes(friendly.code);
      if (!conflict) {
        // roll the invite back to pending so the state stays consistent
        // (invite accepted but no team-eligible application) and the
        // volunteer can retry once the blocker is resolved
        await supabase
          .from("campaign_invites")
          .update({ status: "pending" })
          .eq("id", inviteId);
        return fail(friendly.message, friendly.code, 400);
      }
      // already applied before — treat as success, the invite is accepted either way
    }
  }

  return ok({ inviteId, status: nextStatus });
}
