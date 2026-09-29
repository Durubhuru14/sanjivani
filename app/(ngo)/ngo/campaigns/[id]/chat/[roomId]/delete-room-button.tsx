"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function DeleteRoomButton({ roomId, campaignId }: { roomId: string; campaignId: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function remove() {
    if (!window.confirm("Delete this room? Messages cannot be recovered afterwards.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Could not delete room", description: json.error?.message });
        return;
      }
      toast({ title: "Room deleted" });
      router.push(`/ngo/campaigns/${campaignId}/chat`);
      router.refresh();
    } catch {
      toast({ title: "Could not delete room", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      className="gap-2 text-destructive hover:text-destructive"
      onClick={() => void remove()}
      disabled={busy}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
      Delete room
    </Button>
  );
}
