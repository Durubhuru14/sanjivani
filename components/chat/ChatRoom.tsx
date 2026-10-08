"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { demoActive } from "@/lib/demo/flag";
import { messageSchema } from "@/lib/validation";
import type { Message, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

/**
 * Realtime message thread for one room (spec §18 step 8).
 * Reads/inserts run through the user's client so RLS scopes visibility;
 * new messages arrive via a Supabase Realtime channel for this room.
 *
 * Polish contract: one bubble anatomy for both sides — rounded-xl with the
 * corner toward the sender sharpened, max-w-[75%], px-3.5 py-2.5,
 * text-sm leading-relaxed, timestamp below the text aligned to the sender
 * side (text-[11px] tabular-nums). Strict space-y-4 rhythm, avatars h-8 w-8
 * top-aligned, composer input + send button both rounded-xl.
 */
export function ChatRoom({
  roomId,
  roomName,
  currentUserId,
  canSend = true,
  showRoomName = true,
  showMessageCount = true,
  className,
}: {
  roomId: string;
  roomName: string;
  currentUserId: string;
  canSend?: boolean;
  /** Render the room name as the card header's h2. Wrappers that already put
   *  the room name in their page-level PageHeader pass false so the name
   *  (and its heading semantics) appears exactly once per page. */
  showRoomName?: boolean;
  /** Render the live message count in the card header bar. Wrappers that put
   *  the count in their page-level PageHeader subtitle pass false so it is not
   *  shown twice; passing false with showRoomName=false hides the whole bar. */
  showMessageCount?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("messages")
      .select("*, sender:sender_id(id, name, avatar_url, role)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (err) {
      setError("Could not load messages. Please refresh the page.");
      return;
    }
    setMessages((data as Message[]) ?? []);
  }, [roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch resolves after the effect body returns
    void load();
    if (demoActive) {
      // no realtime in demo mode — poll for new messages instead
      const id = setInterval(() => void load(), 4000);
      return () => clearInterval(id);
    }
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row]
          );
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function send() {
    const parsed = messageSchema.safeParse({ text });
    if (!parsed.success) {
      toast({ title: "Message not sent", description: parsed.error.issues[0].message });
      return;
    }
    setSending(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("messages")
        .insert({ room_id: roomId, sender_id: currentUserId, text: parsed.data.text })
        .select("*, sender:sender_id(id, name, avatar_url, role)")
        .single();
      if (err) throw err;
      if (data) {
        setMessages((prev) =>
          prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]
        );
      }
      setText("");
    } catch (err) {
      toast({
        title: "Message not sent",
        description:
          err instanceof Error && /row-level security/i.test(err.message)
            ? "You are no longer a member of this room."
            : "Something went wrong. Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  const grouped = useMemo(() => {
    return messages.map((m, i) => {
      const prev = messages[i - 1];
      const sameSender =
        prev && prev.sender_id === m.sender_id && prev.sender?.name === m.sender?.name;
      return { message: m, compact: Boolean(sameSender) };
    });
  }, [messages]);

  return (
    <div className={cn("flex h-[calc(100vh-19rem)] min-h-96 flex-col rounded-md border bg-card", className)}>
      {showRoomName || showMessageCount ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          {showRoomName ? <h2 className="min-w-0 truncate font-semibold">{roomName}</h2> : null}
          {showMessageCount ? (
            <span
              className={cn(
                "shrink-0 tabular-nums text-muted-foreground",
                showRoomName ? "text-xs" : "text-sm font-medium"
              )}
            >
              {messages.length} message{messages.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-medium text-foreground">No messages yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Say hello — everyone in this room will see your message instantly.
            </p>
          </div>
        ) : (
          grouped.map(({ message, compact }) => {
            const mine = message.sender_id === currentUserId;
            const sender = (message.sender ?? {}) as Partial<Profile>;
            return (
              <div
                key={message.id}
                className={cn(
                  "animate-msg-in flex items-start gap-2.5",
                  mine ? "justify-end" : "justify-start"
                )}
              >
                {!mine ? (
                  compact ? (
                    <span className="w-8 shrink-0" aria-hidden />
                  ) : (
                    <UserAvatar
                      name={sender.name}
                      src={sender.avatar_url}
                      className="mt-0.5 h-8 w-8 shrink-0 text-[10px]"
                    />
                  )
                ) : null}
                <div
                  className={cn(
                    "max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                    mine
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-muted text-foreground"
                  )}
                >
                  {!mine && !compact ? (
                    <p className="mb-1 text-xs font-semibold text-primary">
                      {sender.name ?? "Member"}
                      {sender.role === "staff" ? " · staff" : ""}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                  <p
                    className={cn(
                      "mt-1 text-[11px] tabular-nums",
                      mine
                        ? "text-right text-primary-foreground/70"
                        : "text-left text-muted-foreground"
                    )}
                  >
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <div className="border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim() && !sending) void send();
                }
              }}
              placeholder="Write a message…"
              title="Enter to send · Shift+Enter for a new line"
              rows={1}
              className="max-h-32 min-h-11 resize-none rounded-xl"
              maxLength={2000}
              aria-label="Message"
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground" aria-hidden>
              Enter to send · Shift+Enter for a new line
            </span>
            {text.length > 1800 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {text.length}/2000
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          Read-only room
        </div>
      )}
    </div>
  );
}
