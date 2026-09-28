/**
 * Rating eligibility logic (spec §12: only after campaign completion,
 * rater and ratee shared a campaign team, no self or duplicate ratings).
 * Pure helpers — used by the UI and by unit tests.
 */

export interface RatingContext {
  campaignStatus: string;
  raterOnTeam: boolean;
  rateeOnTeam: boolean;
  raterId: string;
  rateeId: string;
  alreadyRated: boolean;
}

export interface RatingDecision {
  allowed: boolean;
  reason?: string;
}

export function canRate(ctx: RatingContext): RatingDecision {
  if (ctx.raterId === ctx.rateeId) {
    return { allowed: false, reason: "You cannot rate yourself." };
  }
  if (ctx.campaignStatus !== "completed") {
    return { allowed: false, reason: "Ratings open once the campaign is completed." };
  }
  if (!ctx.raterOnTeam || !ctx.rateeOnTeam) {
    return { allowed: false, reason: "You can only rate people you served with on this campaign." };
  }
  if (ctx.alreadyRated) {
    return { allowed: false, reason: "You have already submitted a rating for this campaign." };
  }
  return { allowed: true };
}

export function averageScore(scores: number[]): number {
  const valid = scores.filter((s) => Number.isFinite(s) && s >= 1 && s <= 5);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}
