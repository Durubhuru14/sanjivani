"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  volunteerProfileUpdateSchema,
  ratingSchema,
} from "@/lib/validation";
import { friendlyDbError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/supabase/middleware";

async function requireUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login?error=incomplete");
  // suspension blocks every write (same rule as the RLS not_suspended() policies)
  if (profile.suspended) redirect("/suspended");
  return { supabase, userId: user.id, profile };
}

/** Volunteer applies to a public campaign (spec §5 browse/apply). */
export async function applyToCampaign(campaignId: string) {
  const { supabase, userId } = await requireUserClient();
  const { error } = await supabase
    .from("applications")
    .insert({ volunteer_id: userId, campaign_id: campaignId, status: "pending" });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/volunteer/campaigns/${campaignId}`);
  revalidatePath("/volunteer");
  return { ok: true };
}

/** Volunteer updates their profile (skills/interests/availability). */
export async function updateVolunteerProfile(values: {
  name: string;
  location: string;
  skills: string[];
  interests: string[];
  availability: string;
  avatarUrl: string;
}) {
  const { supabase, userId } = await requireUserClient();
  const parsed = volunteerProfileUpdateSchema.safeParse({
    name: values.name,
    location: values.location,
    avatar_url: values.avatarUrl,
    skills: values.skills,
    interests: values.interests,
    availability: values.availability,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error: pErr } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      location: parsed.data.location || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq("id", userId);
  if (pErr) return { ok: false, error: friendlyDbError(pErr).message };

  const { error: vErr } = await supabase
    .from("volunteers")
    .update({
      skills: parsed.data.skills,
      interests: parsed.data.interests,
      availability: parsed.data.availability || null,
    })
    .eq("profile_id", userId);
  if (vErr) return { ok: false, error: friendlyDbError(vErr).message };

  revalidatePath("/volunteer/profile");
  revalidatePath("/volunteer");
  return { ok: true };
}

/** Volunteer rates the NGO after campaign completion (bidirectional ratings). */
export async function rateNgo(campaignId: string, ngoId: string, score: number, comment: string) {
  const { supabase, userId } = await requireUserClient();
  const parsed = ratingSchema.safeParse({ score, comment });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase.from("ratings").insert({
    campaign_id: campaignId,
    from_user_id: userId,
    to_user_id: ngoId,
    score: parsed.data.score,
    comment: parsed.data.comment || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/volunteer/campaigns/${campaignId}`);
  revalidatePath("/volunteer");
  return { ok: true };
}

/** Staff (or invited user) claims their staff invite (spec §6 accept-invite). */
export async function claimStaffInvite() {
  const { supabase, userId, profile } = await requireUserClient();
  if (profile.role === "staff") return { ok: true, redirect: ROLE_HOME.staff };

  // service role needed: ngo_staff rows are not writable by the invitee
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data: me } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", userId)
    .single();

  const admin = createAdminClient();
  const { data: { user: authUser } } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.email?.toLowerCase();
  if (!email) return { ok: false, error: "Could not read your account email." };

  const { data: invite } = await admin
    .from("ngo_staff")
    .select("id, ngo_id")
    .ilike("invited_email", email)
    .is("profile_id", null)
    .eq("status", "invited")
    .limit(1)
    .maybeSingle();
  if (!invite) {
    return { ok: false, error: "No pending staff invite found for your email." };
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "staff" })
    .eq("id", userId);
  if (roleError) return { ok: false, error: friendlyDbError(roleError).message };

  const { error: inviteError } = await admin
    .from("ngo_staff")
    .update({ profile_id: userId, status: "active", invited_name: me?.name ?? undefined })
    .eq("id", invite.id);
  if (inviteError) return { ok: false, error: friendlyDbError(inviteError).message };

  return { ok: true, redirect: ROLE_HOME.staff };
}
