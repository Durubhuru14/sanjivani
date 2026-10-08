import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, Megaphone, Star, UserSquare2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
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

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "ongoing" || c.status === "upcoming"
  ).length;
  const activeStaff = staff.filter((s) => s.status === "active").length;
  const avgRating = Number(ngo.avg_rating ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        backHref="/admin"
        backLabel="Back to dashboard"
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span aria-hidden="true">
              <UserAvatar
                name={ngo.org_name}
                src={ngo.logo_url}
                className="h-10 w-10 rounded-lg text-base"
                rounded="lg"
              />
            </span>
            <span>{ngo.org_name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={ngo.verification_status} />
            {ngo.profile?.suspended ? <StatusBadge status="suspended" /> : null}
            <span>
              Registration {ngo.registration_number ?? "—"} · joined{" "}
              {formatDate(ngo.profile?.created_at)} · {ngo.profile?.location ?? "location not set"}
            </span>
          </span>
        }
        action={
          <>
            <AdminActionButton
              path="/api/admin/approve-ngo"
              profileId={id}
              label="Approve NGO"
              size="default"
              variant="default"
              successTitle={`${ngo.org_name} approved.`}
            />
            <AdminActionButton
              path="/api/admin/reject-ngo"
              profileId={id}
              label="Reject"
              icon="x"
              size="default"
              successTitle={`${ngo.org_name} was rejected.`}
            />
            <SuspendToggle
              profileId={id}
              suspended={Boolean(ngo.profile?.suspended)}
              name={ngo.org_name}
              size="default"
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Campaigns"
          value={campaigns.length}
          icon={Megaphone}
          hint={`${activeCampaigns} upcoming or ongoing`}
        />
        <StatCard
          label="Staff"
          value={staff.length}
          icon={UserSquare2}
          hint={`${activeStaff} active`}
        />
        <StatCard
          label="Avg. rating"
          value={avgRating > 0 ? avgRating.toFixed(2) : "New"}
          icon={Star}
          hint={avgRating > 0 ? "out of 5" : "no ratings yet"}
        />
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
                        <p className="truncate font-semibold" title={c.title}>{c.title}</p>
                        <StatusBadge status={c.status} />
                        <StatusBadge status={c.type} />
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
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    {s.profile ? (
                      <SuspendToggle
                        profileId={s.profile.id}
                        suspended={Boolean(s.profile.suspended)}
                        name={s.profile.name ?? "this staff member"}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">Waiting for signup with this email</span>
                    )}
                  </div>
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
            <EmptyState icon={Star} title="No ratings yet" hint="Volunteers can rate this NGO after a completed campaign." />
          ) : (
            <ul className="space-y-3">
              {ratings.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">{r.from_user?.name ?? "Volunteer"}</p>
                    <StarsDisplay score={Number(r.score)} size="sm" className="[&>span]:tabular-nums" />
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
    </div>
  );
}
