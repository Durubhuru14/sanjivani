"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Send } from "lucide-react";
import { applyToCampaign } from "@/app/(volunteer)/volunteer/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ApplyButton({ campaignId }: { campaignId: string }) {
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function apply() {
    setBusy(true);
    startTransition(async () => {
      const res = await applyToCampaign(campaignId);
      setBusy(false);
      if (!res.ok) {
        toast({ title: "Could not apply", description: res.error });
        return;
      }
      toast({
        title: "Application sent",
        description: "You will get a notification as soon as the NGO responds.",
      });
      router.refresh();
    });
  }

  return (
    <Button className="gap-2" onClick={apply} disabled={busy || pending}>
      {busy || pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Send className="h-4 w-4" aria-hidden />
      )}
      Apply to join
    </Button>
  );
}

export function RespondInviteButtons({
  campaignId,
  inviteId,
}: {
  campaignId: string;
  inviteId: string;
}) {
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function respond(action: "accept" | "decline") {
    setBusy(action);
    try {
      const res = await fetch(
        `/api/campaigns/${campaignId}/invites/${inviteId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Could not respond", description: json.error?.message });
        return;
      }
      toast({
        title: action === "accept" ? "Invitation accepted" : "Invitation declined",
        description:
          action === "accept"
            ? "Your application is already marked accepted — the NGO can now add you to the team."
            : undefined,
      });
      router.refresh();
    } catch {
      toast({ title: "Could not respond", description: "Network error — please try again." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button className="gap-2" onClick={() => void respond("accept")} disabled={busy !== null}>
        {busy === "accept" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Check className="h-4 w-4" aria-hidden />
        )}
        Accept invite
      </Button>
      <Button variant="outline" onClick={() => void respond("decline")} disabled={busy !== null}>
        Decline
      </Button>
    </div>
  );
}
