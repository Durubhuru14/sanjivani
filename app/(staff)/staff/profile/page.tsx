import { createClient } from "@/lib/supabase/server";
import { Building2, CalendarCheck2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { formatDate } from "@/lib/format";
import { StaffProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: staffRow }] = await Promise.all([
    supabase.from("profiles").select("name, location, avatar_url").eq("id", user.id).single(),
    supabase
      .from("ngo_staff")
      .select("status, invited_name, created_at, ngo:ngo_id(org_name, verification_status)")
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  type StaffRow = {
    status?: string | null;
    created_at?: string | null;
    ngo?: Array<{ org_name: string | null; verification_status: string | null }> | null;
  };
  const row = (staffRow ?? null) as StaffRow | null;
  const ngo = Array.isArray(row?.ngo) ? row?.ngo?.[0] ?? null : null;
  const status = row?.status ?? null;
  const joinedAt = row?.created_at ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref="/staff"
        backLabel="Dashboard"
        title="My profile"
        subtitle="How your NGO and teammates see you across Sanjivani."
      />

      {/* Identity header */}
      <Card className="shadow-soft">
        <CardContent className="flex flex-wrap items-center gap-4">
          <UserAvatar
            name={profile?.name}
            src={profile?.avatar_url}
            className="h-14 w-14 text-base"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold">{profile?.name ?? "Staff member"}</h2>
              {status ? <StatusBadge status={status} /> : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              Staff · {profile?.location || "location not set"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
              <span className="truncate">{ngo?.org_name ?? "Your organisation"}</span>
              {joinedAt ? <span className="shrink-0">· joined {formatDate(joinedAt)}</span> : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Only you can edit these.</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffProfileForm
            initial={{
              name: profile?.name ?? "",
              location: profile?.location ?? "",
              avatarUrl: profile?.avatar_url ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-primary" aria-hidden /> Your workspace
          </CardTitle>
          <CardDescription>Everything staff accounts can do on Sanjivani.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <li className="h-full rounded-lg border bg-tint/40 p-3">
              <p className="font-semibold">Chat rooms</p>
              <p className="mt-0.5 text-muted-foreground">
                Coordinate with volunteers in the rooms your NGO adds you to.
              </p>
            </li>
            <li className="h-full rounded-lg border bg-tint/40 p-3">
              <p className="font-semibold">Campaign teams</p>
              <p className="mt-0.5 text-muted-foreground">
                NGOs add staff to teams to run day-to-day campaign work.
              </p>
            </li>
            <li className="h-full rounded-lg border bg-tint/40 p-3">
              <p className="font-semibold">Profile &amp; photo</p>
              <p className="mt-0.5 text-muted-foreground">
                Teammates see your name and photo in every room.
              </p>
            </li>
            <li className="h-full rounded-lg border bg-tint/40 p-3">
              <p className="font-semibold">Verified organisation</p>
              <p className="mt-0.5 text-muted-foreground">
                {ngo?.verification_status === "approved"
                  ? "Your NGO is verified — your affiliation carries that trust."
                  : "Your NGO is working through platform verification."}
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
