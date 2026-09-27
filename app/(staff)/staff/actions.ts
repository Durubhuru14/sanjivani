"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation";
import { friendlyDbError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/supabase/middleware";

async function requireStaffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "staff" || profile.suspended) {
    redirect(ROLE_HOME[profile?.role as string] ?? "/login");
  }
  return { supabase, userId: user.id };
}

export async function updateStaffProfile(values: {
  name: string;
  location: string;
  avatarUrl: string;
}) {
  const { supabase, userId } = await requireStaffClient();
  const parsed = profileUpdateSchema.safeParse({
    name: values.name,
    location: values.location,
    avatar_url: values.avatarUrl,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      location: parsed.data.location || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: friendlyDbError(error).message };
  revalidatePath("/staff/profile");
  return { ok: true };
}
