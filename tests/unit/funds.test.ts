import { describe, expect, it } from "vitest";
import {
  allocatedOf,
  budgetProgress,
  canAllocate,
  formatMoney,
  remainingAfter,
  round2,
  sumAllocations,
} from "@/lib/funds";

describe("fund arithmetic (spec §12: amount > 0 and ≤ remaining; never negative)", () => {
  it("allows allocations up to the remaining budget", () => {
    const state = { total: 50000, remaining: 46500 };
    expect(canAllocate(state, 1)).toBe(true);
    expect(canAllocate(state, 46500)).toBe(true);
  });

  it("rejects allocations exceeding the remaining budget", () => {
    const state = { total: 50000, remaining: 46500 };
    expect(canAllocate(state, 46500.01)).toBe(false);
    expect(canAllocate(state, 999999)).toBe(false);
  });

  it("rejects zero and negative allocations", () => {
    const state = { total: 1000, remaining: 1000 };
    expect(canAllocate(state, 0)).toBe(false);
    expect(canAllocate(state, -5)).toBe(false);
  });

  it("rejects non-finite amounts", () => {
    const state = { total: 1000, remaining: 1000 };
    expect(canAllocate(state, Number.NaN)).toBe(false);
    expect(canAllocate(state, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("remainingAfter never returns a negative number", () => {
    const state = { total: 100, remaining: 30 };
    expect(remainingAfter(state, 30)).toBe(0);
    expect(remainingAfter(state, 100)).toBe(0); // guard against misuse
    expect(remainingAfter({ total: 100, remaining: 30 }, 10)).toBe(20);
  });

  it("allocatedOf is total - remaining", () => {
    expect(allocatedOf({ total: 50000, remaining: 46500 })).toBe(3500);
    expect(allocatedOf({ total: 0, remaining: 0 })).toBe(0);
  });

  it("budgetProgress is capped at 100 and zero for empty budgets", () => {
    expect(budgetProgress({ total: 200, remaining: 0 })).toBe(100);
    expect(budgetProgress({ total: 0, remaining: 0 })).toBe(0);
    expect(budgetProgress({ total: 400, remaining: 100 })).toBe(75);
  });

  it("sumAllocations adds amounts and ignores non-finite values", () => {
    expect(sumAllocations([1500, 2000])).toBe(3500);
    expect(sumAllocations([10, Number.NaN, 5])).toBe(15);
    expect(sumAllocations([])).toBe(0);
  });

  it("round2 keeps two decimal places", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(100.005)).toBe(100.01);
  });

  it("formatMoney renders Indian currency grouping", () => {
    expect(formatMoney(50000)).toBe("₹50,000");
    expect(formatMoney(Number.NaN)).toBe("₹0");
  });
});
