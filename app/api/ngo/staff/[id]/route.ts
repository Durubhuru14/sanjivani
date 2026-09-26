import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { ok, fail, friendlyDbError } from "@/lib/api";

/**
 * DELETE /api/ngo/staff/[id] (spec §8).
 * Removes the staff member AND their team/chat-room memberships across this
 * NGO's campaigns. Data elsewhere (hours history stays on campaign teams) is
 * preserved; only the assignment rows are removed.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const supabase = auth.supabase;

  const { data: staff } = await supabase
    .from("ngo_staff")
    .select("id, ngo_id, profile_id, status")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (!staff) return fail("Staff member not found.", "NOT_FOUND", 404);
  if (staff.ngo_id !== auth.profile.id) {
    return fail("This staff member belongs to another NGO.", "FORBIDDEN", 403);
  }

  try {
    if (staff.profile_id) {
      const userId = staff.profile_id;

      // all campaigns of this NGO
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("ngo_id", auth.profile.id);
      const campaignIds = (campaigns ?? []).map((c) => c.id as string);

      if (campaignIds.length > 0) {
        // teams on those campaigns
        const { data: teams } = await supabase
          .from("teams")
          .select("id")
          .in("campaign_id", campaignIds);
        const teamIds = (teams ?? []).map((t) => t.id as string);

        if (teamIds.length > 0) {
          await supabase
            .from("team_members")
            .delete()
            .in("team_id", teamIds)
            .eq("user_id", userId);
        }

        // chat rooms on those campaigns
        const { data: rooms } = await supabase
          .from("chat_rooms")
          .select("id")
          .in("campaign_id", campaignIds);
        const roomIds = (rooms ?? []).map((r) => r.id as string);

        if (roomIds.length > 0) {
          await supabase
            .from("chat_room_members")
            .delete()
            .in("room_id", roomIds)
            .eq("user_id", userId);
        }
      }
    }

    const { error } = await supabase.from("ngo_staff").delete().eq("id", id);
    if (error) {
      const friendly = friendlyDbError(error);
      return fail(friendly.message, friendly.code, 400);
    }
  } catch (err) {
    const friendly = friendlyDbError(err);
    return fail(friendly.message, friendly.code, 500);
  }

  return ok({ removed: id });
}
