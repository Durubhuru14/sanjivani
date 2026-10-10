import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ReportStatusButton,
  SuspendToggle,
} from "@/components/admin/AdminActionButtons";
import {
  AdminPagination,
  AdminToolbar,
  ADMIN_PAGE_SIZE,
  matchesQuery,
  parseDirParams,
} from "@/components/admin/AdminToolbar";
import { formatDateTime } from "@/lib/format";
import type { VolunteerReport } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Admin reports queue — open reports first, closed history one filter chip
 *  away. Volunteer names link to the full oversight detail page. */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, status, page } = parseDirParams(await searchParams, [
    "open",
    "reviewed",
    "dismissed",
  ]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("volunteer_reports")
    .select(
      "*, volunteer:volunteer_id(id, name, avatar_url, suspended), reporter:reported_by(id, name, avatar_url), campaign:campaign_id(id, title)"
    )
    .order("created_at", { ascending: false });

  const reports = (data ?? []) as VolunteerReport[];

  const filtered = reports
    .filter((r) => (status === "all" ? true : r.status === status))
    .filter((r) => matchesQuery(q, r.volunteer?.name, r.reporter?.name, r.campaign?.title, r.reason));

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const counts = {
    open: reports.filter((r) => r.status === "open").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer reports"
        subtitle="Filed by NGOs for misconduct. Reviewed or dismissed closes them — the reporting NGO is notified either way. Suspend from here or from the volunteer's page."
      />

      <AdminToolbar
        basePath="/admin/reports"
        q={q}
        status={status}
        statuses={[
          { value: "open", label: "Open", count: counts.open },
          { value: "reviewed", label: "Reviewed", count: counts.reviewed },
          { value: "dismissed", label: "Dismissed", count: counts.dismissed },
        ]}
        total={reports.length}
        shown={filtered.length}
      />

      <Card className="shadow-soft">
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Flag}
              title={q || status !== "all" ? "No reports match" : "No reports"}
              hint={
                q || status !== "all"
                  ? "Try a different search or clear the filters."
                  : "A quiet platform is a happy platform."
              }
            />
          ) : (
            <ul className="space-y-3">
              {pageRows.map((r) => (
                <li key={r.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="row-body">
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
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      {r.volunteer?.suspended ? <StatusBadge status="suspended" /> : null}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="mt-3 flex min-h-8 flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                    {r.status === "open" ? (
                      <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:[&>button]:w-full sm:shrink-0 sm:justify-end">
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

      <AdminPagination
        basePath="/admin/reports"
        q={q}
        status={status}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
