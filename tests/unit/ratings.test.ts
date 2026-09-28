import { describe, expect, it } from "vitest";
import { averageScore, canRate, type RatingContext } from "@/lib/ratings";

const RATER = "11111111-1111-1111-1111-111111111111";
const RATEE = "22222222-2222-2222-2222-222222222222";

function ctx(overrides: Partial<RatingContext> = {}): RatingContext {
  return {
    campaignStatus: "completed",
    raterOnTeam: true,
    rateeOnTeam: true,
    raterId: RATER,
    rateeId: RATEE,
    alreadyRated: false,
    ...overrides,
  };
}

describe("rating eligibility (spec §12)", () => {
  it("allows a valid post-completion team rating", () => {
    const decision = canRate(ctx());
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBeUndefined();
  });

  it("blocks ratings while the campaign is not completed", () => {
    for (const status of ["upcoming", "ongoing", "cancelled"]) {
      const decision = canRate(ctx({ campaignStatus: status }));
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toMatch(/completed/i);
    }
  });

  it("blocks ratings when the rater is not on the team", () => {
    const decision = canRate(ctx({ raterOnTeam: false }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/served with/i);
  });

  it("blocks ratings when the ratee is not on the team", () => {
    const decision = canRate(ctx({ rateeOnTeam: false }));
    expect(decision.allowed).toBe(false);
  });

  it("blocks self ratings", () => {
    const decision = canRate(ctx({ rateeId: RATER }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/yourself/i);
  });

  it("blocks duplicate ratings for the same campaign", () => {
    const decision = canRate(ctx({ alreadyRated: true }));
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/already/i);
  });
});

describe("averageScore", () => {
  it("averages valid scores with two decimals", () => {
    expect(averageScore([5, 4, 4])).toBe(4.33);
    expect(averageScore([1, 2])).toBe(1.5);
    expect(averageScore([5])).toBe(5);
  });

  it("returns 0 for empty input", () => {
    expect(averageScore([])).toBe(0);
  });

  it("ignores out-of-range and non-finite scores", () => {
    expect(averageScore([5, 99, 0, Number.NaN, 3])).toBe(4);
  });
});
