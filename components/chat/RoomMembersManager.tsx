"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/lib/types";

/** Add/remove members in an existing room (spec §8 chat room members). */
export function RoomMembersManager({
  roomId,
  campaignId,
  members,
  teamMembers,
}: {
  roomId: string;
  campaignId: string;
  members: Array<{ user_id: string; profile?: { name: string | null } }>;
  teamMembers: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const memberIds = new Set(members.map((m) => m.user_id));
  const candidates = teamMembers.filter((m) => !memberIds.has(m.user_id));

  async function applyChanges(add: string[], remove: string[]) {
    if (add.length === 0 && remove.length === 0) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ add, remove }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Could not update members", description: json.error?.message });
        return;
      }
      toast({ title: "Room updated" });
      setOpen(false);
      setSelected({});
      router.refresh();
    } catch {
      toast({ title: "Could not update members", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" aria-hidden /> Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage room members</DialogTitle>
          <DialogDescription>
            Untick to remove, tick new people to add. Members must be on the campaign team.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-64 rounded-lg border p-2">
          <div className="space-y-1">
            {teamMembers.map((m) => {
              const isMember = memberIds.has(m.user_id);
              const name = m.profile?.name ?? "Member";
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  {isMember ? (
                    <>
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => void applyChanges([], [m.user_id])}
                        aria-label={`Remove ${name}`}
                      />
                      <span className="flex-1 text-sm font-medium line-through decoration-muted-foreground/50">
                        {name}
                      </span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {m.member_type}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label={`Remove ${name}`}
                        disabled={busy}
                        onClick={() => void applyChanges([], [m.user_id])}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </>
                  ) : (
                    <label className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg px-2 py-2">
                      <Checkbox
                        checked={Boolean(selected[m.user_id])}
                        onCheckedChange={(v) =>
                          setSelected((s) => ({ ...s, [m.user_id]: v === true }))
                        }
                      />
                      <span className="flex-1 text-sm font-medium">{name}</span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {m.member_type}
                      </Badge>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Close
          </Button>
          <Button
            disabled={busy || Object.values(selected).every((v) => !v)}
            onClick={() =>
              void applyChanges(
                Object.entries(selected)
                  .filter(([, v]) => v)
                  .map(([k]) => k),
                []
              )
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Add selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
