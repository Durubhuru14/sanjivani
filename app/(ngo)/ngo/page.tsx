import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CalendarCheck,
  ClipboardCheck,
  Clock,
  Inbox,
  Megaphone,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { formatDate } from "@/lib/format";
import type { Application, Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NgoDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ngo } = await supabase
    .from("ngos")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  /* Pending approval gate (spec §6) — profile editing stays available. */
  if (!ngo || ngo.verification_status !== "approved") {
    const status = ngo?.verification_status ?? "pending";
    return (
      <div className="mx-auto max-w-xl">
        <Card className="text-center shadow-soft">
          <CardHeader className="items-center">
            <span className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-lg border border-leaf/35 bg-tint text-leaf">
              <Clock className="h-7 w-7" aria-hidden />
            </span>
            <CardTitle className="text-2xl">
              {status === "rejected" ? "Verification was declined" : "Approval in progress"}
            </CardTitle>
            <CardDescription className="text-base">
              {status === "rejected"
                ? "An administrator could not verify your organisation. You can still update your profile and registration details, then reach out to the platform admin."
                : "An administrator is reviewing your organisation. This usually takes a day or two. You can complete your profile in the meantime."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              While you wait you cannot create campaigns. Nothing else is needed from you —
              you will get a notification as soon as the review is done.
            </p>
            <Button asChild>
              <Link href="/ngo/profile">Complete your profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [campaignsRes, pendingAppsRes, teamCountRes, fundsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*")
      .eq("ngo_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select(
        "id, status, created_at, volunteer:volunteer_id(id, name), campaign:campaign_id(id, title, status)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("teams")
      .select("id, campaign_id, team_members(id)", )
      .in(
        "campaign_id",
        (await supabase.from("campaigns").select("id").eq("ngo_id", user.id)).data?.map(
          (c) => c.id
        ) ?? ["00000000-0000-0000-0000-000000000000"]
      ),
    supabase
      .from("campaigns")
      .select("total_budget, remaining_budget")
      .eq("ngo_id", user.id)
      .neq("status", "cancelled"),
  ]);

  const campaigns = (campaignsRes.data ?? []) as Campaign[];
  const pendingApps = (pendingAppsRes.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    created_at: string;
    volunteer: { id: string; name: string | null } | null;
    campaign: { id: string; title: string; status: string } | null;
  }>;
  const teamSize = (teamCountRes.data ?? []).reduce(
    (sum, t) => sum + (t.team_members?.length ?? 0),
    0
  );
  const fundsRemaining = (fundsRes.data ?? []).reduce(
    (sum, c) => sum + Number(c.remaining_budget ?? 0),
    0
  );

  const active = campaigns.filter((c) => c.status === "ongoing" || c.status === "upcoming");

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {ngo.org_name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here is what is happening across your campaigns.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/ngo/campaigns/new">
            <Megaphone className="h-4 w-4" aria-hidden /> New campaign
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active campaigns" value={active.length} icon={CalendarCheck} />
        <StatCard label="Pending applications" value={pendingApps.length} icon={Inbox} />
        <StatCard label="People on teams" value={teamSize} icon={Users} />
        <StatCard label="Funds remaining" value={`₹${fundsRemaining.toLocaleString("en-IN")}`} icon={Wallet} />
      </div>

      {/* Pending applications */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
            Applications waiting for you
          </CardTitle>
          <CardDescription>Accept volunteers so you can add them to a team.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApps.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending applications"
              hint="When volunteers apply to your campaigns, they will appear here."
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {pendingApps.map((app) => (
                <li key={app.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{app.volunteer?.name ?? "Volunteer"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      applied to{" "}
                      <Link
                        href={`/ngo/campaigns/${app.campaign?.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {app.campaign?.title}
                      </Link>{" "}
                      · {formatDate(app.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={app.campaign?.status} />
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/ngo/campaigns/${app.campaign?.id}`}>Review</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Campaigns */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your campaigns</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/ngo/campaigns">View all</Link>
          </Button>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            hint="Create your first campaign — it only takes a minute."
            action={
              <Button asChild>
                <Link href="/ngo/campaigns/new">Create campaign</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.slice(0, 6).map((c) => (
              <CampaignCard key={c.id} campaign={c} href={`/ngo/campaigns/${c.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
