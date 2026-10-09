"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { decideApplication } from "@/app/(ngo)/ngo/actions";
import { runServerAction } from "@/lib/client-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { Application, Campaign } from "@/lib/types";

/** Accept / reject applications for the campaign owner (spec §5).
 *  The decision row carries every trust signal the spec exposes — skills,
 *  availability, verification badge, public rating, and when they applied —
 *  so accept/reject is an informed decision, not a name match. */
export function ApplicationsPanel({
  applications,
  campaignStatus,
}: {
  applications: Application[];
  campaignStatus: Campaign["status"];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const decided = campaignStatus === "completed" || campaignStatus === "cancelled";

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No applications yet"
        hint="Public campaigns collect applications automatically — invite-only campaigns use the invite panel instead."
      />
    );
  }

  function decide(app: Application, decision: "accepted" | "rejected") {
    if (decision === "rejected") {
      const ok = window.confirm(
        `Decline ${app.volunteer?.name ?? "this volunteer"}'s application? They will be notified.`
      );
      if (!ok) return;
    }
    setBusyId(app.id);
    startTransition(async () => {
      const res = await runServerAction(() => decideApplication(app.id, decision));
      setBusyId(null);
      if (!res.ok) {
        toast({ title: "Could not update application", description: res.error });
        return;
      }
      toast({
        title:
          decision === "accepted"
            ? `Accepted — ${app.volunteer?.name ?? "volunteer"} can now be added to a team.`
            : `Application declined.`,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {decided ? (
        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          This campaign is {campaignStatus} — pending applications can no longer be decided.
        </p>
      ) : null}
      <ul className="divide-y rounded-xl border">
        {applications.map((app) => {
          const vol = app.volunteer;
          const rating = Number(vol?.volunteers?.avg_rating ?? 0);
          return (
            <li
              key={app.id}
              className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3"
            >
              <UserAvatar name={vol?.name} src={vol?.avatar_url} className="h-9 w-9 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{vol?.name ?? "Volunteer"}</p>
                  {vol?.volunteers?.verification_status === "approved" ? (
                    <VerifiedBadge verified />
                  ) : vol?.volunteers?.verification_status === "pending" ? (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Pending verification
                    </Badge>
                  ) : null}
                  {rating > 0 ? <StarsDisplay score={rating} size="sm" /> : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(vol?.volunteers?.skills ?? []).slice(0, 4).map((skill) => (
                    <Badge key={skill} variant="secondary" className="font-normal">
                      {skill}
                    </Badge>
                  ))}
                  {vol?.volunteers?.availability ? (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      {vol.volunteers.availability}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Applied {formatDateTime(app.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {app.status === "pending" ? (
                  decided ? (
                    <StatusBadge status="pending" />
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={busyId === app.id || pending}
                        onClick={() => decide(app, "accepted")}
                      >
                        {busyId === app.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={busyId === app.id || pending}
                        onClick={() => decide(app, "rejected")}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden /> Reject
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <StatusBadge status={app.status} />
                    {app.status === "accepted" ? (
                      <span className="text-xs text-muted-foreground">assignable to team</span>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
