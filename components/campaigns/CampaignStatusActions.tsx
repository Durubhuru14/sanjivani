"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Loader2, PlayCircle, Square, Trash2 } from "lucide-react";
import { setCampaignStatus, deleteCampaign } from "@/app/(ngo)/ngo/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { Campaign } from "@/lib/types";

const NEXT_STATUS: Record<string, Array<{ status: Campaign["status"]; label: string; icon: typeof PlayCircle; confirm?: boolean; destructive?: boolean }>> = {
  upcoming: [
    { status: "ongoing", label: "Mark ongoing", icon: PlayCircle },
    { status: "cancelled", label: "Cancel campaign", icon: Square, confirm: true, destructive: true },
  ],
  ongoing: [
    { status: "completed", label: "Mark completed", icon: Square, confirm: true },
    { status: "cancelled", label: "Cancel campaign", icon: Square, confirm: true, destructive: true },
  ],
  completed: [],
  cancelled: [],
};

export function CampaignStatusActions({ campaign }: { campaign: Campaign }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const options = NEXT_STATUS[campaign.status] ?? [];

  function runStatus(status: string, expected: string, label: string) {
    setBusy(true);
    startTransition(async () => {
      const res = await setCampaignStatus(campaign.id, status);
      setBusy(false);
      if (!res.ok) {
        toast({ title: "Could not update status", description: res.error });
        return;
      }
      toast({
        title: label,
        description:
          status === "completed"
            ? "Ratings are now open for your team and hours can be logged."
            : undefined,
      });
      router.refresh();
    });
  }

  async function exportCsv() {
    try {
      const res = await fetch(`/api/export/${campaign.id}`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast({ title: "Export failed", description: json?.error?.message ?? "Please try again." });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sanjivani-${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "CSV downloaded" });
    } catch {
      toast({ title: "Export failed", description: "Network error — please try again." });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" className="gap-2" onClick={() => void exportCsv()}>
        <Download className="h-4 w-4" aria-hidden /> Export CSV
      </Button>

      {options.map((opt) =>
        opt.confirm ? (
          <AlertDialog key={opt.status}>
            <AlertDialogTrigger asChild>
              <Button
                variant={opt.destructive ? "outline" : "default"}
                className={opt.destructive ? "gap-2 text-destructive hover:text-destructive" : "gap-2"}
                disabled={busy || pending}
              >
                <opt.icon className="h-4 w-4" aria-hidden /> {opt.label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {opt.destructive ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
                      Cancel this campaign?
                    </>
                  ) : (
                    `Mark “${campaign.title}” as ${opt.status}?`
                  )}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {opt.status === "completed"
                    ? "This unlocks ratings for everyone on the team and lets you log volunteer hours. This cannot be undone lightly — only continue when the work is truly finished."
                    : opt.status === "cancelled"
                      ? "The campaign will be hidden from browse and no further applications are possible. Team history is preserved."
                      : `The campaign status will change to ${opt.status}.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep as is</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => runStatus(opt.status, campaign.status, opt.label)}
                >
                  Yes, continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            key={opt.status}
            className="gap-2"
            disabled={busy || pending}
            onClick={() => runStatus(opt.status, campaign.status, opt.label)}
          >
            {busy || pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <opt.icon className="h-4 w-4" aria-hidden />
            )}
            {opt.label}
          </Button>
        )
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" className="gap-2 text-destructive hover:text-destructive" aria-label="Delete campaign">
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{campaign.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the campaign with its teams, chat rooms, applications,
              and fund records. Consider cancelling instead — cancelling keeps the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep campaign</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void deleteCampaign(campaign.id)}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
