"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MessagesSquare, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { formatDateTime } from "@/lib/format";
import type { ChatRoom } from "@/lib/types";

/** Rooms within a campaign (spec §4 RoomList). One row per room, shared list
 *  anatomy: room name + icon left, member count / created timestamp / delete
 *  action in the right cluster. */
export function RoomList({
  rooms,
  basePath,
}: {
  rooms: ChatRoom[];
  basePath: string;
}) {
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="No chat rooms yet"
        hint="Create a room and pick team members — each room stays private to its members."
      />
    );
  }
  return (
    <ul className="divide-y rounded-xl border">
      {rooms.map((room) => (
        <li
          key={room.id}
          className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <Link
            href={`${basePath}${room.id}`}
            className="group flex row-body items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-leaf/25 bg-tint text-leaf">
              <MessagesSquare className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 truncate font-semibold group-hover:text-primary">
              {room.name}
            </span>
          </Link>
          <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:justify-start sm:shrink-0 sm:justify-end">
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <UserRound className="h-3 w-3" aria-hidden />
              {room.members?.length ?? 0}
            </span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              Created {formatDateTime(room.created_at)}
            </span>
            <DeleteRoomRowButton room={room} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Row-level delete (same API as the room page's DeleteRoomButton). */
function DeleteRoomRowButton({ room }: { room: ChatRoom }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function remove() {
    if (!window.confirm(`Delete the room “${room.name}”? Messages cannot be recovered afterwards.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/chat/rooms/${room.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Could not delete room", description: json.error?.message });
        return;
      }
      toast({ title: "Room deleted" });
      router.refresh();
    } catch {
      toast({ title: "Could not delete room", description: "Network error — please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => void remove()}
      disabled={busy}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      Delete
    </Button>
  );
}
