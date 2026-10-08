import { NextRequest } from "next/server";
import { notifySchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, parseBody } from "@/lib/api";

/**
 * POST /api/notify (spec §8) — internal, server-side only.
 * Callers must present the service role key as a Bearer token.
 * (Most notifications are produced by database triggers; this route exists
 * for server-side code that cannot use the service client directly.)
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expected || token !== expected) {
    return fail("Internal endpoint — invalid service credentials.", "FORBIDDEN", 403);
  }

  const parsed = await parseBody(req, notifySchema);
  if (!parsed.success) return parsed.response;

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .insert({
      user_id: parsed.data.user_id,
      type: parsed.data.type,
      message: parsed.data.message,
    });
  if (error) return fail(error.message, "DB_ERROR", 400);

  return ok({ delivered: true });
}
