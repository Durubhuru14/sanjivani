import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Building2, CalendarCheck2, MessagesSquare, UserMinus } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // staff is scoped to the inviting NGO (spec §1)
  const { data: staffRow } = await supabase
    .from("ngo_staff")
    .select("*, ngo:ngos!ngo_staff_ngo_id_fkey(profile_id, org_name, verification_status)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  const staff = staffRow as
    | {
        id: string;
        ngo_id: string;
        status: string;
        ngo?: { profile_id: string; org_name: string; verification_status: string };
      }
    | null;
  // A removed staff member (NGO deleted the link — spec-sanctioned) keeps
  // role = staff with no ngo_staff row. That is a supported state, not a 404:
  // show a friendly card instead of a dead-end error page. The link comes
  // back if another NGO invites the same email and they claim it.
  if (!staff) {
    return (
      <div className="space-y-8">
        <PageHeader
          className="animate-fade-up"
          title="Staff dashboard"
          subtitle="Everything your NGO assigned you to — campaigns, teams, and rooms."
        />
        <Card className="animate-fade-up stagger-1 shadow-soft">
          <CardContent className="py-2">
            <EmptyState
              icon={UserMinus}
              title="You are not linked to an NGO right now"
              hint="Your NGO removed you from their staff list. Your account and history are kept — if another NGO invites your email, accepting it links you to them."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [teamRes, roomsRes] = await Promise.all([
    supabase
      .from("team_members")
      .select(
        "id, hours_logged, teams!inner(id, name, campaign_id, campaigns!inner(id, title, status, start_date, end_date, ngo:ngos!campaigns_ngo_id_fkey(org_name)))"
      )
      .eq("user_id", user.id),
    supabase
      .from("chat_room_members")
      .select("room_id, rooms!inner(id, name, campaign_id, campaigns!inner(title))")
      .eq("user_id", user.id),
  ]);

  type TeamRow = {
    id: string;
    hours_logged: number;
    teams: {
      id: string;
      name: string;
      campaign_id: string;
      campaigns: {
        id: string;
        title: string;
        status: string;
        start_date: string | null;
        end_date: string | null;
        ngo?: { org_name: string };
      };
    };
  };
  const teams = (teamRes.data ?? []) as unknown as TeamRow[];
  const roomRows = (roomsRes.data ?? []) as unknown as Array<{
    room_id: string;
    rooms: { id: string; name: string; campaign_id: string; campaigns: { title: string } };
  }>;

  const active = teams.filter(
    (t) => t.teams.campaigns.status === "ongoing" || t.teams.campaigns.status === "upcoming"
  );

  return (
    <div className="space-y-8">
      <PageHeader
        className="animate-fade-up"
        title="Staff dashboard"
        subtitle="Everything your NGO assigned you to — campaigns, teams, and rooms."
      />

      <Card className="animate-fade-up stagger-1 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden /> Your organisation
          </CardTitle>
          <CardAction>
            <StatusBadge status={staff.status} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">{staff.ngo?.org_name ?? "Your NGO"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You see only this NGO's campaigns and chats.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="h-full shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck2 className="h-5 w-5 text-primary" aria-hidden /> My campaign teams
            </CardTitle>
            <CardDescription>
              {active.length} active · {teams.length - active.length} finished
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <EmptyState
                icon={CalendarCheck2}
                title="Not assigned to a team yet"
                hint="Your NGO adds you to campaign teams from the campaign page."
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {teams.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{t.teams.campaigns.title}</p>
                      <p className="truncate text-sm text-muted-foreground tabular-nums">
                        {t.teams.name} · {formatDate(t.teams.campaigns.start_date)}
                        {t.teams.campaigns.status === "completed" &&
                        Number(t.hours_logged) > 0
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

        <Card className="h-full shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary" aria-hidden /> My chat rooms
            </CardTitle>
            <CardDescription>Rooms this NGO added you to.</CardDescription>
          </CardHeader>
          <CardContent>
            {roomRows.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="No chat rooms yet"
                hint="When your NGO adds you to a room, it shows up here."
              />
            ) : (
              <ul className="divide-y rounded-xl border">
                {roomRows.map((r) => (
                  <li key={r.room_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/staff/chat/${r.room_id}`}
                        className="truncate font-medium hover:text-primary hover:underline"
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
      </div>
    </div>
  );
}
