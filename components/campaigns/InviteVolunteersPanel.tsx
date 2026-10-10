"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { useToast } from "@/hooks/use-toast";
import type { CampaignInvite } from "@/lib/types";

interface SearchHit {
  profile_id: string;
  name: string | null;
  location: string | null;
  skills: string[] | null;
  verification_status: string;
  avg_rating?: number | null;
  avatar_url?: string | null;
}

/**
 * Invite Volunteers panel for type = 'invite' campaigns (spec §5).
 * Searches volunteers and creates campaign_invites rows.
 */
export function InviteVolunteersPanel({
  campaignId,
  invites,
}: {
  campaignId: string;
  invites: CampaignInvite[];
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: query.trim(), campaignId });
      const res = await fetch(`/api/campaigns/${campaignId}/invites?${params}`);
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Search failed", description: json.error?.message });
        return;
      }
      setHits(json.data.volunteers ?? []);
    } catch {
      toast({ title: "Search failed", description: "Network error — please try again." });
    } finally {
      setSearching(false);
    }
  }

  async function invite(volunteerId: string, name: string) {
    setInviting(volunteerId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volunteer_id: volunteerId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast({ title: "Invite not sent", description: json.error?.message });
        return;
      }
      toast({ title: "Invitation sent", description: `${name} can accept from their invites page.` });
      setHits((prev) => prev?.filter((h) => h.profile_id !== volunteerId) ?? null);
      router.refresh();
    } catch {
      toast({ title: "Invite not sent", description: "Network error — please try again." });
    } finally {
      setInviting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <label htmlFor="vol-search" className="text-sm font-medium">
              Search volunteers
            </label>
            <Input
              id="vol-search"
              placeholder="Name or skill, e.g. Priya or First Aid"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void search();
              }}
            />
          </div>
          <Button className="ml-auto gap-2" onClick={() => void search()} disabled={searching}>
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            Search
          </Button>
        </div>

        {hits ? (
          <div className="mt-4 space-y-2">
            {hits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No volunteers matched “{query}”.
              </p>
            ) : (
              hits.map((v) => (
                <div
                  key={v.profile_id}
                  className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2.5"
                >
                  <UserAvatar name={v.name} src={v.avatar_url} className="h-9 w-9 text-xs" />
                  <div className="row-body">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      {v.name ?? "Volunteer"}
                      {v.verification_status === "approved" ? (
                        <VerifiedBadge verified label="Verified volunteer" />
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(v.skills ?? []).slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-2 sm:shrink-0">
                    {Number(v.avg_rating ?? 0) > 0 ? (
                      <StarsDisplay score={Number(v.avg_rating)} size="sm" />
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={inviting === v.profile_id}
                      onClick={() => void invite(v.profile_id, v.name ?? "Volunteer")}
                    >
                      {inviting === v.profile_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Send className="h-3.5 w-3.5" aria-hidden />
                      )}
                      Invite
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Search by name or skill — only volunteers are shown, and each person can only have
            one pending invite per campaign.
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Sent invitations</h3>
        {invites.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No invitations yet"
            hint="Search above and invite the volunteers you trust."
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {invites.map((inv) => (
              <li key={inv.id} className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                <div className="row-body">
                  <p className="truncate font-medium">{inv.volunteer?.name ?? "Volunteer"}</p>
                  {(inv.volunteer?.volunteers?.skills ?? []).length > 0 ? (
                    <p className="truncate text-sm text-muted-foreground">
                      {(inv.volunteer?.volunteers?.skills ?? []).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2 max-sm:justify-start sm:shrink-0 sm:justify-end">
                  <StatusBadge status={inv.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
