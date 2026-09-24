"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/** Search/filter controls for Browse Campaigns (spec §5). */
export function BrowseSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "all";

  function apply(next: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.trim());
      else params.delete("q");
    }
    if (next.status !== undefined) {
      if (next.status === "all") params.delete("status");
      else params.set("status", next.status);
    }
    router.replace(`/volunteer/browse${params.size > 0 ? `?${params}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form
        className="flex min-w-56 flex-1 items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search by title, location, or NGO"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search campaigns"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {searchParams.get("q") ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => {
              setQ("");
              apply({ q: "" });
            }}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </form>
      <Select value={status} onValueChange={(v) => apply({ status: v })}>
        <SelectTrigger className="w-40" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="upcoming">Upcoming</SelectItem>
          <SelectItem value="ongoing">Ongoing</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
