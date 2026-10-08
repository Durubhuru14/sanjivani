import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, parseBody } from "@/lib/api";

const schema = z.object({ email: z.email() });

/**
 * Checks whether an email has a pending NGO staff invite so the signup form
 * can offer the "I have a staff invite" path (spec §6 auto-detect by email match).
 */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, schema);
  if (!parsed.success) return parsed.response;

  const email = parsed.data.email.trim().toLowerCase();
  const admin = createAdminClient();

  const { data } = await admin
    .from("ngo_staff")
    .select("invited_name, ngo_id, ngos:ngo_id (org_name)")
    .ilike("invited_email", email)
    .is("profile_id", null)
    .eq("status", "invited")
    .limit(1)
    .maybeSingle();

  if (!data) return ok({ hasInvite: false });
  const row = data as { invited_name: string | null; ngos: { org_name: string } | { org_name: string }[] | null };
  const orgName = Array.isArray(row.ngos) ? row.ngos[0]?.org_name : row.ngos?.org_name;
  return ok({
    hasInvite: true,
    invitedName: row.invited_name,
    ngoName: orgName ?? "an NGO",
  });
}
