"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeIndianRupee, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fundAllocationSchema } from "@/lib/validation";
import { canAllocate, formatMoney, budgetProgress, round2, type BudgetState } from "@/lib/funds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import type { Campaign, FundAllocation, TeamMember } from "@/lib/types";

/**
 * Fund ledger (spec §18 step 10): allocate / track / mark paid.
 * Inserts run through the NGO owner's client; the database trigger
 * validates the budget and keeps remaining_budget consistent.
 */
export function FundLedger({
  campaign,
  allocations,
  teamMembers,
}: {
  campaign: Campaign;
  allocations: FundAllocation[];
  teamMembers: TeamMember[];
}) {
  const [memberId, setMemberId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const budget: BudgetState = {
    total: round2(Number(campaign.total_budget ?? 0)),
    remaining: round2(Number(campaign.remaining_budget ?? 0)),
  };
  const amountNumber = Number(amount);

  async function allocate() {
    const parsed = fundAllocationSchema.safeParse({
      member_id: memberId,
      amount,
      note,
    });
    if (!parsed.success) {
      toast({ title: "Check the form", description: parsed.error.issues[0].message });
      return;
    }
    if (!canAllocate(budget, parsed.data.amount)) {
      toast({
        title: "Amount too high",
        description: `Only ${formatMoney(budget.remaining)} is left in this campaign's budget.`,
      });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("fund_allocations").insert({
        campaign_id: campaign.id,
        member_id: parsed.data.member_id,
        amount: round2(parsed.data.amount),
        note: parsed.data.note || null,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Allocation recorded", description: `${formatMoney(round2(parsed.data.amount))} allocated.` });
      setAmount("");
      setNote("");
      router.refresh();
    } catch (err) {
      toast({
        title: "Allocation failed",
        description:
          err instanceof Error && /FUND_EXCEEDS_REMAINING/i.test(err.message)
            ? `Only ${formatMoney(budget.remaining)} is left in this campaign's budget.`
            : err instanceof Error
              ? err.message
              : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(allocation: FundAllocation) {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("fund_allocations")
        .update({ status: "paid" })
        .eq("id", allocation.id)
        .eq("status", "pending");
      if (error) throw error;
      toast({ title: "Marked paid", description: `${formatMoney(Number(allocation.amount))} to ${allocation.profile?.name ?? "member"}.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not update",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeAllocation(allocation: FundAllocation) {
    if (!window.confirm("Remove this allocation? The budget will be refunded.")) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("fund_allocations").delete().eq("id", allocation.id);
      if (error) throw error;
      toast({ title: "Allocation removed" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Could not remove",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  const allocated = round2(budget.total - budget.remaining);

  return (
    <div className="space-y-6">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden /> Budget summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Total budget</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(budget.total)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Allocated</p>
              <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(allocated)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(budget.remaining)}</p>
            </div>
          </div>
          {budget.total > 0 ? (
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{budgetProgress(budget)}% allocated</span>
              </div>
              <Progress value={budgetProgress(budget)} aria-label="Budget allocated" />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeIndianRupee className="h-5 w-5 text-primary" aria-hidden /> Allocate funds
          </CardTitle>
          <CardDescription>
            Record an allocation for a team member. The remaining budget updates immediately
            and can never go negative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No team members yet"
              hint="Build your campaign team first, then allocate funds to its members."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1.4fr_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="fund-member">Team member</Label>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger id="fund-member" aria-label="Team member">
                    <SelectValue placeholder="Pick a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.profile?.name ?? "Member"} ({m.member_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fund-amount">Amount (₹)</Label>
                <Input
                  id="fund-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="2000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {amount !== "" && Number.isFinite(amountNumber) && amountNumber > budget.remaining ? (
                  <p className="text-xs text-destructive" role="alert">
                    Only {formatMoney(budget.remaining)} remaining.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fund-note">Note (optional)</Label>
                <Textarea
                  id="fund-note"
                  placeholder="Travel reimbursement…"
                  value={note}
                  rows={1}
                  maxLength={500}
                  className="min-h-10 resize-none"
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button className="gap-2" onClick={() => void allocate()} disabled={busy || !memberId}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Allocate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
          <CardDescription>Every allocation for this campaign.</CardDescription>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No allocations yet"
              hint="Fund records will appear here once you allocate to team members."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Note</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">
                        {f.profile?.name ?? f.member_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{formatMoney(Number(f.amount))}</TableCell>
                      <TableCell>
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                        {f.note ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {f.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => void markPaid(f)}
                              disabled={busy}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Mark paid
                            </Button>
                          ) : null}
                          {f.status === "pending" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void removeAllocation(f)}
                              disabled={busy}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
