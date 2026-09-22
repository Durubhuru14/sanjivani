"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  campaignSchema,
  hoursSchema,
  ngoProfileUpdateSchema,
  ratingSchema,
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

function toDb(values: CampaignFormValues) {
  const parsed = campaignSchema.safeParse({
    ...values,
    total_budget: values.total_budget === "" ? 0 : values.total_budget,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid campaign data" as string, data: null };
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
  const { supabase, userId } = await requireNgoClient();
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
  const { supabase } = await requireNgoClient();
  const { error, data } = toDb(values);
  if (error || !data) return { ok: false, error: error ?? "Invalid data" };

  const { error: dbError } = await supabase.from("campaigns").update(data).eq("id", id);
  if (dbError) return { ok: false, error: friendlyDbError(dbError).message };
  revalidatePath(`/ngo/campaigns/${id}`);
  revalidatePath("/ngo/campaigns");
  return { ok: true, id };
}

export async function setCampaignStatus(id: string, status: string) {
  const { supabase } = await requireNgoClient();
  const { error } = await supabase.from("campaigns").update({ status }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${id}`);
  revalidatePath("/ngo/campaigns");
  return { ok: true };
}

export async function deleteCampaign(id: string) {
  const { supabase } = await requireNgoClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath("/ngo/campaigns");
  redirect("/ngo/campaigns");
}

/* ================= applications ================= */

export async function decideApplication(applicationId: string, decision: "accepted" | "rejected") {
  const { supabase } = await requireNgoClient();
  const { error } = await supabase
    .from("applications")
    .update({ status: decision })
    .eq("id", applicationId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath("/ngo");
  return { ok: true };
}

/* ================= teams ================= */

export async function createTeam(campaignId: string, name: string) {
  const { supabase } = await requireNgoClient();
  if (!name.trim() || name.trim().length > 80) {
    return { ok: false, error: "Team name is required (max 80 characters)." };
  }
  const { error } = await supabase
    .from("teams")
    .insert({ campaign_id: campaignId, name: name.trim() });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function removeTeam(campaignId: string, teamId: string) {
  const { supabase } = await requireNgoClient();
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
  const { supabase } = await requireNgoClient();
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, member_type: memberType });
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function removeTeamMember(campaignId: string, memberId: string) {
  const { supabase } = await requireNgoClient();
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath(`/ngo/campaigns/${campaignId}`);
  return { ok: true };
}

export async function logHours(campaignId: string, memberId: string, hours: number) {
  const { supabase } = await requireNgoClient();
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

/* ================= ratings (NGO → volunteer) ================= */

export async function rateVolunteer(
  campaignId: string,
  volunteerId: string,
  score: number,
  comment: string
) {
  const { supabase, userId } = await requireNgoClient();
  const parsed = ratingSchema.safeParse({ score, comment });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase.from("ratings").insert({
    campaign_id: campaignId,
    from_user_id: userId,
    to_user_id: volunteerId,
    score: parsed.data.score,
    comment: parsed.data.comment || null,
  });
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
