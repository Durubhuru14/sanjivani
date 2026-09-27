"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { claimStaffInvite } from "@/app/(volunteer)/volunteer/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ClaimInviteButton() {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function claim() {
    setBusy(true);
    setError(null);
    startTransition(async () => {
      const res = await claimStaffInvite();
      setBusy(false);
      if (!res.ok) {
        setError(res.error ?? "Could not claim the invite.");
        return;
      }
      toast({ title: "Welcome to the team!", description: "Your staff account is now active." });
      router.push(res.redirect ?? "/staff");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button className="w-full gap-2" onClick={claim} disabled={busy || pending}>
        {busy || pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <UserCheck className="h-4 w-4" aria-hidden />
        )}
        Accept and become staff
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
