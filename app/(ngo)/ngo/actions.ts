"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  campaignSchema,
  campaignStatusSchema,
  hoursSchema,
  ngoProfileUpdateSchema,
} from "@/lib/validation";
import { friendlyDbError } from "@/lib/api";
import type { CampaignFormValues } from "@/components/campaigns/CampaignForm";
import { ROLE_HOME } from "@/lib/supabase/middleware";

async function requireNgoClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "ngo" || profile.suspended) {
    redirect(ROLE_HOME[profile?.role as string] ?? "/login");
  }
  return { supabase, userId: user.id };
}

/** Campaign/team/fund/rating writes additionally require an APPROVED NGO —
 * the same rule the RLS `campaigns_insert` policy enforces in live mode
 * (spec §6). Pending NGOs can still use the dashboard + profile. */
async function requireApprovedNgoClient() {
  const ctx = await requireNgoClient();
  const { data: ngo } = await ctx.supabase
    .from("ngos")
    .select("verification_status")
    .eq("profile_id", ctx.userId)
    .single();
  if (!ngo || ngo.verification_status !== "approved") {
    redirect("/ngo");
  }
  return ctx;
}

/** Legal campaign status transitions — mirrors the toolbar's NEXT_STATUS map
 * and the seed schema's forward-only lifecycle (spec §5). Edit-form status
 * choices are filtered through this, and updateCampaign enforces it again
 * server-side so a crafted request cannot resurrect a terminal campaign. */
const CAMPAIGN_TRANSITIONS: Record<string, string[]> = {
  upcoming: ["ongoing", "cancelled"],
  ongoing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function toDb(values: CampaignFormValues) {
  const parsed = campaignSchema.safeParse({
    ...values,
    total_budget: values.total_budget === "" ? 0 : values.total_budget,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid campaign data", data: null };
  }
  const d = parsed.data;
  return {
    error: null,
    data: {
      title: d.title.trim(),
      description: d.description || null,
      objectives: d.objectives || null,
      location: d.location || null,
      start_date: d.start_date || null,
      end_date: d.end_date || null,
      type: d.type,
      status: d.status,
      total_budget: Number(d.total_budget ?? 0),
      image_url: d.image_url || null,
    },
  };
}

/* ================= campaigns ================= */

export async function createCampaign(values: CampaignFormValues) {
  const { supabase, userId } = await requireApprovedNgoClient();
  const { error, data } = toDb(values);
  if (error || !data) return { ok: false, error: error ?? "Invalid data" };

  const { data: campaign, error: dbError } = await supabase
    .from("campaigns")
    .insert({ ...data, ngo_id: userId })
    .select("id")
    .single();
  if (dbError) return { ok: false, error: friendlyDbError(dbError).message };
  revalidatePath("/ngo");
  revalidatePath("/ngo/campaigns");
  return { ok: true, id: campaign.id as string };
}

export async function updateCampaign(id: string, values: CampaignFormValues) {
  const { supabase, userId } = await requireApprovedNgoClient();
  const { error, data } = toDb(values);
  if (error || !data) return { ok: false, error: error ?? "Invalid data" };

  // Ownership + status-transition check: the edit form only offers legal
  // targets, but the action itself must not trust the client (RLS also
  // enforces ownership, this keeps the guard server-side and explicit).
  const { data: current } = await supabase
    .from("campaigns")
    .select("id, ngo_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!current || current.ngo_id !== userId) {
    return { ok: false, error: "Campaign not found." };
  }
  const allowed = new Set([current.status, ...(CAMPAIGN_TRANSITIONS[current.status] ?? [])]);
  if (!allowed.has(data.status)) {
    return {
      ok: false,
      error: `A ${current.status} campaign cannot move to ${data.status}.`,
    };
  }

  const { error: dbError } = await supabase.from("campaigns").update(data).eq("id", id);
  if (dbError) return { ok: false, error: friendlyDbError(dbError).message };
  revalidatePath(`/ngo/campaigns/${id}`);
  revalidatePath("/ngo/campaigns");
  return { ok: true, id };
}

export async function setCampaignStatus(id: string, status: string) {
  const { supabase } = await requireApprovedNgoClient();
  const parsed = campaignStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { ok: false, error: "That campaign status is not recognised." };
  }
  const { error } = await supabase
    .from("campaigns")
    .update({ status: parsed.data.status })
    .eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${id}`);
  revalidatePath("/ngo/campaigns");
  return { ok: true };
}

export async function deleteCampaign(id: string) {
  const { supabase } = await requireApprovedNgoClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath("/ngo/campaigns");
  redirect("/ngo/campaigns");
}

/* ================= applications ================= */

export async function decideApplication(applicationId: string, decision: "accepted" | "rejected") {
  const { supabase, userId } = await requireApprovedNgoClient();

  // Only pending applications on live campaigns can be decided — accepting
  // after completion/cancellation would create rating eligibility and team
  // entry for work that is already over (the live INSERT path is guarded by
  // trigger 00007; this closes the owner-side UPDATE path).
  const { data: app } = await supabase
    .from("applications")
    .select("id, status, campaign:campaign_id(id, ngo_id, status)")
    .eq("id", applicationId)
    .maybeSingle();
  const campaign = Array.isArray(app?.campaign) ? app?.campaign?.[0] : app?.campaign;
  if (!app || app.status !== "pending") {
    return { ok: false, error: "Only pending applications can be decided." };
  }
  if (!campaign || campaign.ngo_id !== userId) {
    return { ok: false, error: "Application not found." };
  }
  if (campaign.status !== "upcoming" && campaign.status !== "ongoing") {
    return {
      ok: false,
      error: `This campaign is ${campaign.status} — its applications can no longer be decided.`,
    };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: decision })
    .eq("id", applicationId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath("/ngo");
  return { ok: true };
}

/* ================= teams ================= */

/** Terminal campaigns (completed / cancelled) are locked for team changes:
 *  adding members after completion would grant rating eligibility for work
 *  that is over, and removing them would destroy their logged hours
 *  (hours live on the team_members row). Hours logging stays open on
 *  completed campaigns — that is exactly what completion unlocks. */
async function requireEditableCampaign(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, campaignId: string) {
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, ngo_id, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign || campaign.ngo_id !== userId) {
    return { error: "Campaign not found." as const };
  }
  if (campaign.status === "completed" || campaign.status === "cancelled") {
    return { error: `This campaign is ${campaign.status} — its teams can no longer be changed.` as const };
  }
  return { campaign };
}

export async function createTeam(campaignId: string, name: string) {
  const { supabase, userId } = await requireApprovedNgoClient();
  if (!name.trim() || name.trim().length > 80) {
    return { ok: false, error: "Team name is required (max 80 characters)." };
  }
  const guard = await requireEditableCampaign(supabase, userId, campaignId);
  if ("error" in guard && guard.error) return { ok: false, error: guard.error };
  const { error } = await supabase
    .from("teams")
    .insert({ campaign_id: campaignId, name: name.trim() });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function removeTeam(campaignId: string, teamId: string) {
  const { supabase, userId } = await requireApprovedNgoClient();
  const guard = await requireEditableCampaign(supabase, userId, campaignId);
  if ("error" in guard && guard.error) return { ok: false, error: guard.error };
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function addTeamMember(
  campaignId: string,
  teamId: string,
  userId: string,
  memberType: "staff" | "volunteer"
) {
  const { supabase, userId: owner } = await requireApprovedNgoClient();
  const guard = await requireEditableCampaign(supabase, owner, campaignId);
  if ("error" in guard && guard.error) return { ok: false, error: guard.error };
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, member_type: memberType });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function removeTeamMember(campaignId: string, memberId: string) {
  const { supabase, userId } = await requireApprovedNgoClient();
  const guard = await requireEditableCampaign(supabase, userId, campaignId);
  if ("error" in guard && guard.error) return { ok: false, error: guard.error };
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function logHours(campaignId: string, memberId: string, hours: number) {
  const { supabase } = await requireApprovedNgoClient();
  const parsed = hoursSchema.safeParse({ hours });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("team_members")
    .update({ hours_logged: parsed.data.hours })
    .eq("id", memberId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

/* ================= profile ================= */

export async function updateNgoProfile(values: {
  name: string;
  location: string;
  orgName: string;
  registrationNumber: string;
  logoUrl: string;
}) {
  const { supabase, userId } = await requireNgoClient();
  const parsed = ngoProfileUpdateSchema.safeParse({
    name: values.name,
    location: values.location,
    logo_url: values.logoUrl,
    org_name: values.orgName,
    registration_number: values.registrationNumber,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name, location: parsed.data.location || null })
    .eq("id", userId);
  if (profileError) return { ok: false, error: friendlyDbError(profileError).message };

  const { error: ngoError } = await supabase
    .from("ngos")
    .update({
      org_name: parsed.data.org_name,
      registration_number: parsed.data.registration_number,
      logo_url: parsed.data.logo_url || null,
    })
    .eq("profile_id", userId);
  if (ngoError) return { ok: false, error: friendlyDbError(ngoError).message };

  revalidatePath("/ngo/profile");
  revalidatePath("/ngo");
  return { ok: true };
}
