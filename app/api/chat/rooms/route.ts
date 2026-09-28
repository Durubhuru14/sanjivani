import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { chatRoomSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/**
 * POST /api/chat/rooms (spec §8).
 * Creates a chat room + initial members (must already be on the campaign team —
 * enforced by the chat_room_members trigger).
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, chatRoomSchema);
  if (!parsed.success) return parsed.response;
  const { name, campaign_id, member_ids } = parsed.data;

  const supabase = auth.supabase;

  // owner check via RLS-visible row
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, ngo_id")
    .eq("id", campaign_id)
    .limit(1)
    .maybeSingle();
  if (!campaign || campaign.ngo_id !== auth.profile.id) {
    return fail("Campaign not found or not yours.", "FORBIDDEN", 403);
  }

  try {
    const { data: room, error: roomError } = await supabase
      .from("chat_rooms")
      .insert({ campaign_id, name: name.trim(), created_by: auth.profile.id })
      .select("id")
      .single();
    if (roomError) throw roomError;

    const memberRows = [
      ...new Set(member_ids.filter((uid) => uid !== auth.profile.id)),
    ].map((userId) => ({ room_id: room.id, user_id: userId }));

    // include the NGO owner as a room member too
    memberRows.push({ room_id: room.id, user_id: auth.profile.id });

    const { error: membersError } = await supabase
      .from("chat_room_members")
      .insert(memberRows);
    if (membersError) {
      // roll back the room so the ledger stays consistent
      await supabase.from("chat_rooms").delete().eq("id", room.id);
      throw membersError;
    }

    return ok({ roomId: room.id, name: name.trim() });
  } catch (err) {
    const friendly = friendlyDbError(err);
    return fail(
      friendly.code === "ROOM_MEMBER_MUST_BE_ON_TEAM"
        ? "Chat room members must already be on the campaign team."
        : friendly.message,
      friendly.code,
      400
    );
  }
}
