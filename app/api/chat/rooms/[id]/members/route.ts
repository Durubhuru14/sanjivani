import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { roomMembersSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/**
 * POST /api/chat/rooms/[id]/members (spec §8) — add/remove members.
 * New members must already be on the campaign team (trigger-enforced).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id: roomId } = await params;

  const parsed = await parseBody(req, roomMembersSchema);
  if (!parsed.success) return parsed.response;
  const { add, remove } = parsed.data;

  const supabase = auth.supabase;

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, campaign_id, campaigns!inner(ngo_id)")
    .eq("id", roomId)
    .limit(1)
    .maybeSingle();
  if (!room) {
    return fail("Room not found or not yours.", "FORBIDDEN", 403);
  }

  try {
    if (remove.length > 0) {
      const { error } = await supabase
        .from("chat_room_members")
        .delete()
        .eq("room_id", roomId)
        .in("user_id", remove);
      if (error) throw error;
    }
    if (add.length > 0) {
      const rows = [...new Set(add)].map((userId) => ({
        room_id: roomId,
        user_id: userId,
      }));
      const { error } = await supabase.from("chat_room_members").insert(rows);
      if (error) throw error;
    }
  } catch (err) {
    const friendly = friendlyDbError(err);
    return fail(
      friendly.code === "ROOM_MEMBER_MUST_BE_ON_TEAM"
        ? "Everyone you add must already be on the campaign team."
        : friendly.message,
      friendly.code,
      400
    );
  }

  return ok({ roomId, added: add.length, removed: remove.length });
}
