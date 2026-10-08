import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  CalendarCheck,
  Flag,
  HeartHandshake,
  Inbox,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  AdminActionButton,
  ReportStatusButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Ngo, Profile, Volunteer, VolunteerReport } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [ngosRes, volsRes, reportsRes, usersRes, campaignsRes, appsRes] = await Promise.all([
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
  ]);

  const ngos = (ngosRes.data ?? []) as unknown as Array<Ngo & { profile?: Profile }>;
  const vols = (volsRes.data ?? []) as unknown as Array<Volunteer & { profile?: Profile }>;
  const reports = (reportsRes.data ?? []) as unknown as VolunteerReport[];

  const pendingNgos = ngos.filter((n) => n.verification_status === "pending");
  const pendingVols = vols.filter((v) => v.verification_status === "pending" && !v.profile?.suspended);
  const openReports = reports.filter((r) => r.status === "open");
  const suspendedUsers = [
    ...ngos.filter((n) => n.profile?.suspended).map((n) => n.profile!),
    ...vols.filter((v) => v.profile?.suspended).map((v) => v.profile!),
  ];

  const roleCounts = { ngo: ngos.length, volunteer: vols.length };

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Verification queue, reports, platform health, and account actions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="animate-fade-up stagger-1">
          <StatCard label="NGOs on platform" value={ngos.length} icon={Building2} hint={`${pendingNgos.length} awaiting approval`} />
        </div>
        <div className="animate-fade-up stagger-2">
          <StatCard label="Volunteers" value={vols.length} icon={HeartHandshake} hint={`${pendingVols.length} awaiting verification`} />
        </div>
        <div className="animate-fade-up stagger-3">
          <StatCard label="Open reports" value={openReports.length} icon={Flag} />
        </div>
        <div className="animate-fade-up stagger-4">
          <StatCard label="Suspended accounts" value={suspendedUsers.length} icon={ShieldAlert} />
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
                    icon="users"
                    variant="ghost"
                    confirmText={`Reject ${n.org_name}? They can still edit their profile.`}
                    successTitle={`${n.org_name} was rejected.`}
                  />
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
                    icon="users"
                    variant="ghost"
                    successTitle="Volunteer verification was rejected."
                  />
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
            Filed by NGOs for misconduct. Reviewed/dismissed closes them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <EmptyState icon={Flag} title="No reports" hint="A quiet platform is a happy platform." />
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {r.volunteer?.name ?? "Volunteer"}{" "}
                      <span className="font-normal text-muted-foreground">
                        reported by {r.reporter?.name ?? "NGO"}
                        {r.campaign ? ` · ${r.campaign.title}` : ""}
                      </span>
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                    {r.status === "open" ? (
                      <div className="flex gap-2">
                        <ReportStatusButton
                          reportId={r.id}
                          status="reviewed"
                          label="Mark reviewed"
                        />
                        <ReportStatusButton
                          reportId={r.id}
                          status="dismissed"
                          label="Dismiss"
                          className="text-muted-foreground"
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

      {/* Suspended accounts */}
      <Card className="animate-fade-up stagger-5 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" aria-hidden /> Suspended accounts
          </CardTitle>
          <CardDescription>
            Suspension blocks sign-in and writes; data is kept so unsuspending restores
            everything.
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
                  <SuspendToggle profileId={p.id} suspended name={p.name ?? "this account"} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Platform stats */}
      <Card className="animate-fade-up stagger-6 shadow-soft">
        <CardHeader>
          <CardTitle>Platform stats</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Total profiles</p>
            <p className="mt-1 text-2xl font-bold">{usersRes.count ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Campaigns</p>
            <p className="mt-1 text-2xl font-bold">{campaignsRes.count ?? 0}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Applications</p>
            <p className="mt-1 text-2xl font-bold">{appsRes.count ?? 0}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
