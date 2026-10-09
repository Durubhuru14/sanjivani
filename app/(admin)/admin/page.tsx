import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Building2,
  Flag,
  HeartHandshake,
  Megaphone,
  ShieldAlert,
  UserSquare2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AdminActionButton,
  ReportStatusButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import { formatDateTime } from "@/lib/format";
import type { Campaign, Ngo, NgoStaff, Profile, Volunteer, VolunteerReport } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Small "everything" link used at the bottom of the overview queue cards. */
function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

/** Admin overview — the platform at a glance plus the work that needs a
 *  decision today. Directories for every actor live one nav click away. */
export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [ngosRes, volsRes, reportsRes, campaignsRes, staffRes] = await Promise.all([
    // ngos/volunteers have no created_at (join dates live on profiles) —
    // the embedded profile's created_at is used for ordering below.
    supabase
      .from("ngos")
      .select("*, profile:profiles!ngos_profile_id_fkey(id, name, location, suspended, created_at)"),
    supabase
      .from("volunteers")
      .select(
        "*, profile:profiles!volunteers_profile_id_fkey(id, name, location, avatar_url, suspended, created_at)"
      ),
    supabase
      .from("volunteer_reports")
      .select(
        "*, volunteer:volunteer_id(id, name, avatar_url, suspended), reporter:reported_by(id, name, avatar_url), campaign:campaign_id(id, title)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("campaigns").select("id, status"),
    supabase
      .from("ngo_staff")
      .select(
        "*, profile:profiles!ngo_staff_profile_id_fkey(id, name, avatar_url, suspended, role)"
      )
      .order("created_at", { ascending: true }),
  ]);

  const ngos = ((ngosRes.data ?? []) as unknown as Array<Ngo & { profile?: Profile }>).sort(
    (a, b) => (a.profile?.created_at ?? "").localeCompare(b.profile?.created_at ?? "")
  );
  const vols = ((volsRes.data ?? []) as unknown as Array<Volunteer & { profile?: Profile }>).sort(
    (a, b) => (a.profile?.created_at ?? "").localeCompare(b.profile?.created_at ?? "")
  );
  const reports = (reportsRes.data ?? []) as VolunteerReport[];
  const campaigns = (campaignsRes.data ?? []) as Array<Pick<Campaign, "id" | "status">>;
  const staff = (staffRes.data ?? []) as unknown as Array<NgoStaff & { profile?: Profile | null }>;

  const pendingNgos = ngos.filter((n) => n.verification_status === "pending");
  const pendingVols = vols.filter((v) => v.verification_status === "pending" && !v.profile?.suspended);
  const openReports = reports.filter((r) => r.status === "open");
  const activeCampaigns = campaigns.filter((c) => c.status === "ongoing" || c.status === "upcoming");
  const suspendedUsers = [
    ...ngos.filter((n) => n.profile?.suspended).map((n) => n.profile!),
    ...vols.filter((v) => v.profile?.suspended).map((v) => v.profile!),
    ...staff.filter((s) => s.profile?.suspended).map((s) => s.profile!),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin dashboard"
        subtitle="Platform health at a glance. Everything that needs a decision today is right here — full directories for NGOs, campaigns, volunteers, staff, and reports are one click away in the section nav."
        className="animate-fade-up"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/admin/ngos" className="animate-fade-up stagger-1">
          <StatCard
            label="NGOs"
            value={ngos.length}
            icon={Building2}
            hint={`${pendingNgos.length} awaiting approval`}
          />
        </Link>
        <Link href="/admin/volunteers" className="animate-fade-up stagger-2">
          <StatCard
            label="Volunteers"
            value={vols.length}
            icon={HeartHandshake}
            hint={`${pendingVols.length} awaiting verification`}
          />
        </Link>
        <Link href="/admin/campaigns" className="animate-fade-up stagger-3">
          <StatCard
            label="Campaigns"
            value={campaigns.length}
            icon={Megaphone}
            hint={`${activeCampaigns.length} upcoming or ongoing`}
          />
        </Link>
        <Link href="/admin/staff" className="animate-fade-up stagger-4">
          <StatCard
            label="Staff"
            value={staff.length}
            icon={UserSquare2}
            hint={`${staff.filter((s) => s.status === "active").length} active`}
          />
        </Link>
        <Link href="/admin/reports" className="animate-fade-up stagger-5">
          <StatCard
            label="Open reports"
            value={openReports.length}
            icon={Flag}
            hint={`${reports.length} filed all-time`}
          />
        </Link>
        <div className="animate-fade-up stagger-6">
          <StatCard
            label="Suspended"
            value={suspendedUsers.length}
            icon={ShieldAlert}
            hint="across all roles"
          />
        </div>
      </div>

      {/* Pending NGOs */}
      <Card className="animate-fade-up stagger-2 shadow-soft">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" aria-hidden /> NGOs awaiting approval
            </CardTitle>
            <CardDescription>
              Approve to let them create campaigns; rejection keeps their profile visible to them
              only.
            </CardDescription>
          </div>
          <ViewAll href="/admin/ngos?status=pending" label="All NGOs" />
        </CardHeader>
        <CardContent>
          {pendingNgos.length === 0 ? (
            <EmptyState icon={Building2} title="No pending NGOs" hint="The verification queue is empty." />
          ) : (
            <ul className="divide-y rounded-xl border">
              {pendingNgos.map((n) => (
                <li key={n.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar name={n.org_name} src={n.logo_url} className="h-9 w-9 text-sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/ngos/${n.profile_id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {n.org_name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Reg. {n.registration_number ?? "—"} · {n.profile?.location ?? "location not set"}
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pending volunteers */}
      <Card className="animate-fade-up stagger-3 shadow-soft">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-primary" aria-hidden /> Volunteers awaiting
              verification
            </CardTitle>
            <CardDescription>
              Approval adds the verified badge — volunteers can use the platform while pending.
            </CardDescription>
          </div>
          <ViewAll href="/admin/volunteers?status=pending" label="All volunteers" />
        </CardHeader>
        <CardContent>
          {pendingVols.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No pending volunteers" />
          ) : (
            <ul className="divide-y rounded-xl border">
              {pendingVols.map((v) => (
                <li key={v.profile_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <UserAvatar
                    name={v.profile?.name ?? "Volunteer"}
                    src={v.profile?.avatar_url}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/volunteers/${v.profile_id}`}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {v.profile?.name ?? "Volunteer"}
                    </Link>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Open reports */}
      <Card className="animate-fade-up stagger-4 shadow-soft">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" aria-hidden /> Open volunteer reports
            </CardTitle>
            <CardDescription>
              Filed by NGOs for misconduct. Reviewed or dismissed closes them — the reporting NGO is
              notified either way.
            </CardDescription>
          </div>
          <ViewAll href="/admin/reports" label="All reports" />
        </CardHeader>
        <CardContent>
          {openReports.length === 0 ? (
            <EmptyState icon={Flag} title="No open reports" hint="A quiet platform is a happy platform." />
          ) : (
            <ul className="space-y-3">
              {openReports.slice(0, 5).map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        <Link
                          href={`/admin/volunteers/${r.volunteer_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {r.volunteer?.name ?? "Volunteer"}
                        </Link>{" "}
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Suspended accounts */}
      {suspendedUsers.length > 0 ? (
        <Card className="animate-fade-up stagger-5 shadow-soft">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
