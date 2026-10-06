"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, Users } from "lucide-react";
import { chatRoomSchema } from "@/lib/validation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Name a room + multi-select team members to add (spec §4 CreateRoomDialog).
 */
export function CreateRoomDialog({
  campaignId,
  teamMembers,
}: {
  campaignId: string;
  teamMembers: TeamMember[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const selectedCount = Object.values(selected).filter(Boolean).length;

  async function create() {
    setFieldError(null);
    const member_ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const parsed = chatRoomSchema.safeParse({ name, campaign_id: campaignId, member_ids });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!json.success) {
        setFieldError(json.error?.message ?? "Could not create the room.");
        return;
      }
      toast({ title: "Room created", description: `“${parsed.data.name}” is ready.` });
      setOpen(false);
      setName("");
      setSelected({});
      router.push(`/ngo/campaigns/${campaignId}/chat/${json.data.roomId}`);
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
        <Button className="gap-2">
          <MessageSquarePlus className="h-4 w-4" aria-hidden /> New room
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a chat room</DialogTitle>
          <DialogDescription>
            Name the room and pick who joins. Only the people you pick can see it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room name</Label>
            <Input
              id="room-name"
              placeholder="Planning Room"
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Room members</Label>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" aria-hidden /> {selectedCount} selected
              </span>
            </div>
            {teamMembers.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                No team members yet — build your campaign team first.
              </p>
            ) : (
              <ScrollArea className="h-56 rounded-lg border p-2">
                <div className="space-y-1">
                  {teamMembers.map((m) => (
                    <label
                      key={m.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted",
                        selected[m.user_id] && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={Boolean(selected[m.user_id])}
                        onCheckedChange={(v) =>
                          setSelected((s) => ({ ...s, [m.user_id]: v === true }))
                        }
                      />
                      <UserAvatar name={m.profile?.name} src={m.profile?.avatar_url} className="h-7 w-7 text-[10px]" />
                      <span className="flex-1 text-sm font-medium">
                        {m.profile?.name ?? "Member"}
                      </span>
                      <Badge variant="outline" className="capitalize text-xs">
                        {m.member_type}
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {fieldError && (
            <p className="text-sm text-destructive" role="alert">
              {fieldError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void create()} disabled={busy || teamMembers.length === 0}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Create room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
