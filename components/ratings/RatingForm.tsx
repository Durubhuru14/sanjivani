"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ratingSchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Rating } from "@/lib/types";

/**
 * Post-completion rating form (spec §4 RatingForm, §18 step 13).
 * Eligibility is validated client-side, via RLS, and by the DB trigger.
 */
export function RatingForm({
  campaignId,
  rateeId,
  rateeName,
  myRating,
  canRate,
  reason,
}: {
  campaignId: string;
  rateeId: string;
  rateeName: string;
  myRating: Rating | null;
  canRate: boolean;
  reason?: string;
}) {
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  if (myRating) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Your rating for {rateeName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Stars score={myRating.score} />
          {myRating.comment ? (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              “{myRating.comment}”
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (!canRate) {
    return (
      <Card className="shadow-soft border-dashed">
        <CardHeader>
          <CardTitle>Rate {rateeName}</CardTitle>
          <CardDescription>{reason ?? "Rating is not available for this campaign yet."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function submit() {
    const parsed = ratingSchema.safeParse({ score, comment });
    if (!parsed.success) {
      toast({ title: "Pick a score", description: parsed.error.issues[0].message });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("ratings").insert({
        campaign_id: campaignId,
        from_user_id: (await supabase.auth.getUser()).data.user?.id,
        to_user_id: rateeId,
        score: parsed.data.score,
        comment: parsed.data.comment || null,
      });
      if (error) throw error;
      toast({ title: "Rating submitted", description: `You rated ${rateeName} ${score} out of 5.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not submit",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Rate {rateeName}</CardTitle>
        <CardDescription>Ratings are public and appear on their profile.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Score</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Score">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={score === value}
                aria-label={`${value} star${value > 1 ? "s" : ""}`}
                className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseEnter={() => setHover(value)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setScore(value)}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-transform hover:scale-110",
                    (hover || score) >= value
                      ? "fill-kinpaku text-kinpaku"
                      : "fill-muted text-muted"
                  )}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rating-comment">Comment (optional)</Label>
          <Textarea
            id="rating-comment"
            placeholder={`How was working with ${rateeName}?`}
            value={comment}
            maxLength={500}
            rows={3}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <Button onClick={() => void submit()} disabled={busy || score === 0} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Submit rating
        </Button>
      </CardContent>
    </Card>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`You rated ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "h-5 w-5",
            value <= score ? "fill-kinpaku text-kinpaku" : "fill-muted text-muted"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}
