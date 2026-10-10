import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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
import type { Profile, Volunteer } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Admin volunteer directory — find any volunteer, see their trust signals,
 *  verify or suspend, and drill into their full history. */
export default async function AdminVolunteersPage({
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
  // NOTE: volunteers/ngos have no created_at column (join dates live on
  // profiles.created_at) — order by the embedded profile instead.
  const { data } = await supabase
    .from("volunteers")
    .select(
      "*, profile:profiles!volunteers_profile_id_fkey(id, name, location, avatar_url, suspended, created_at)"
    );

  const vols = ((data ?? []) as unknown as Array<Volunteer & { profile?: Profile }>).sort(
    (a, b) => (a.profile?.created_at ?? "").localeCompare(b.profile?.created_at ?? "")
  );

  const filtered = vols
    .filter((v) =>
      status === "suspended"
        ? Boolean(v.profile?.suspended)
        : status === "all"
          ? true
          : v.verification_status === status
    )
    .filter((v) => matchesQuery(q, v.profile?.name, v.profile?.location, ...(v.skills ?? [])));

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const counts = {
    pending: vols.filter((v) => v.verification_status === "pending").length,
    approved: vols.filter((v) => v.verification_status === "approved").length,
    rejected: vols.filter((v) => v.verification_status === "rejected").length,
    suspended: vols.filter((v) => v.profile?.suspended).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteers"
        subtitle="Every volunteer on the platform — verification state, skills, ratings, and account actions. Open a volunteer for their full campaign history."
      />

      <AdminToolbar
        basePath="/admin/volunteers"
        q={q}
        status={status}
        statuses={[
          { value: "pending", label: "Pending", count: counts.pending },
          { value: "approved", label: "Verified", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
          { value: "suspended", label: "Suspended", count: counts.suspended },
        ]}
        total={vols.length}
        shown={filtered.length}
      />

      <Card className="shadow-soft">
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={HeartHandshake}
              title={q || status !== "all" ? "No volunteers match" : "No volunteers yet"}
              hint={
                q || status !== "all"
                  ? "Try a different search or clear the filters."
                  : "Volunteers will appear here as soon as they join."
              }
            />
          ) : (
            <ul className="divide-y">
              {pageRows.map((v) => (
                <li key={v.profile_id} className="flex flex-wrap items-center gap-3 px-1 py-3">
                  <UserAvatar
                    name={v.profile?.name ?? "Volunteer"}
                    src={v.profile?.avatar_url}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="row-body">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/volunteers/${v.profile_id}`}
                        className="font-semibold hover:text-primary hover:underline"
                      >
                        {v.profile?.name ?? "Volunteer"}
                      </Link>
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
        </CardContent>
      </Card>

      <AdminPagination
        basePath="/admin/volunteers"
        q={q}
        status={status}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
