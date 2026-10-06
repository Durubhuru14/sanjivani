import { createClient } from "@/lib/supabase/server";
import { CalendarCheck2, Clock, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { StarsDisplay } from "@/components/StarsDisplay";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { VolunteerProfileForm } from "./profile-form";
import { formatDate } from "@/lib/format";
import type { Profile, Rating, Volunteer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VolunteerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const profile = profileRow as Profile | null;

  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("*")
    .eq("profile_id", user.id)
    .single();
  const vol = volunteer as Volunteer | null;

  const [historyRes, ratingsRes, hoursRes] = await Promise.all([
    supabase
      .from("team_members")
      .select(
        "id, hours_logged, member_type, teams!inner(name, campaigns!inner(id, title, status, end_date, ngo:ngos!campaigns_ngo_id_fkey(org_name)))"
      )
      .eq("user_id", user.id),
    supabase
      .from("ratings")
      .select("*, from_user:profiles!ratings_from_user_id_fkey(id, name), campaign:campaign_id(id, title)")
      .eq("to_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.rpc("volunteer_total_hours", { p_volunteer_id: user.id }),
  ]);

  type HistoryRow = {
    id: string;
    hours_logged: number;
    member_type: string;
    teams: {
      name: string;
      campaigns: {
        id: string;
        title: string;
        status: string;
        end_date: string | null;
        ngo?: { org_name: string };
      };
    };
  };
  const history = (historyRes.data ?? []) as unknown as HistoryRow[];
  history.sort((a, b) =>
    (b.teams.campaigns.end_date ?? "").localeCompare(a.teams.campaigns.end_date ?? "")
  );
  const ratings = (ratingsRes.data ?? []) as unknown as Rating[];
  const totalHours = Number((hoursRes.data as number) ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <UserAvatar name={profile?.name} src={profile?.avatar_url} className="h-16 w-16 rounded-lg text-lg" rounded="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">My profile & history</h1>
            {vol?.verification_status === "approved" ? (
              <VerifiedBadge verified />
            ) : vol?.verification_status === "pending" ? (
              <StatusBadge status="pending" />
            ) : (
              <StatusBadge status="rejected" />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.name} · {profile?.location || "location not set"}
          </p>
        </div>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground">
        This is the portable record you carry across NGOs — campaigns, hours, and ratings.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Campaigns joined" value={history.length} icon={CalendarCheck2} />
        <StatCard label="Hours contributed" value={totalHours} icon={Clock} />
        <StatCard
          label="Average rating"
          value={Number(vol?.avg_rating ?? 0) > 0 ? Number(vol?.avg_rating).toFixed(2) : "New"}
          icon={Star}
        />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>Keep this current — NGOs browse it while shortlisting.</CardDescription>
        </CardHeader>
        <CardContent>
          <VolunteerProfileForm
            initial={{
              name: profile?.name ?? "",
              location: profile?.location ?? "",
              skills: (vol?.skills ?? []).join(", "),
              interests: (vol?.interests ?? []).join(", "),
              availability: vol?.availability ?? "",
              avatarUrl: profile?.avatar_url ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Campaign history</CardTitle>
          <CardDescription>
            Automatically built from your team memberships and logged hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={CalendarCheck2}
              title="No history yet"
              hint="Join your first campaign to start building your verified record."
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{h.teams.campaigns.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {h.teams.campaigns.ngo?.org_name ?? "NGO"} · {h.member_type} ·{" "}
                      {h.teams.name}
                      {h.teams.campaigns.end_date
                        ? ` · ended ${formatDate(h.teams.campaigns.end_date)}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {Number(h.hours_logged)} h
                  </span>
                  <StatusBadge status={h.teams.campaigns.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Ratings received</CardTitle>
          <CardDescription>
            {Number(vol?.avg_rating ?? 0) > 0 ? (
              <span className="flex items-center gap-2">
                <StarsDisplay score={Number(vol?.avg_rating)} /> average
              </span>
            ) : (
              "From NGOs on completed campaigns."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ratings yet — they appear after campaigns you complete.
            </p>
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.from_user?.name ?? "NGO"}</p>
                    <StarsDisplay score={Number(r.score)} size="sm" />
                  </div>
                  {r.campaign ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {r.campaign.title}
                    </p>
                  ) : null}
                  {r.comment ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">“{r.comment}”</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
