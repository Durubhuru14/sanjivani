import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { campaignInviteSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/**
 * GET /api/campaigns/[id]/invites?q=… — volunteer search for the invite panel.
 * Returns non-suspended volunteers not already holding a pending/accepted invite.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id: campaignId } = await params;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();

  const supabase = auth.supabase;
  const { data: own } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("ngo_id", auth.profile.id)
    .limit(1)
    .maybeSingle();
  if (!own) return fail("Campaign not found or not yours.", "FORBIDDEN", 403);

  const { data: all } = await supabase
    .from("volunteers")
    .select("profile_id, verification_status, avg_rating, skills, profile:profile_id(name, location, avatar_url, suspended)");

  type VolRow = {
    profile_id: string;
    verification_status: string;
    avg_rating: number | null;
    skills: string[] | null;
    profile: { name: string | null; location: string | null; avatar_url: string | null; suspended: boolean | null } | null;
  };

  const { data: existing } = await supabase
    .from("campaign_invites")
    .select("volunteer_id, status")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "accepted"]);
  const excluded = new Set((existing ?? []).map((e) => e.volunteer_id as string));

  const needle = q.toLowerCase();
  const volunteers = ((all ?? []) as unknown as VolRow[])
    .filter(
      (v) =>
        v.profile &&
        v.profile.suspended !== true &&
        !excluded.has(v.profile_id) &&
        (needle === "" ||
          (v.profile.name ?? "").toLowerCase().includes(needle) ||
          (v.skills ?? []).some((s) => s.toLowerCase().includes(needle)))
    )
    .slice(0, 8)
    .map((v) => ({
      profile_id: v.profile_id,
      name: v.profile?.name ?? null,
      location: v.profile?.location ?? null,
      avatar_url: v.profile?.avatar_url ?? null,
      skills: v.skills,
      verification_status: v.verification_status,
      avg_rating: v.avg_rating,
    }));

  return ok({ volunteers });
}

/**
 * POST /api/campaigns/[id]/invites (spec §8).
 * For type = 'invite' campaigns only: invite a specific volunteer.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id: campaignId } = await params;

  const parsed = await parseBody(req, campaignInviteSchema);
  if (!parsed.success) return parsed.response;

  const supabase = auth.supabase;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, ngo_id, type")
    .eq("id", campaignId)
    .limit(1)
    .maybeSingle();
  if (!campaign || campaign.ngo_id !== auth.profile.id) {
    return fail("Campaign not found or not yours.", "FORBIDDEN", 403);
  }
  if (campaign.type !== "invite") {
    return fail("Volunteers can only be invited to invite-only campaigns.", "INVITE_ONLY", 400);
  }

  const { data, error } = await supabase
    .from("campaign_invites")
    .insert({
      campaign_id: campaignId,
      volunteer_id: parsed.data.volunteer_id,
      invited_by: auth.profile.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const friendly = friendlyDbError(error);
    return fail(
      friendly.code === "DUPLICATE" || friendly.code === "DUPLICATE_INVITE"
        ? "This volunteer already has a pending invite for this campaign."
        : friendly.message,
      friendly.code,
      friendly.code === "DUPLICATE" || friendly.code === "DUPLICATE_INVITE" ? 409 : 400
    );
  }

  return ok({ inviteId: data.id, status: "pending" });
}
