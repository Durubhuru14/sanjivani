import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BadgeCheck,
  CalendarCheck2,
  Clock,
  FileText,
  Heart,
  Inbox,
  Megaphone,
  MessagesSquare,
  Send,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatMoney } from "@/lib/funds";
import { formatDate } from "@/lib/format";
import type {
  CampaignInvite,
  FundAllocation,
  Profile,
  Volunteer,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VolunteerDashboardPage() {
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

  const [appsRes, invitesRes, teamRes, roomsRes, hoursRes, fundsRes] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, created_at, campaign:campaign_id(id, title, status, type, ngo:ngos!campaigns_ngo_id_fkey(org_name))"
      )
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("campaign_invites")
      .select(
        "id, status, campaign:campaign_id(id, title, status, type, ngo:ngos!campaigns_ngo_id_fkey(org_name))"
      )
      .eq("volunteer_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("team_members")
      .select(
        "id, team_id, hours_logged, teams!inner(id, name, campaign_id, campaigns!inner(id, title, status, type, start_date, end_date, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, avg_rating)))"
      )
      .eq("user_id", user.id),
    supabase
      .from("chat_room_members")
      .select("room_id, rooms!inner(id, name, campaign_id, campaigns!inner(title))")
      .eq("user_id", user.id),
    supabase.rpc("volunteer_total_hours", { p_volunteer_id: user.id }),
    supabase
      .from("fund_allocations")
      .select("id, amount, status, campaign:campaign_id(title)")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const apps = (appsRes.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    created_at: string;
    campaign: { id: string; title: string; status: string; type: string; ngo?: { org_name: string } } | null;
  }>;
  const pendingInvites = (invitesRes.data ?? []) as unknown as CampaignInvite[];
  const teamRows = (teamRes.data ?? []) as unknown as Array<{
    id: string;
    team_id: string;
    hours_logged: number;
    teams: {
      id: string;
      name: string;
      campaign_id: string;
      campaigns: {
        id: string;
        title: string;
        status: string;
        type: string;
        start_date: string | null;
        end_date: string | null;
        ngo?: { profile_id: string; org_name: string; verification_status: string; avg_rating: number };
      };
    };
  }>;
  const roomRows = (roomsRes.data ?? []) as unknown as Array<{
    room_id: string;
    rooms: { id: string; name: string; campaign_id: string; campaigns: { title: string } };
  }>;
  const totalHours = Number((hoursRes.data as number) ?? 0);
  const myFunds = (fundsRes.data ?? []) as unknown as Array<{ id: string; amount: number; status: string; campaign: { title: string } | null }>;

  const activeCampaigns = teamRows.filter(
    (t) => t.teams.campaigns.status === "ongoing" || t.teams.campaigns.status === "upcoming"
  );
  const campaignsJoined = new Set(teamRows.map((t) => t.teams.campaign_id)).size;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hi {profile?.name?.split(" ")[0] ?? "there"}
            {vol?.verification_status === "approved" ? (
              <VerifiedBadge verified className="ml-3 align-middle" />
            ) : null}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Your campaigns, invitations, and community history in one place.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/volunteer/browse">
            <Megaphone className="h-4 w-4" aria-hidden /> Browse campaigns
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Campaigns joined" value={campaignsJoined} icon={CalendarCheck2} />
        <StatCard label="Hours contributed" value={totalHours} icon={Clock} hint="Logged by NGOs after completion" />
        <StatCard label="Average rating" value={Number(vol?.avg_rating ?? 0) > 0 ? Number(vol?.avg_rating).toFixed(2) : "New"} icon={BadgeCheck} />
        <StatCard label="Open invitations" value={pendingInvites.length} icon={Inbox} />
      </div>

      {pendingInvites.length > 0 ? (
        <Card className="border-primary/30 bg-primary/5 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Send className="h-5 w-5" aria-hidden /> You have {pendingInvites.length} campaign
              invitation{pendingInvites.length === 1 ? "" : "s"}
            </CardTitle>
            <CardDescription>
              Invite-only campaigns are only visible to people who are invited.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {pendingInvites.slice(0, 3).map((inv) => (
              <Button key={inv.id} asChild variant="outline" className="gap-2">
                <Link href="/volunteer/invites">
                  {inv.campaign?.title ?? "Campaign"} <StatusBadge status="pending" />
                </Link>
              </Button>
            ))}
            <Button asChild>
              <Link href="/volunteer/invites">Review invitations</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active campaigns */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>My campaigns</CardTitle>
            <CardDescription>Teams you are part of.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamRows.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Not on a team yet"
                hint="Apply to a campaign or accept an invitation — once the NGO accepts you, you are in."
                action={
                  <Button asChild>
                    <Link href="/volunteer/browse">Find a campaign</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {teamRows.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/volunteer/campaigns/${t.teams.campaign_id}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {t.teams.campaigns.title}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {t.teams.campaigns.ngo?.org_name ?? "NGO"} · {t.teams.name}
                        {t.teams.campaigns.status === "completed" && t.hours_logged > 0
                          ? ` · ${Number(t.hours_logged)} h logged`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={t.teams.campaigns.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Applications */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" aria-hidden /> My applications
            </CardTitle>
            <CardDescription>Status of every campaign you applied to.</CardDescription>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No applications yet"
                hint="Browse public campaigns and apply — NGOs usually reply within a few days."
                action={
                  <Button asChild variant="outline">
                    <Link href="/volunteer/browse">Browse campaigns</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {apps.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/volunteer/campaigns/${a.campaign?.id}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {a.campaign?.title ?? "Campaign"}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.campaign?.ngo?.org_name ?? "NGO"} · applied {formatDate(a.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Chat rooms */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary" aria-hidden /> My chat rooms
            </CardTitle>
            <CardDescription>Rooms your NGOs added you to.</CardDescription>
          </CardHeader>
          <CardContent>
            {roomRows.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="No chat rooms yet"
                hint="When an NGO adds you to a room, it appears here."
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {roomRows.map((r) => (
                  <li key={r.room_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/volunteer/chat/${r.room_id}`}
                        className="truncate font-semibold hover:text-primary hover:underline"
                      >
                        {r.rooms.name}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {r.rooms.campaigns.title}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* My fund allocations */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" aria-hidden /> Funds allocated to me
            </CardTitle>
            <CardDescription>Only you and the NGO can see these amounts.</CardDescription>
          </CardHeader>
          <CardContent>
            {myFunds.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No fund allocations yet"
                hint="Allocations for your work will appear here once the NGO records them."
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {myFunds.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{formatMoney(Number(f.amount))}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {f.campaign?.title ?? "Campaign"}
                      </p>
                    </div>
                    <StatusBadge status={f.status} />
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
