import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Building2, UserSquare2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { EmptyState } from "@/components/EmptyState";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AdminActionButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import { formatDate } from "@/lib/format";
import type { Campaign, Ngo, Profile, Rating } from "@/lib/types";

type DetailCampaign = Campaign & {
  teams?: Array<{ team_members: Array<{ id: string }> }>;
  applications?: Array<{ id: string }>;
};

const rs = (n: unknown) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN")}`;

export const dynamic = "force-dynamic";

export default async function AdminNgoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ngoRow } = await supabase
    .from("ngos")
    .select("*, profile:profiles!ngos_profile_id_fkey(id, name, location, suspended, created_at)")
    .eq("profile_id", id)
    .limit(1)
    .maybeSingle();
  const ngo = ngoRow as unknown as (Ngo & { profile?: Profile }) | null;
  if (!ngo) notFound();

  const [campaignsRes, ratingsRes, staffRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, teams(team_members(id)), applications(id)")
      .eq("ngo_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ratings")
      .select("*, from_user:profiles!ratings_from_user_id_fkey(id, name)")
      .eq("to_user_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ngo_staff")
      .select(
        "id, status, invited_name, invited_email, profile:profiles!ngo_staff_profile_id_fkey(id, name, avatar_url, suspended)"
      )
      .eq("ngo_id", id),
  ]);

  const campaigns = (campaignsRes.data ?? []) as unknown as DetailCampaign[];
  const ratings = (ratingsRes.data ?? []) as unknown as Rating[];
  const staff = (staffRes.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    invited_name: string | null;
    invited_email: string;
    profile?: { id: string; name: string | null; avatar_url: string | null; suspended: boolean } | null;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Admin dashboard
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={ngo.org_name}
            src={ngo.logo_url}
            className="h-14 w-14 rounded-lg text-base"
            rounded="lg"
          />
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={ngo.verification_status} />
              {ngo.profile?.suspended ? <StatusBadge status="cancelled" /> : null}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{ngo.org_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Registration {ngo.registration_number ?? "—"} · joined{" "}
              {formatDate(ngo.profile?.created_at)} · {ngo.profile?.location ?? "location not set"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminActionButton
            path="/api/admin/approve-ngo"
            profileId={id}
            label="Approve NGO"
            successTitle={`${ngo.org_name} approved.`}
          />
          <AdminActionButton
            path="/api/admin/reject-ngo"
            profileId={id}
            label="Reject"
            variant="ghost"
            successTitle={`${ngo.org_name} was rejected.`}
          />
          <SuspendToggle
            profileId={id}
            suspended={Boolean(ngo.profile?.suspended)}
            name={ngo.org_name}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Campaigns</p>
          <p className="mt-1 text-2xl font-bold">{campaigns.length}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Staff members</p>
          <p className="mt-1 text-2xl font-bold">{staff.length}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">Average rating</p>
          <div className="mt-2">
            <StarsDisplay score={Number(ngo.avg_rating)} />
          </div>
        </div>
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" aria-hidden /> Campaigns
          </CardTitle>
          <CardDescription>
            Enough to keep operations in check — team size, applications, and budget use per
            campaign. Ledgers and chat stay with the NGO.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState icon={Building2} title="No campaigns" hint="This NGO has not created any yet." />
          ) : (
            <ul className="divide-y rounded-xl border">
              {campaigns.map((c) => {
                const teamSize = (c.teams ?? []).reduce(
                  (sum, t) => sum + (t.team_members?.length ?? 0),
                  0
                );
                const total = Number(c.total_budget ?? 0);
                const allocated = total - Number(c.remaining_budget ?? 0);
                const utilisation = total > 0 ? Math.round((allocated / total) * 100) : 0;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{c.title}</p>
                        <StatusBadge status={c.type === "invite" ? "invite" : c.status} />
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatDate(c.start_date)} – {formatDate(c.end_date)} · {c.location ?? "no location"}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {teamSize} member{teamSize === 1 ? "" : "s"} · {c.applications?.length ?? 0} application
                        {(c.applications?.length ?? 0) === 1 ? "" : "s"} · budget {rs(allocated)} of {rs(total)} ({utilisation}% used)
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserSquare2 className="h-5 w-5 text-primary" aria-hidden /> Staff
          </CardTitle>
          <CardDescription>
            Invited and active staff for this NGO. Active staff can be suspended without touching
            their invite history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState icon={UserSquare2} title="No staff" hint="This NGO has not invited any staff yet." />
          ) : (
            <ul className="divide-y rounded-xl border">
              {staff.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar
                    name={s.profile?.name ?? s.invited_name ?? s.invited_email}
                    src={s.profile?.avatar_url}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{s.profile?.name ?? s.invited_name ?? s.invited_email}</p>
                      <StatusBadge status={s.status} />
                      {s.profile?.suspended ? <StatusBadge status="suspended" /> : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.invited_email}</p>
                  </div>
                  {s.profile ? (
                    <SuspendToggle
                      profileId={s.profile.id}
                      suspended={Boolean(s.profile.suspended)}
                      name={s.profile.name ?? "this staff member"}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Waiting for signup with this email</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Recent ratings received</CardTitle>
          <CardDescription>From volunteers on completed campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{r.from_user?.name ?? "Volunteer"}</p>
                    <StarsDisplay score={Number(r.score)} size="sm" />
                  </div>
                  {r.comment ? (
                    <p className="mt-1.5 text-sm text-muted-foreground">“{r.comment}”</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </div>
  );
}
