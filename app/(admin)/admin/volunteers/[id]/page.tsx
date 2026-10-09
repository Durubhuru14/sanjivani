import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarCheck2,
  FileText,
  Flag,
  HeartHandshake,
  Star,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { SuspendToggle } from "@/components/admin/AdminActionButtons";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Application, Profile, Rating, Volunteer, VolunteerReport } from "@/lib/types";

export const dynamic = "force-dynamic";

type TeamRow = {
  id: string;
  user_id: string;
  member_type: string;
  hours_logged: number;
  teams: { id: string; name: string; campaign_id: string; campaigns: { id: string; title: string; status: string; ngo: { profile_id: string; org_name: string } | { org_name: string }[] | null } };
};

/** Admin volunteer detail — the full oversight view before taking any account
 *  action: profile, hours, every team, application, rating, and report. */
export default async function AdminVolunteerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [volRes, teamsRes, appsRes, ratingsRes, reportsRes, hoursRes] = await Promise.all([
    supabase
      .from("volunteers")
      .select(
        "*, profile:profiles!volunteers_profile_id_fkey(id, name, location, avatar_url, suspended, created_at)"
      )
      .eq("profile_id", id)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select(
        "id, user_id, member_type, hours_logged, teams!inner(id, name, campaign_id, campaigns!inner(id, title, status, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name)))"
      )
      .eq("user_id", id),
    supabase
      .from("applications")
      .select(
        "*, campaign:campaign_id(id, title, status, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name))"
      )
      .eq("volunteer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ratings")
      .select("*, from_user:profiles!ratings_from_user_id_fkey(id, name), campaign:campaign_id(id, title)")
      .eq("to_user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("volunteer_reports")
      .select("*, reporter:reported_by(id, name), campaign:campaign_id(id, title)")
      .eq("volunteer_id", id)
      .order("created_at", { ascending: false }),
    supabase.rpc("volunteer_total_hours", { p_volunteer_id: id }),
  ]);

  const vol = volRes.data as unknown as (Volunteer & { profile?: Profile }) | null;
  if (!vol) notFound();

  const teams = (teamsRes.data ?? []) as unknown as TeamRow[];
  const apps = (appsRes.data ?? []) as unknown as Array<
    Application & { campaign?: { id: string; title: string; status: string; ngo?: { profile_id: string; org_name: string } | { org_name: string }[] | null } }
  >;
  const ratings = (ratingsRes.data ?? []) as unknown as Array<
    Rating & { from_user?: { id: string; name: string | null } }
  >;
  const reports = (reportsRes.data ?? []) as unknown as VolunteerReport[];
  const totalHours = Number(hoursRes.data ?? 0);

  const name = vol.profile?.name ?? "Volunteer";
  const orgOf = (ngo: TeamRow["teams"]["campaigns"]["ngo"] | undefined | null) =>
    Array.isArray(ngo) ? ngo[0]?.org_name : ngo?.org_name;

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/volunteers"
        backLabel="Back to volunteers"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <UserAvatar name={name} src={vol.profile?.avatar_url} className="h-10 w-10 text-base" />
            {name}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {vol.verification_status === "approved" ? (
              <StatusBadge status="approved" />
            ) : (
              <StatusBadge status={vol.verification_status} />
            )}
            {vol.profile?.suspended ? <StatusBadge status="suspended" /> : null}
            <span className="text-sm">
              Joined {formatDate(vol.profile?.created_at)}
              {vol.profile?.location ? ` · ${vol.profile.location}` : ""}
            </span>
          </span>
        }
        action={
          <SuspendToggle
            profileId={vol.profile_id}
            suspended={Boolean(vol.profile?.suspended)}
            name={name}
            size="default"
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total hours" value={`${totalHours} h`} icon={CalendarCheck2} hint="across all campaigns" />
        <StatCard
          label="Avg rating"
          value={Number(vol.avg_rating ?? 0) > 0 ? `${Number(vol.avg_rating).toFixed(1)} / 5` : "—"}
          icon={Star}
          hint={`${ratings.length} rating${ratings.length === 1 ? "" : "s"} received`}
        />
        <StatCard label="Campaigns" value={teams.length} icon={Users} hint="team memberships" />
        <StatCard label="Applications" value={apps.length} icon={FileText} hint="all-time" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" aria-hidden /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Skills</p>
              <p className="mt-1 text-sm">{(vol.skills ?? []).join(", ") || "No skills listed"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Interests</p>
              <p className="mt-1 text-sm">{(vol.interests ?? []).join(", ") || "No interests listed"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Availability</p>
              <p className="mt-1 text-sm">{vol.availability ?? "Not specified"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden /> Campaign teams
            </CardTitle>
            <CardDescription>Every team this volunteer has been on.</CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <EmptyState icon={Users} title="No team memberships" hint="They have not joined a campaign team yet." />
            ) : (
              <ul className="divide-y rounded-xl border">
                {teams.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
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

        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden /> Applications
            </CardTitle>
            <CardDescription>Every campaign they applied to.</CardDescription>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <EmptyState icon={FileText} title="No applications" />
            ) : (
              <ul className="divide-y rounded-xl border">
                {apps.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.campaign?.title ?? "Campaign unavailable"}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.campaign ? orgOf(a.campaign.ngo) ?? "Unknown NGO" : "—"} · applied{" "}
                        {formatDateTime(a.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" aria-hidden /> Ratings received
            </CardTitle>
            <CardDescription>What NGOs said about their work.</CardDescription>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <EmptyState icon={Star} title="No ratings yet" />
            ) : (
              <ul className="space-y-3">
                {ratings.map((r) => (
                  <li key={r.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{r.from_user?.name ?? "NGO"}</p>
                      <StarsDisplay score={Number(r.score)} size="sm" />
                    </div>
                    {r.comment ? (
                      <p className="mt-1.5 text-sm text-muted-foreground">“{r.comment}”</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.campaign?.title ?? "a campaign"} · {formatDate(r.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" aria-hidden /> Reports against this volunteer
          </CardTitle>
          <CardDescription>
            Filed by NGOs for misconduct — reviewed or dismissed from the reports queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No reports"
              hint="A clean record — no NGO has filed a report."
            />
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        Reported by {r.reporter?.name ?? "an NGO"}
                        {r.campaign ? ` · ${r.campaign.title}` : ""}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
