import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
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
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        backHref="/ngo"
        backLabel="Dashboard"
        title="Staff"
        subtitle="Your organisation's staff members. They are scoped to this NGO and can join campaign teams and chat rooms you add them to."
      />
      <StaffRoster staff={staff} />
    </div>
  );
}
