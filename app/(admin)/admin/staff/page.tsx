import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserSquare2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { SuspendToggle } from "@/components/admin/AdminActionButtons";
import {
  AdminPagination,
  AdminToolbar,
  ADMIN_PAGE_SIZE,
  matchesQuery,
  parseDirParams,
} from "@/components/admin/AdminToolbar";
import { formatDate } from "@/lib/format";
import type { NgoStaff, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Admin staff directory — every staff invite/claim across all NGOs. */
export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, status, page } = parseDirParams(await searchParams, [
    "invited",
    "active",
    "suspended",
  ]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("ngo_staff")
    .select(
      "*, ngo:ngos!ngo_staff_ngo_id_fkey(profile_id, org_name), profile:profiles!ngo_staff_profile_id_fkey(id, name, avatar_url, suspended, role)"
    )
    .order("created_at", { ascending: true });

  const staff = (data ?? []) as unknown as Array<
    NgoStaff & { ngo?: { profile_id: string; org_name: string }; profile?: Profile | null }
  >;

  const filtered = staff
    .filter((s) =>
      status === "suspended"
        ? Boolean(s.profile?.suspended)
        : status === "all"
          ? true
          : s.status === status
    )
    .filter((s) =>
      matchesQuery(
        q,
        s.profile?.name,
        s.invited_name,
        s.invited_email,
        s.ngo?.org_name
      )
    );

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const counts = {
    invited: staff.filter((s) => s.status === "invited").length,
    active: staff.filter((s) => s.status === "active").length,
    suspended: staff.filter((s) => s.profile?.suspended).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        subtitle="Every staff invite across all NGOs — active staff can be suspended like any other account; unclaimed invites expire quietly."
      />

      <AdminToolbar
        basePath="/admin/staff"
        q={q}
        status={status}
        statuses={[
          { value: "invited", label: "Invited", count: counts.invited },
          { value: "active", label: "Active", count: counts.active },
          { value: "suspended", label: "Suspended", count: counts.suspended },
        ]}
        total={staff.length}
        shown={filtered.length}
      />

      <Card className="shadow-soft">
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={UserSquare2}
              title={q || status !== "all" ? "No staff match" : "No staff invited yet"}
              hint={
                q || status !== "all"
                  ? "Try a different search or clear the filters."
                  : "NGOs invite staff from their roster page."
              }
            />
          ) : (
            <ul className="divide-y">
              {pageRows.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-1 py-3">
                  <UserAvatar
                    name={s.profile?.name ?? s.invited_name ?? s.invited_email}
                    src={s.profile?.avatar_url}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="row-body">
                    <div className="flex flex-wrap items-center gap-2">
                      {s.profile ? (
                        <Link
                          href={`/admin/staff/${s.id}`}
                          className="font-semibold hover:text-primary hover:underline"
                        >
                          {s.profile.name ?? s.invited_name ?? s.invited_email}
                        </Link>
                      ) : (
                        <p className="font-semibold">{s.invited_name ?? s.invited_email}</p>
                      )}
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
                  <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:justify-start sm:justify-end">
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
        </CardContent>
      </Card>

      <AdminPagination
        basePath="/admin/staff"
        q={q}
        status={status}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
