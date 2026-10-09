import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { RespondInviteButtons } from "@/app/(volunteer)/volunteer/campaigns/[id]/campaign-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CampaignInvite } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VolunteerInvitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("campaign_invites")
    .select(
      "*, campaign:campaign_id(id, title, status, type, start_date, end_date, location, ngo:ngos!campaigns_ngo_id_fkey(profile_id, org_name, verification_status, avg_rating))"
    )
    .eq("volunteer_id", user.id)
    .order("created_at", { ascending: false });

  const invites = (data ?? []) as unknown as CampaignInvite[];
  const pending = invites.filter((i) => i.status === "pending");
  const answered = invites.filter((i) => i.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        backHref="/volunteer"
        backLabel="Dashboard"
        title="My invitations"
        subtitle="Personal invitations to invite-only campaigns. Accepting marks your application as accepted immediately."
      />

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Waiting for your answer</CardTitle>
          {pending.length === 0 ? (
            <CardDescription>Nothing pending — you are all caught up.</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {pending.length === 0 ? (
            <EmptyState
              icon={Send}
              title="No pending invitations"
              hint="Invitations from NGOs will appear here. Meanwhile, public campaigns are always open to apply."
            />
          ) : (
            pending.map((inv) => (
              <div key={inv.id} className="rounded-xl border p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {inv.campaign?.id ? (
                      <Link
                        href={`/volunteer/campaigns/${inv.campaign.id}`}
                        className="text-lg font-bold hover:text-primary hover:underline"
                      >
                        {inv.campaign.title ?? "Campaign"}
                      </Link>
                    ) : (
                      <p className="text-lg font-bold text-muted-foreground">Campaign unavailable</p>
                    )}
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {inv.campaign?.ngo?.org_name ?? "NGO"}
                      {inv.campaign?.ngo?.verification_status === "approved" ? (
                        <VerifiedBadge verified label="Verified NGO" />
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {inv.campaign?.location ? `${inv.campaign.location} · ` : ""}
                      {formatDate(inv.campaign?.start_date)} – {formatDate(inv.campaign?.end_date)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Invited {formatDateTime(inv.created_at)}
                    </p>
                  </div>
                  {inv.campaign ? <StatusBadge status={inv.campaign.status} /> : null}
                </div>
                {inv.campaign?.id ? (
                  <div className="mt-4">
                    <RespondInviteButtons
                      campaignId={inv.campaign.id}
                      inviteId={inv.id}
                    />
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    This campaign is no longer available, so the invite can no longer be answered.
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {answered.length > 0 ? (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Already answered</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-xl border">
              {answered.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    {inv.campaign?.id ? (
                      <Link
                        href={`/volunteer/campaigns/${inv.campaign.id}`}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {inv.campaign.title ?? "Campaign"}
                      </Link>
                    ) : (
                      <p className="truncate font-medium text-muted-foreground">
                        Campaign unavailable
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {inv.campaign?.ngo?.org_name ?? "NGO"} · invited {formatDateTime(inv.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
