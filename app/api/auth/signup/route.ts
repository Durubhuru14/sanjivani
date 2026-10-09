import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signUpSchema } from "@/lib/validation";
import { ok, fail, parseBody } from "@/lib/api";
import { ROLE_HOME } from "@/lib/supabase/middleware";

/**
 * Role-aware signup (spec §6).
 * 1. Supabase Auth signUp (email confirmation disabled → session immediately).
 * 2. Service-role inserts the profile row + role row (ngo/volunteer).
 * 3. Staff invites are claimed automatically when the email matches.
 */
export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, signUpSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const supabase = await createClient();

  const admin = createAdminClient();

  // Staff invites are checked BEFORE the auth user is created: failing late
  // (the old order) left an orphan auth account that blocks every retry with
  // "User already registered". The lookup is read-only, so ordering it first
  // has no side effects.
  let staffInvite: { id: string; ngo_id: string } | null = null;
  if (input.role === "staff") {
    // Claim a pending invite matching this email (no public staff signup otherwise).
    const email = input.email.trim().toLowerCase();
    // oldest pending invite wins, so a multi-invite email claims deterministically
    const { data: invite } = await admin
      .from("ngo_staff")
      .select("id, ngo_id")
      .ilike("invited_email", email)
      .is("profile_id", null)
      .eq("status", "invited")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!invite) {
      return fail(
        "No pending staff invite found for this email. Ask your NGO to invite you first, or sign up as an NGO or volunteer.",
        "NO_STAFF_INVITE",
        400
      );
    }
    staffInvite = invite;
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error || !data.user) {
    const message =
      error?.message === "User already registered"
        ? "An account with this email already exists. Try logging in instead."
        : error?.message ?? "Signup failed.";
    return fail(message, "AUTH_ERROR", 400);
  }
  const userId = data.user.id;

  try {
    if (input.role === "staff") {
      await admin.from("profiles").insert({
        id: userId,
        role: "staff",
        name: input.name,
        location: input.location || null,
      });
      // The profile row must exist before the invite can link to it, so the
      // link is the last write — surface its failure instead of leaving a
      // staff account with no NGO link (a dead-end dashboard). The invite
      // stays unclaimed, so a retry of the signup succeeds cleanly.
      const { error: linkError } = await admin
        .from("ngo_staff")
        .update({ profile_id: userId, status: "active" })
        .eq("id", staffInvite!.id);
      if (linkError) throw linkError;
    } else if (input.role === "ngo") {
      await admin.from("profiles").insert({
        id: userId,
        role: "ngo",
        name: input.name,
        location: input.location || null,
      });
      await admin.from("ngos").insert({
        profile_id: userId,
        org_name: input.orgName!.trim(),
        registration_number: input.registrationNumber!.trim(),
        verification_status: "pending",
      });
    } else {
      const split = (s: string | undefined) =>
        (s ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 10);
      await admin.from("profiles").insert({
        id: userId,
        role: "volunteer",
        name: input.name,
        location: input.location || null,
      });
      await admin.from("volunteers").insert({
        profile_id: userId,
        skills: split(input.skills),
        interests: split(input.interests),
        availability: input.availability || null,
        verification_status: "pending",
      });
    }
  } catch (err) {
    console.error("[signup] profile bootstrap failed:", err);
    return fail(
      "Your account was created but setup did not finish. Please log in and try again, or contact support.",
      "BOOTSTRAP_FAILED",
      500
    );
  }

  return ok({ role: input.role, redirect: ROLE_HOME[input.role] });
}
