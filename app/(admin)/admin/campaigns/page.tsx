import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AdminPagination,
  AdminToolbar,
  ADMIN_PAGE_SIZE,
  matchesQuery,
  parseDirParams,
} from "@/components/admin/AdminToolbar";
import { formatDate } from "@/lib/format";
import type { Campaign, Ngo } from "@/lib/types";

export const dynamic = "force-dynamic";

type OversightCampaign = Campaign & {
  teams?: Array<{ team_members: Array<{ id: string }> }>;
  applications?: Array<{ id: string }>;
  ngo?: Ngo & { profile?: { suspended: boolean } };
};

const rs = (n: unknown) => `Rs. ${Number(n ?? 0).toLocaleString("en-IN")}`;

/** Admin campaign directory — the whole platform's campaign portfolio with
 *  owner, team size, and budget use at a glance. */
export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, status, page } = parseDirParams(await searchParams, [
    "upcoming",
    "ongoing",
    "completed",
    "cancelled",
  ]);

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      "*, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, profile:profiles!ngos_profile_id_fkey(suspended)), teams(team_members(id)), applications(id)"
    )
    .order("created_at", { ascending: false });

  const campaigns = (data ?? []) as unknown as OversightCampaign[];

  const filtered = campaigns
    .filter((c) => (status === "all" ? true : c.status === status))
    .filter((c) => matchesQuery(q, c.title, c.location, c.ngo?.org_name));

  const pageCount = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const counts = {
    upcoming: campaigns.filter((c) => c.status === "upcoming").length,
    ongoing: campaigns.filter((c) => c.status === "ongoing").length,
    completed: campaigns.filter((c) => c.status === "completed").length,
    cancelled: campaigns.filter((c) => c.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        subtitle="Every campaign across every NGO — status, team size, and budget use. Ledgers, chat, and member detail stay with the owning NGO."
      />

      <AdminToolbar
        basePath="/admin/campaigns"
        q={q}
        status={status}
        statuses={[
          { value: "upcoming", label: "Upcoming", count: counts.upcoming },
          { value: "ongoing", label: "Ongoing", count: counts.ongoing },
          { value: "completed", label: "Completed", count: counts.completed },
          { value: "cancelled", label: "Cancelled", count: counts.cancelled },
        ]}
        total={campaigns.length}
        shown={filtered.length}
      />

      <Card className="shadow-soft">
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={q || status !== "all" ? "No campaigns match" : "No campaigns yet"}
              hint={
                q || status !== "all"
                  ? "Try a different search or clear the filters."
                  : "NGOs have not created any campaigns yet."
              }
            />
          ) : (
            <ul className="divide-y">
              {pageRows.map((c) => {
                const teamSize = (c.teams ?? []).reduce(
                  (sum, t) => sum + (t.team_members?.length ?? 0),
                  0
                );
                const total = Number(c.total_budget ?? 0);
                const allocated = total - Number(c.remaining_budget ?? 0);
                const utilisation = total > 0 ? Math.round((allocated / total) * 100) : 0;
                const ownerSuspended = Boolean(c.ngo?.profile?.suspended);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-1 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold" title={c.title}>
                          {c.title}
                        </p>
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
                      {c.ngo_id ? (
                        <Link
                          href={`/admin/ngos/${c.ngo_id}`}
                          className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                        >
                          View NGO
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <AdminPagination
        basePath="/admin/campaigns"
        q={q}
        status={status}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
