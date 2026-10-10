import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, CalendarCheck2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { SuspendToggle } from "@/components/admin/AdminActionButtons";
import { formatDate } from "@/lib/format";
import type { NgoStaff, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

type TeamRow = {
  id: string;
  hours_logged: number;
  teams: { id: string; name: string; campaigns: { id: string; title: string; status: string; ngo: { org_name: string } | { org_name: string }[] | null } };
};

/** Admin staff detail — the NGO link, invite state, and campaign history of
 *  one staff member, so suspension decisions are informed ones. */
export default async function AdminStaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [staffRes, byProfileRes] = await Promise.all([
    supabase
      .from("ngo_staff")
      .select(
        "*, ngo:ngos!ngo_staff_ngo_id_fkey(profile_id, org_name, verification_status), profile:profiles!ngo_staff_profile_id_fkey(id, name, location, avatar_url, suspended, created_at, role)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ngo_staff")
      .select(
        "*, ngo:ngos!ngo_staff_ngo_id_fkey(profile_id, org_name, verification_status), profile:profiles!ngo_staff_profile_id_fkey(id, name, location, avatar_url, suspended, created_at, role)"
      )
      .eq("profile_id", id)
      .limit(1)
      .maybeSingle(),
  ]);

  // Resolve by row id first; fall back to a profile id (so links from
  // profile-scoped surfaces also land on the right staff member).
  const staff = (staffRes.data ?? byProfileRes.data) as unknown as
    | (NgoStaff & {
        ngo?: { profile_id: string; org_name: string; verification_status: string };
        profile?: Profile | null;
      })
    | null;
  if (!staff) notFound();

  const profileId = staff.profile?.id;
  const { data: teamsData } = profileId
    ? await supabase
        .from("team_members")
        .select(
          "id, hours_logged, teams!inner(id, name, campaign_id, campaigns!inner(id, title, status, ngo:ngos!campaigns_ngo_id_fkey(org_name)))"
        )
        .eq("user_id", profileId)
        .order("created_at", { ascending: true })
    : { data: null };
  const teams = (teamsData ?? []) as unknown as TeamRow[];
  const name = staff.profile?.name ?? staff.invited_name ?? staff.invited_email;
  const orgOf = (ngo: TeamRow["teams"]["campaigns"]["ngo"] | undefined | null) =>
    Array.isArray(ngo) ? ngo[0]?.org_name : ngo?.org_name;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/staff"
        backLabel="Back to staff"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <UserAvatar name={name} src={staff.profile?.avatar_url} className="h-10 w-10 text-base" />
            {name}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={staff.status} />
            {staff.profile?.suspended ? <StatusBadge status="suspended" /> : null}
            <span className="text-sm">
              Invited {formatDate(staff.created_at)}
              {staff.profile ? ` · joined ${formatDate(staff.profile.created_at)}` : ""}
            </span>
          </span>
        }
        action={
          profileId ? (
            <SuspendToggle
              profileId={profileId}
              suspended={Boolean(staff.profile?.suspended)}
              name={name}
              size="default"
            />
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Organisation"
          value={staff.ngo?.org_name ?? "—"}
          icon={Building2}
          hint={staff.ngo?.verification_status ? `NGO ${staff.ngo.verification_status}` : "no NGO link"}
        />
        <StatCard label="Campaign teams" value={teams.length} icon={Users} hint="team memberships" />
        <StatCard
          label="Hours logged"
          value={`${teams.reduce((s, t) => s + Number(t.hours_logged ?? 0), 0)} h`}
          icon={CalendarCheck2}
          hint="on completed campaigns"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden /> Organisation &amp; invite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">NGO</p>
              {staff.ngo ? (
                <Link
                  href={`/admin/ngos/${staff.ngo.profile_id}`}
                  className="mt-1 inline-block font-medium hover:text-primary hover:underline"
                >
                  {staff.ngo.org_name}
                </Link>
              ) : (
                <p className="mt-1 text-sm">Unknown NGO</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Invite email</p>
              <p className="mt-1 text-sm break-all">{staff.invited_email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Claim state</p>
              <p className="mt-1 text-sm">
                {staff.profile
                  ? `Claimed — linked to a staff account${staff.profile.location ? ` (${staff.profile.location})` : ""}.`
                  : "Not claimed yet — waiting for a signup with this email."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden /> Campaign teams
            </CardTitle>
            <CardDescription>Every team this staff member has been on.</CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team memberships"
                hint="Their NGO has not added them to a campaign team yet."
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {teams.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="row-body">
                      <p className="truncate font-medium">{t.teams.campaigns.title}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.teams.name} · {orgOf(t.teams.campaigns.ngo) ?? "Unknown NGO"} ·{" "}
                        {Number(t.hours_logged ?? 0)} h logged
                      </p>
                    </div>
                    <StatusBadge status={t.teams.campaigns.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
