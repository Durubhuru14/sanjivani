import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { inviteRespondSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";
import type { createClient } from "@/lib/supabase/server";

/**
 * POST /api/campaigns/[id]/invites/[inviteId]/respond (spec §8).
 * Accept → invite becomes accepted + an accepted applications row is created.
 * Decline → invite becomes declined.
 *
 * Ordering is dictated by the live triggers (supabase/migrations/00004):
 * `validate_application` requires an ACCEPTED invite before an application
 * can exist (APPLICATION_REQUIRES_INVITE), and `guard_campaign_invite_update`
 * only allows pending → accepted/declined — an accepted invite can never be
 * rolled back. So the invite is flipped first and the application insert is
 * the only step that can still fail. If it does, the invite stays accepted:
 * the volunteer remains team-eligible through it (validate_team_member accepts
 * an accepted invite with no application row) and re-accepting below recreates
 * the missing application, so the state is always repairable, never stuck.
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

  // Re-accepting an already-accepted invite is an idempotent repair path: it
  // recreates the companion application if its insert failed earlier (e.g. the
  // inviting NGO was suspended mid-flight). Declining after accepting is
  // refused — the trigger would reject that transition too.
  if (invite.status === "accepted") {
    if (action !== "accept") {
      return fail("This invitation has already been answered.", "INVITE_ANSWERED", 409);
    }
    const repairError = await ensureAcceptedApplication(supabase, auth.profile.id, campaignId);
    if (repairError) return fail(repairError.message, repairError.code, 400);
    return ok({ inviteId, status: "accepted" });
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
    const insertError = await ensureAcceptedApplication(supabase, auth.profile.id, campaignId);
    // A failure here is surfaced honestly but leaves no dead end: the invite
    // is accepted (team eligibility holds) and re-accepting retries the insert.
    if (insertError) return fail(insertError.message, insertError.code, 400);
  }

  return ok({ inviteId, status: nextStatus });
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

/**
 * Make sure the volunteer has an active (pending/accepted) application for the
 * campaign; create an accepted one when they don't. Mirrors the live trigger's
 * duplicate rule (only pending/accepted applications block a re-insert), so a
 * previously rejected/withdrawn application does not block the invite accept.
 */
async function ensureAcceptedApplication(
  supabase: SupabaseLike,
  volunteerId: string,
  campaignId: string
): Promise<{ message: string; code: string } | null> {
  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("campaign_id", campaignId)
    .eq("volunteer_id", volunteerId)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();
  if (existing) return null; // already applied — the invite is accepted either way

  const { error } = await supabase.from("applications").insert({
    volunteer_id: volunteerId,
    campaign_id: campaignId,
    status: "accepted",
  });
  if (error) return friendlyDbError(error);
  return null;
}
