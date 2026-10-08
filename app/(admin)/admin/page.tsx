import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Flag,
  HeartHandshake,
  Inbox,
  Megaphone,
  ShieldAlert,
  Users,
  UserSquare2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  AdminActionButton,
  ReportStatusButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Campaign, Ngo, NgoStaff, Profile, Volunteer, VolunteerReport } from "@/lib/types";

export const dynamic = "force-dynamic";

type OversightCampaign = Campaign & {
  teams?: Array<{ team_members: Array<{ id: string }> }>;
  applications?: Array<{ id: string }>;
  ngo?: Ngo & { profile?: { suspended: boolean } };
};

const rs = (n: unknown) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN")}`;

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [ngosRes, volsRes, reportsRes, usersRes, campaignsRes, appsRes, staffRes, allCampaignsRes] =
    await Promise.all([
      supabase
        .from("ngos")
        .select("*, profile:profiles!ngos_profile_id_fkey(id, name, location, suspended, created_at)")
        .order("created_at", { ascending: true }),
      supabase
        .from("volunteers")
        .select(
          "*, profile:profiles!volunteers_profile_id_fkey(id, name, location, avatar_url, suspended, created_at)"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("volunteer_reports")
        .select(
          "*, volunteer:volunteer_id(id, name, avatar_url, suspended), reporter:reported_by(id, name, avatar_url), campaign:campaign_id(id, title)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("campaigns").select("id, status", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }),
      supabase
        .from("ngo_staff")
        .select(
          "*, ngo:ngos!ngo_staff_ngo_id_fkey(profile_id, org_name), profile:profiles!ngo_staff_profile_id_fkey(id, name, avatar_url, suspended, role)"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("campaigns")
        .select(
          "*, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, profile:profiles!ngos_profile_id_fkey(suspended)), teams(team_members(id)), applications(id)"
        )
        .order("created_at", { ascending: false }),
    ]);

  const ngos = (ngosRes.data ?? []) as unknown as Array<Ngo & { profile?: Profile }>;
  const vols = (volsRes.data ?? []) as unknown as Array<Volunteer & { profile?: Profile }>;
  const reports = (reportsRes.data ?? []) as unknown as VolunteerReport[];
  const staff = (staffRes.data ?? []) as unknown as Array<
    NgoStaff & { ngo?: { profile_id: string; org_name: string }; profile?: Profile | null }
  >;
  const campaigns = (allCampaignsRes.data ?? []) as unknown as OversightCampaign[];

  const pendingNgos = ngos.filter((n) => n.verification_status === "pending");
  const pendingVols = vols.filter((v) => v.verification_status === "pending" && !v.profile?.suspended);
  const openReports = reports.filter((r) => r.status === "open");
  const suspendedUsers = [
    ...ngos.filter((n) => n.profile?.suspended).map((n) => n.profile!),
    ...vols.filter((v) => v.profile?.suspended).map((v) => v.profile!),
    ...staff.filter((s) => s.profile?.suspended).map((s) => s.profile!),
  ];
  const activeCampaigns = campaigns.filter((c) => c.status === "ongoing" || c.status === "upcoming");
  const activeStaff = staff.filter((s) => s.status === "active");

  // campaign count per NGO for the directory rows
  const campaignCountByNgo = new Map<string, number>();
  for (const c of campaigns) {
    if (c.ngo_id) campaignCountByNgo.set(c.ngo_id, (campaignCountByNgo.get(c.ngo_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin dashboard"
        subtitle="Verification queue, reports, platform health, and account actions — full oversight of every NGO, campaign, staff member, and volunteer on Sanjivani."
        className="animate-fade-up"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="animate-fade-up stagger-1">
          <StatCard label="NGOs" value={ngos.length} icon={Building2} hint={`${pendingNgos.length} awaiting approval`} />
        </div>
        <div className="animate-fade-up stagger-2">
          <StatCard label="Volunteers" value={vols.length} icon={HeartHandshake} hint={`${pendingVols.length} awaiting verification`} />
        </div>
        <div className="animate-fade-up stagger-3">
          <StatCard label="Campaigns" value={campaigns.length} icon={Megaphone} hint={`${activeCampaigns.length} upcoming or ongoing`} />
        </div>
        <div className="animate-fade-up stagger-4">
          <StatCard label="Staff" value={staff.length} icon={UserSquare2} hint={`${activeStaff.length} active`} />
        </div>
        <div className="animate-fade-up stagger-5">
          <StatCard label="Open reports" value={openReports.length} icon={Flag} hint="filed by NGOs" />
        </div>
        <div className="animate-fade-up stagger-6">
          <StatCard label="Suspended" value={suspendedUsers.length} icon={ShieldAlert} hint="across all roles" />
        </div>
      </div>

      {/* Pending NGOs */}
      <Card className="animate-fade-up stagger-2 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" aria-hidden /> NGOs awaiting approval
          </CardTitle>
          <CardDescription>
            Approve to let them create campaigns; rejection keeps their profile visible to
            them only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingNgos.length === 0 ? (
            <EmptyState icon={Building2} title="No pending NGOs" hint="The verification queue is empty." />
          ) : (
            <ul className="divide-y rounded-xl border">
              {pendingNgos.map((n) => (
                <li key={n.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar
                    name={n.org_name}
                    src={n.logo_url}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/ngos/${n.profile_id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {n.org_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Reg. {n.registration_number ?? "—"} · joined {formatDate(n.profile?.created_at)}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <AdminActionButton
                      path="/api/admin/approve-ngo"
                      profileId={n.profile_id}
                      label="Approve"
                      successTitle={`${n.org_name} approved — they were notified.`}
                    />
                    <AdminActionButton
                      path="/api/admin/reject-ngo"
                      profileId={n.profile_id}
                      label="Reject"
                      icon="x"
                      confirmText={`Reject ${n.org_name}? They can still edit their profile.`}
                      successTitle={`${n.org_name} was rejected.`}
                    />
                    <SuspendToggle
                      profileId={n.profile_id}
                      suspended={Boolean(n.profile?.suspended)}
                      name={n.org_name}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending volunteers */}
      <Card className="animate-fade-up stagger-3 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-primary" aria-hidden /> Volunteers awaiting
            verification
          </CardTitle>
          <CardDescription>
            Approval adds the verified badge — volunteers can use the platform while pending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingVols.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No pending volunteers" />
          ) : (
            <ul className="divide-y rounded-xl border">
              {pendingVols.map((v) => (
                <li key={v.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{v.profile?.name ?? "Volunteer"}</p>
                    <p className="text-sm text-muted-foreground">
                      {(v.skills ?? []).slice(0, 4).join(", ") || "No skills listed"} ·{" "}
                      {v.profile?.location ?? "—"}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <AdminActionButton
                      path="/api/admin/approve-volunteer"
                      profileId={v.profile_id}
                      label="Approve"
                      successTitle={`${v.profile?.name ?? "Volunteer"} is now verified.`}
                    />
                    <AdminActionButton
                      path="/api/admin/reject-volunteer"
                      profileId={v.profile_id}
                      label="Reject"
                      icon="x"
                      successTitle="Volunteer verification was rejected."
                    />
                    <SuspendToggle
                      profileId={v.profile_id}
                      suspended={Boolean(v.profile?.suspended)}
                      name={v.profile?.name ?? "this volunteer"}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reports queue */}
      <Card className="animate-fade-up stagger-4 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" aria-hidden /> Volunteer reports
          </CardTitle>
          <CardDescription>
            Filed by NGOs for misconduct. Reviewed/dismissed closes them — the reporting NGO is
            notified either way.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState icon={Flag} title="No reports" hint="A quiet platform is a happy platform." />
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.volunteer?.name ?? "Volunteer"}{" "}
                        <span className="font-normal text-muted-foreground">
                          reported by {r.reporter?.name ?? "NGO"}
                          {r.campaign ? ` · ${r.campaign.title}` : ""}
                        </span>
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {r.volunteer?.suspended ? <StatusBadge status="suspended" /> : null}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                    {r.status === "open" ? (
                      <div className="ml-auto flex min-w-[12rem] flex-wrap items-center justify-end gap-2">
                        <SuspendToggle
                          profileId={r.volunteer_id}
                          suspended={Boolean(r.volunteer?.suspended)}
                          name={r.volunteer?.name ?? "this volunteer"}
                        />
                        <ReportStatusButton
                          reportId={r.id}
                          status="reviewed"
                          label="Mark reviewed"
                        />
                        <ReportStatusButton
                          reportId={r.id}
                          status="dismissed"
                          label="Dismiss"
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Platform oversight — every actor, every campaign */}
      <Card className="animate-fade-up stagger-5 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden /> Platform oversight
          </CardTitle>
          <CardDescription>
            Every NGO, campaign, staff member, and volunteer on the platform. Suspension needs no
            report — it takes down an NGO&apos;s public presence immediately and restores it on
            unsuspend, with all data preserved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="ngos">
            <TabsList className="mb-4 h-auto w-full flex-wrap sm:h-9 sm:w-fit">
              <TabsTrigger value="ngos">NGOs ({ngos.length})</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers ({vols.length})</TabsTrigger>
              <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
            </TabsList>

            {/* ---- All NGOs ---- */}
            <TabsContent value="ngos" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {ngos.length} organisation{ngos.length === 1 ? "" : "s"} — approve, reject, suspend,
                or unsuspend directly. Open an NGO for its campaigns, staff, and ratings.
              </p>
              {ngos.length === 0 ? (
                <EmptyState icon={Building2} title="No NGOs yet" hint="Organisations will appear here as soon as they sign up." />
              ) : (
                <ul className="divide-y rounded-xl border">
                  {ngos.map((n) => (
                    <li key={n.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <UserAvatar
                        name={n.org_name}
                        src={n.logo_url}
                        className="h-9 w-9 text-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/ngos/${n.profile_id}`}
                            className="font-semibold hover:text-primary hover:underline"
                          >
                            {n.org_name}
                          </Link>
                          <StatusBadge status={n.verification_status} />
                          {n.profile?.suspended ? <StatusBadge status="suspended" /> : null}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {campaignCountByNgo.get(n.profile_id) ?? 0} campaign
                          {(campaignCountByNgo.get(n.profile_id) ?? 0) === 1 ? "" : "s"} ·{" "}
                          {n.profile?.location ?? "location not set"} · joined{" "}
                          {formatDate(n.profile?.created_at)}
                        </p>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {n.verification_status === "pending" ? (
                          <>
                            <AdminActionButton
                              path="/api/admin/approve-ngo"
                              profileId={n.profile_id}
                              label="Approve"
                              successTitle={`${n.org_name} approved — they were notified.`}
                            />
                            <AdminActionButton
                              path="/api/admin/reject-ngo"
                              profileId={n.profile_id}
                              label="Reject"
                              icon="x"
                              successTitle={`${n.org_name} was rejected.`}
                            />
                          </>
                        ) : null}
                        <SuspendToggle
                          profileId={n.profile_id}
                          suspended={Boolean(n.profile?.suspended)}
                          name={n.org_name}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {/* ---- Campaigns across the platform ---- */}
            <TabsContent value="campaigns" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} across every NGO —
                title, owner, status, team size, and budget use. Ledgers, chat, and member detail
                stay with the NGO.
              </p>
              {campaigns.length === 0 ? (
                <EmptyState icon={Megaphone} title="No campaigns yet" hint="NGOs have not created any." />
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
                    const ownerSuspended = Boolean(c.ngo?.profile?.suspended);
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold" title={c.title}>{c.title}</p>
                            <StatusBadge status={c.status} />
                            <StatusBadge status={c.type} />
                            {ownerSuspended ? <StatusBadge status="suspended" /> : null}
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {c.ngo?.org_name ?? "Unknown NGO"} · {formatDate(c.start_date)} –{" "}
                            {formatDate(c.end_date)} · {c.location ?? "no location"}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {teamSize} member{teamSize === 1 ? "" : "s"} ·{" "}
                            {c.applications?.length ?? 0} application
                            {(c.applications?.length ?? 0) === 1 ? "" : "s"} · budget {rs(allocated)}{" "}
                            of {rs(total)} ({utilisation}% used)
                          </p>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center">
                          <Link
                            href={`/admin/ngos/${c.ngo_id}`}
                            className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                          >
                            View NGO
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* ---- All volunteers ---- */}
            <TabsContent value="volunteers" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {vols.length} volunteer{vols.length === 1 ? "" : "s"} — verified badge status,
                ratings, and account actions.
              </p>
              {vols.length === 0 ? (
                <EmptyState icon={HeartHandshake} title="No volunteers yet" hint="Volunteers will appear here as soon as they join." />
              ) : (
                <ul className="divide-y rounded-xl border">
                  {vols.map((v) => (
                    <li key={v.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <UserAvatar
                        name={v.profile?.name ?? "Volunteer"}
                        src={v.profile?.avatar_url}
                        className="h-9 w-9 text-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{v.profile?.name ?? "Volunteer"}</p>
                          {v.verification_status === "approved" ? (
                            <VerifiedBadge verified />
                          ) : (
                            <StatusBadge status={v.verification_status} />
                          )}
                          {v.profile?.suspended ? <StatusBadge status="suspended" /> : null}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {(v.skills ?? []).slice(0, 4).join(", ") || "No skills listed"} ·{" "}
                          {v.profile?.location ?? "—"} · {Number(v.avg_rating ?? 0).toFixed(1)}★ avg
                        </p>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {v.verification_status === "pending" ? (
                          <>
                            <AdminActionButton
                              path="/api/admin/approve-volunteer"
                              profileId={v.profile_id}
                              label="Verify"
                              successTitle={`${v.profile?.name ?? "Volunteer"} is now verified.`}
                            />
                            <AdminActionButton
                              path="/api/admin/reject-volunteer"
                              profileId={v.profile_id}
                              label="Reject"
                              icon="x"
                              successTitle="Volunteer verification was rejected."
                            />
                          </>
                        ) : null}
                        <SuspendToggle
                          profileId={v.profile_id}
                          suspended={Boolean(v.profile?.suspended)}
                          name={v.profile?.name ?? "this volunteer"}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            {/* ---- Staff across NGOs ---- */}
            <TabsContent value="staff" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {staff.length} staff invite{staff.length === 1 ? "" : "s"} across all NGOs — active
                staff can be suspended like any other account; unclaimed invites just expire
                quietly.
              </p>
              {staff.length === 0 ? (
                <EmptyState icon={UserSquare2} title="No staff invited yet" hint="NGOs invite staff from their roster page." />
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
                          <p className="font-semibold">
                            {s.profile?.name ?? s.invited_name ?? s.invited_email}
                          </p>
                          <StatusBadge status={s.status} />
                          {s.profile?.suspended ? <StatusBadge status="suspended" /> : null}
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {s.invited_email} ·{" "}
                          {s.ngo?.org_name ? (
                            <Link
                              href={`/admin/ngos/${s.ngo.profile_id}`}
                              className="underline-offset-4 hover:text-primary hover:underline"
                            >
                              {s.ngo.org_name}
                            </Link>
                          ) : (
                            "Unknown NGO"
                          )}{" "}
                          · invited {formatDate(s.created_at)}
                        </p>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                        {s.profile ? (
                          <SuspendToggle
                            profileId={s.profile.id}
                            suspended={Boolean(s.profile.suspended)}
                            name={s.profile.name ?? "this staff member"}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Waiting for signup with this email
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Suspended accounts */}
      <Card className="animate-fade-up stagger-6 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" aria-hidden /> Suspended accounts
          </CardTitle>
          <CardDescription>
            Suspension blocks sign-in and writes and pulls the account&apos;s campaigns out of
            public view; data is kept so unsuspending restores everything.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suspendedUsers.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No suspended accounts" />
          ) : (
            <ul className="divide-y rounded-xl border">
              {suspendedUsers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name ?? p.id.slice(0, 8)}</p>
                    <p className="text-sm capitalize text-muted-foreground">{p.role}</p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <SuspendToggle profileId={p.id} suspended name={p.name ?? "this account"} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Platform stats */}
      <section className="animate-fade-up stagger-6 space-y-4">
        <h2 className="text-lg font-semibold">Platform stats</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Profiles" value={usersRes.count ?? 0} icon={Users} hint="across all roles" />
          <StatCard label="Campaigns" value={campaignsRes.count ?? 0} icon={Megaphone} hint="across every NGO" />
          <StatCard label="Applications" value={appsRes.count ?? 0} icon={Inbox} hint="all-time" />
        </div>
      </section>
    </div>
  );
}
