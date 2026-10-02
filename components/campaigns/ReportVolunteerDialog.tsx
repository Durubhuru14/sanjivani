"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { volunteerReportSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

/** NGO reports a volunteer for misconduct (spec §1 / §8). */
export function ReportVolunteerDialog({
  volunteerId,
  campaignId,
  volunteerName,
}: {
  volunteerId: string;
  campaignId: string;
  volunteerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function submit() {
    const parsed = volunteerReportSchema.safeParse({
      volunteer_id: volunteerId,
      campaign_id: campaignId,
      reason,
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reports/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        setFieldError(json.error?.message ?? "Could not submit the report.");
        return;
      }
      toast({
        title: "Report submitted",
        description: "An administrator will review it in the reports queue.",
      });
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setFieldError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
          <Flag className="h-3.5 w-3.5" aria-hidden /> Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report {volunteerName}</DialogTitle>
          <DialogDescription>
            Reports are visible only to platform administrators. They are meant for serious
            conduct issues, not performance nits — use ratings for those.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="report-reason">What happened?</Label>
          <Textarea
            id="report-reason"
            placeholder="Describe the issue factually…"
            rows={5}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(fieldError)}
          />
          {fieldError && (
            <p className="text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          )}
          <p className="text-right text-xs text-muted-foreground">{reason.length}/1000</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
