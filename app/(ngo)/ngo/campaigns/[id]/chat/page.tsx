import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomList } from "@/components/chat/RoomList";
import { CreateRoomDialog } from "@/components/chat/CreateRoomDialog";
import type { ChatRoom, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select("id, title, ngo_id")
    .eq("id", id)
    .limit(1)
    .maybeSingle();
  const campaign = campaignRow;
  if (!campaign || campaign.ngo_id !== user.id) notFound();

  const [{ data: roomsData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select("*, chat_room_members(user_id)")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("teams")
      .select("*, team_members(*, profile:profiles!team_members_user_id_fkey(id, name, avatar_url))")
      .eq("campaign_id", id),
  ]);

  const rooms = (roomsData ?? []) as unknown as ChatRoom[];
  const teams = (teamsData ?? []) as unknown as Team[];
  const teamMembers = teams.flatMap((t) => t.members ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Chat rooms</h1>
          <p className="mt-1 text-muted-foreground">
            Rooms for “{campaign.title}”. Only the members you pick can see each room.
          </p>
        </div>
        <CreateRoomDialog campaignId={id} teamMembers={teamMembers} />
      </div>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-primary" aria-hidden /> Rooms
          </CardTitle>
          <CardDescription>
            Create one room per topic — planning, field updates, logistics — and pick who
            belongs in each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoomList rooms={rooms} basePath={`/ngo/campaigns/${id}/chat/`} />
        </CardContent>
      </Card>
    </div>
  );
}
