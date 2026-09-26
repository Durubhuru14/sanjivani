import { createClient } from "@/lib/supabase/server";
import { StaffRoster } from "@/components/staff/StaffRoster";
import type { NgoStaff } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NgoStaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("ngo_staff")
    .select(
      "*, profile:profiles!ngo_staff_profile_id_fkey(id, name, avatar_url, role)"
    )
    .eq("ngo_id", user.id)
    .order("created_at", { ascending: false });

  const staff = (data ?? []) as unknown as NgoStaff[];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
        <p className="mt-1 text-muted-foreground">
          Your organisation's staff members. They are scoped to this NGO and can join campaign
          teams and chat rooms you add them to.
        </p>
      </div>
      <StaffRoster staff={staff} />
    </div>
  );
}
