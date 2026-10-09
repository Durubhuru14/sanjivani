import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function StaffRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: room } = await supabase
    .from("chat_rooms")
    .select("id, name, campaign_id, campaigns!inner(title)")
    .eq("id", roomId)
    .limit(1)
    .maybeSingle();
  if (!room) notFound();

  // explicit membership guard — mirrors the chat_room_members RLS policy
  // so non-members are blocked here exactly like the policy blocks them
  const { count: memberCount } = await supabase
    .from("chat_room_members")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  if (!memberCount) notFound();

  const { count: messageCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  const messages = messageCount ?? 0;

  const roomData = room as unknown as {
    id: string;
    name: string;
    campaign_id: string;
    campaigns: { title: string };
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        backHref="/staff"
        backLabel="Dashboard"
        title={roomData.name}
        subtitle={`Room for “${roomData.campaigns.title}” · ${messages} message${messages === 1 ? "" : "s"}`}
      />
      <ChatRoom
        roomId={roomId}
        roomName={roomData.name}
        currentUserId={user.id}
        showRoomName={false}
        showMessageCount={false}
      />
    </div>
  );
}
