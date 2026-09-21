import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { volunteerReportSchema } from "@/lib/validation";
import { ok, fail, parseBody, friendlyDbError } from "@/lib/api";

/** POST /api/reports/volunteer — NGO reports a volunteer from a shared campaign (spec §8). */
export async function POST(req: NextRequest) {
  const auth = await requireRole("ngo");
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, volunteerReportSchema);
  if (!parsed.success) return parsed.response;

  const { error } = await auth.supabase.from("volunteer_reports").insert({
    volunteer_id: parsed.data.volunteer_id,
    reported_by: auth.profile.id,
    campaign_id: parsed.data.campaign_id,
    reason: parsed.data.reason,
  });
  if (error) {
    const friendly = friendlyDbError(error);
    return fail(
      friendly.code === "FORBIDDEN"
        ? "You can only report volunteers who served on one of your campaign teams."
        : friendly.message,
      friendly.code,
      friendly.code === "FORBIDDEN" ? 403 : 400
    );
  }

  return ok({ reported: true });
}
