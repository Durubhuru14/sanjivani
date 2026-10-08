import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { RoomMembersManager } from "@/components/chat/RoomMembersManager";
import { DeleteRoomButton } from "./delete-room-button";
import type { ChatRoom as ChatRoomType, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NgoRoomPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>;
}) {
  const { id, roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roomRow } = await supabase
    .from("chat_rooms")
    .select("id, name, campaign_id, created_by")
    .eq("id", roomId)
    .limit(1)
    .maybeSingle();
  const room = roomRow as ChatRoomType | null;
  if (!room || room.campaign_id !== id) notFound();

  // owner check (RLS allows only the campaign owner or members anyway)
  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select("id, ngo_id, title")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow;
  if (!campaign || campaign.ngo_id !== user.id) notFound();

  const [{ data: membersData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("chat_room_members")
      .select("user_id, profile:profiles!chat_room_members_user_id_fkey(id, name, avatar_url)")
      .eq("room_id", roomId),
    supabase
      .from("teams")
      .select("*, team_members(*, profile:profiles!team_members_user_id_fkey(id, name, avatar_url))")
      .eq("campaign_id", id),
  ]);

  const members = (membersData ?? []) as unknown as Array<{
    user_id: string;
    profile?: { id: string; name: string | null };
  }>;
  const teams = (teamsData ?? []) as unknown as Team[];
  const teamMembers = teams.flatMap((t) => t.members ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/ngo/campaigns/${id}/chat`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> All rooms
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Room in “{campaign.title}” · {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RoomMembersManager
            roomId={roomId}
            members={members}
            teamMembers={teamMembers}
          />
          <DeleteRoomButton roomId={roomId} campaignId={id} />
        </div>
      </div>

      <ChatRoom roomId={roomId} roomName={room.name} currentUserId={user.id} />
    </div>
  );
}