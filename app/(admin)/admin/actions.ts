"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation";
import { friendlyDbError } from "@/lib/api";
import { ROLE_HOME } from "@/lib/supabase/middleware";

async function requireAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login?error=incomplete");
  if (profile.role !== "admin" || profile.suspended) {
    redirect(ROLE_HOME[profile.role as string] ?? "/login");
  }
  return { supabase, userId: user.id };
}

/** Admin updates their own profile (name/location/avatar). */
export async function updateAdminProfile(values: {
  name: string;
  location: string;
  avatarUrl: string;
}) {
  const { supabase, userId } = await requireAdminClient();
  const parsed = profileUpdateSchema.safeParse({
    name: values.name,
    location: values.location,
    avatar_url: values.avatarUrl,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };

  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      location: parsed.data.location || null,
      avatar_url: parsed.data.avatar_url || null,
    })
    .eq("id", userId);
  if (error) return { ok: false, error: friendlyDbError(error).message };

  revalidatePath("/admin/profile");
  revalidatePath("/admin");
  return { ok: true };
}
