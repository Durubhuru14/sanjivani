"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { decideApplication } from "@/app/(ngo)/ngo/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import type { Application } from "@/lib/types";

/** Accept / reject applications for the campaign owner (spec §5). */
export function ApplicationsPanel({ applications }: { applications: Application[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (applications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        No volunteer applications yet. Public campaigns collect applications automatically —
        invite-only campaigns use the invite panel instead.
      </p>
    );
  }

  function decide(app: Application, decision: "accepted" | "rejected") {
    setBusyId(app.id);
    startTransition(async () => {
      const res = await decideApplication(app.id, decision);
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
    <ul className="divide-y rounded-xl border">
      {applications.map((app) => (
        <li key={app.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <UserAvatar name={app.volunteer?.name} src={app.volunteer?.avatar_url} className="h-9 w-9 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{app.volunteer?.name ?? "Volunteer"}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(app.volunteer?.volunteers?.skills ?? []).slice(0, 4).map((skill) => (
                <Badge key={skill} variant="secondary" className="font-normal">
                  {skill}
                </Badge>
              ))}
              {app.volunteer?.volunteers?.availability ? (
                <Badge variant="outline" className="font-normal text-muted-foreground">
                  {app.volunteer.volunteers.availability}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {app.status === "pending" ? (
              <>
                <Button
                  size="sm"
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
                  className="gap-1.5"
                  disabled={busyId === app.id || pending}
                  onClick={() => decide(app, "rejected")}
                >
                  <X className="h-3.5 w-3.5" aria-hidden /> Reject
                </Button>
              </>
            ) : (
              <Badge
                variant={app.status === "accepted" ? "default" : "outline"}
                className={app.status === "accepted" ? "" : "text-muted-foreground"}
              >
                {app.status === "accepted" ? "Accepted — assignable to team" : "Rejected"}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
