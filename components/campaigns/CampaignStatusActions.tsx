"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Download, Loader2, MessageSquare, PlayCircle, Square, Trash2 } from "lucide-react";
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

/** Campaign status toolbar (spec §5 Campaign Manage). Two groups: the primary
 *  status transition on the left, secondary + destructive actions right. */
export function CampaignStatusActions({ campaign }: { campaign: Campaign }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const options = NEXT_STATUS[campaign.status] ?? [];
  const primary = options.find((opt) => !opt.destructive);
  const destructive = options.filter((opt) => opt.destructive);

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
    <div className="flex flex-wrap items-center gap-3">
      {/* left — primary status transition */}
      {primary ? (
        primary.confirm ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="gap-2" disabled={busy || pending}>
                <primary.icon className="h-4 w-4" aria-hidden /> {primary.label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Mark “{campaign.title}” as {primary.status}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {primary.status === "completed"
                    ? "This unlocks ratings for everyone on the team and lets you log volunteer hours. This cannot be undone lightly — only continue when the work is truly finished."
                    : `The campaign status will change to ${primary.status}.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep as is</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => runStatus(primary.status, campaign.status, primary.label)}
                >
                  Yes, continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            className="gap-2"
            disabled={busy || pending}
            onClick={() => runStatus(primary.status, campaign.status, primary.label)}
          >
            {busy || pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <primary.icon className="h-4 w-4" aria-hidden />
            )}
            {primary.label}
          </Button>
        )
      ) : null}

      {/* right — secondary tools, then a separated destructive cluster */}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={() => void exportCsv()}>
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href={`/ngo/campaigns/${campaign.id}/chat`}>
            <MessageSquare className="h-4 w-4" aria-hidden /> Chat rooms
          </Link>
        </Button>

        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

        {destructive.map((opt) => (
          <AlertDialog key={opt.status}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy || pending}
              >
                <opt.icon className="h-4 w-4" aria-hidden /> {opt.label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
                  Cancel this campaign?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The campaign will be hidden from browse and no further applications are
                  possible. Team history is preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep as is</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => runStatus(opt.status, campaign.status, opt.label)}
                >
                  Yes, continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}

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
    </div>
  );
}
