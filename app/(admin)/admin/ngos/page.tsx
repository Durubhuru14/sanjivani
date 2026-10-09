import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import {
  AdminActionButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import {
  AdminPagination,
  AdminToolbar,
  ADMIN_PAGE_SIZE,
  matchesQuery,
  parseDirParams,
} from "@/components/admin/AdminToolbar";
import { formatDate } from "@/lib/format";
import type { Campaign, Ngo, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Admin NGO directory — search, filter by verification/suspension state,
 *  paginate, and act (approve / reject / suspend) without leaving the list. */
export default async function AdminNgosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, status, page } = parseDirParams(await searchParams, [
    "pending",
    "approved",
    "rejected",
    "suspended",
  ]);

  const supabase = await createClient();
  const [ngosRes, campaignsRes] = await Promise.all([
    // ngos has no created_at (join date lives on profiles.created_at)
    supabase
      .from("ngos")
      .select("*, profile:profiles!ngos_profile_id_fkey(id, name, location, suspended, created_at)"),
    supabase.from("campaigns").select("ngo_id"),
  ]);

  const ngos = ((ngosRes.data ?? []) as unknown as Array<Ngo & { profile?: Profile }>).sort(
    (a, b) => (a.profile?.created_at ?? "").localeCompare(b.profile?.created_at ?? "")
  );
  const campaignCount = new Map<string, number>();
  for (const c of (campaignsRes.data ?? []) as Array<Pick<Campaign, "ngo_id">>) {
    if (c.ngo_id) campaignCount.set(c.ngo_id, (campaignCount.get(c.ngo_id) ?? 0) + 1);
  }

  const filtered = ngos
    .filter((n) =>
      status === "suspended"
        ? Boolean(n.profile?.suspended)
        : status === "all"
          ? true
          : n.verification_status === status
    )
    .filter((n) => matchesQuery(q, n.org_name, n.registration_number, n.profile?.location));

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const counts = {
    pending: ngos.filter((n) => n.verification_status === "pending").length,
    approved: ngos.filter((n) => n.verification_status === "approved").length,
    rejected: ngos.filter((n) => n.verification_status === "rejected").length,
    suspended: ngos.filter((n) => n.profile?.suspended).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="NGOs"
        subtitle="Every organisation on the platform — approve, reject, suspend, or drill into campaigns, staff, and ratings."
      />

      <AdminToolbar
        basePath="/admin/ngos"
        q={q}
        status={status}
        statuses={[
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
          { value: "suspended", label: "Suspended", count: counts.suspended },
        ]}
        total={ngos.length}
        shown={filtered.length}
      />

      <Card className="shadow-soft">
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={q || status !== "all" ? "No NGOs match" : "No NGOs yet"}
              hint={
                q || status !== "all"
                  ? "Try a different search or clear the filters."
                  : "Organisations will appear here as soon as they sign up."
              }
            />
          ) : (
            <ul className="divide-y">
              {pageRows.map((n) => (
                <li key={n.profile_id} className="flex flex-wrap items-center gap-3 px-1 py-3">
                  <UserAvatar name={n.org_name} src={n.logo_url} className="h-9 w-9 text-sm" />
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
                      {campaignCount.get(n.profile_id) ?? 0} campaign
                      {(campaignCount.get(n.profile_id) ?? 0) === 1 ? "" : "s"} ·{" "}
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
        </CardContent>
      </Card>

      <AdminPagination
        basePath="/admin/ngos"
        q={q}
        status={status}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
