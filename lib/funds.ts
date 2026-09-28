/**
 * Fund ledger arithmetic (spec §12: amount > 0 and <= remaining budget;
 * remaining budget never goes negative).
 * Pure helpers — used by the UI before insert and by unit tests.
 */

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface BudgetState {
  total: number;
  remaining: number;
}

export function canAllocate(state: BudgetState, amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  return amount > 0 && round2(amount) <= round2(state.remaining);
}

export function remainingAfter(state: BudgetState, amount: number): number {
  // Callers should check canAllocate() first; this never returns a negative number.
  return Math.max(0, round2(state.remaining - amount));
}

export function allocatedOf(state: BudgetState): number {
  return round2(Math.max(0, state.total - state.remaining));
}

export function budgetProgress(state: BudgetState): number {
  if (state.total <= 0) return 0;
  return Math.min(100, Math.round((allocatedOf(state) / state.total) * 100));
}

export function sumAllocations(amounts: number[]): number {
  return round2(amounts.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0));
}

export function formatMoney(n: number): string {
  return `₹${round2(Number.isFinite(n) ? n : 0).toLocaleString("en-IN")}`;
}
