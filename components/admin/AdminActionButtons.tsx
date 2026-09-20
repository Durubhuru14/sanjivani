"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldBan, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

async function callAdminApi(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function AdminActionButton({
  path,
  profileId,
  label,
  icon: Icon = Check,
  variant = "outline",
  confirmText,
  successTitle,
}: {
  path: string;
  profileId: string;
  label: string;
  icon?: typeof Check;
  variant?: "default" | "outline" | "ghost" | "destructive";
  confirmText?: string;
  successTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const json = await callAdminApi(path, { profileId });
      if (!json.success) {
        toast({ title: "Action failed", description: json.error?.message });
        return;
      }
      toast({ title: successTitle });
      router.refresh();
    } catch {
      toast({ title: "Action failed", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant={variant} className="gap-1.5" onClick={() => void run()} disabled={busy}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </Button>
  );
}

export function ReportStatusButton({
  reportId,
  status,
  label,
  icon: Icon,
  className,
}: {
  reportId: string;
  status: "reviewed" | "dismissed";
  label: string;
  icon: typeof Check;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function run() {
    setBusy(true);
    try {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      const { error } = await supabase
        .from("volunteer_reports")
        .update({ status })
        .eq("id", reportId);
      if (error) throw error;
      toast({ title: `Report marked ${status}` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not update report",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("gap-1.5", className)}
      onClick={() => void run()}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </Button>
  );
}

export function SuspendToggle({
  profileId,
  suspended,
  name,
}: {
  profileId: string;
  suspended: boolean;
  name: string;
}) {
  return suspended ? (
    <AdminActionButton
      path="/api/admin/unsuspend"
      profileId={profileId}
      label="Unsuspend"
      icon={ShieldCheck}
      successTitle={`${name} can sign in again — their data was preserved.`}
    />
  ) : (
    <AdminActionButton
      path="/api/admin/suspend"
      profileId={profileId}
      label="Suspend"
      icon={ShieldBan}
      variant="destructive"
      confirmText={`Suspend ${name}? They will be signed out and blocked from all writes. Nothing is deleted.`}
      successTitle={`${name} has been suspended.`}
    />
  );
}
