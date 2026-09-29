import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { roomRenameSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

const idSchema = z.object({ id: z.uuid() });

/** PATCH /api/chat/rooms/[id] — rename a room (NGO owner only, spec §9). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const idParsed = idSchema.safeParse({ id });
  if (!idParsed.success) return fail("Invalid room id.", "VALIDATION_ERROR", 422);

  const parsed = await parseBody(req, roomRenameSchema);
  if (!parsed.success) return parsed.response;

  const { error } = await auth.supabase
    .from("chat_rooms")
    .update({ name: parsed.data.name.trim() })
    .eq("id", id);
  if (error) {
    const friendly = friendlyDbError(error);
    return fail(friendly.message, friendly.code, 400);
  }
  return ok({ roomId: id, name: parsed.data.name.trim() });
}

/** DELETE /api/chat/rooms/[id] — remove a room with its members and messages. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const { error } = await auth.supabase.from("chat_rooms").delete().eq("id", id);
  if (error) {
    const friendly = friendlyDbError(error);
    return fail(
      friendly.code === "FORBIDDEN" ? "You can only delete rooms on your own campaigns." : friendly.message,
      friendly.code,
      friendly.code === "FORBIDDEN" ? 403 : 400
    );
  }
  return ok({ removed: id });
}
