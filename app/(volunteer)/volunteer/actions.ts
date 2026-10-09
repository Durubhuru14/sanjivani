"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  volunteerProfileUpdateSchema,
} from "@/lib/validation";
import { friendlyDbError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/supabase/middleware";

async function requireUserClient(volunteerOnly = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login?error=incomplete");
  // suspension blocks every write (same rule as the RLS not_suspended() policies)
  if (profile.suspended) redirect("/suspended");
  // volunteer-only writes (applications, volunteer profile) mirror the live
  // RLS policies — an NGO/staff/admin session crafting an action call is sent
  // home instead of writing through the volunteer surface. claimStaffInvite
  // deliberately stays role-agnostic: the invite claim page is cross-role.
  if (volunteerOnly && profile.role !== "volunteer") {
    redirect(ROLE_HOME[profile.role] ?? "/login");
  }
  return { supabase, userId: user.id, profile };
}

/** Volunteer applies to a public campaign (spec §5 browse/apply). */
export async function applyToCampaign(campaignId: string) {
  const { supabase, userId } = await requireUserClient(true);
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
  const { supabase, userId } = await requireUserClient(true);
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
    return { ok: false, error: "No pending staff invite found for your email." };
  }

  // Link the invite first, then flip the role: the link alone is inert (the
  // staff surface requires role = staff), and if the role flip fails the link
  // is reverted so the invite stays claimable. The reverse order could strand
  // a staff account with no NGO link (a dead-end dashboard).
  const { error: inviteError } = await admin
    .from("ngo_staff")
    .update({ profile_id: userId, status: "active", invited_name: me?.name ?? undefined })
    .eq("id", invite.id);
  if (inviteError) return { ok: false, error: friendlyDbError(inviteError).message };

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "staff" })
    .eq("id", userId);
  if (roleError) {
    await admin
      .from("ngo_staff")
      .update({ profile_id: null, status: "invited" })
      .eq("id", invite.id);
    return { ok: false, error: friendlyDbError(roleError).message };
  }

  return { ok: true, redirect: ROLE_HOME.staff };
}
