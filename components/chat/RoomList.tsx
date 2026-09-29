import Link from "next/link";
import { MessagesSquare, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import type { ChatRoom } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

/** Rooms within a campaign (spec §4 RoomList). Rendered server-side. */
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <Link
          key={room.id}
          href={`${basePath}${room.id}`}
          className="group block focus-visible:outline-none"
        >
          <Card className="h-full border-border/80 shadow-soft transition-all group-hover:-translate-y-0.5 group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-ring">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 font-semibold group-hover:text-primary">
                  {room.name}
                </h3>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  <UserRound className="h-3 w-3" aria-hidden />
                  {room.members?.length ?? 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Created {formatDateTime(room.created_at)}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
