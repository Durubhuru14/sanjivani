import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/CountUp";
import { Card, CardContent } from "@/components/ui/card";

/** Stat tile: mono label, animated count-up number, leaf accent, hover lift.
 *  Rhythm contract: every tile in a row shares one height — the hint line is
 *  always rendered (blank when unused) and the value sits on the same
 *  bottom-aligned baseline across the whole grid. */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  className?: string;
}) {
  const numeric = typeof value === "number" && Number.isFinite(value);

  return (
    <Card className={cn("interactive h-full border-border bg-card", className)}>
      {/* Mobile-compact paddings/icon/label so two-up grids keep readable
          labels down to 320px; sm+ restores the roomier rhythm. The label
          wraps (leading-snug) instead of truncating — a two-line eyebrow
          reads better than "CAMPA…". */}
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2 border-b border-border/70 pb-3 sm:gap-3">
          <p className="eyebrow leading-snug break-words" title={label}>
            {label}
          </p>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-tint text-leaf transition-colors sm:h-7 sm:w-7">
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
          </span>
        </div>
        <div className="mt-3 flex flex-1 flex-col justify-end">
          <p className="font-display text-2xl font-medium leading-none tabular-nums text-foreground sm:text-3xl">
            {numeric ? (
              <CountUp value={value} duration={850} />
            ) : (
              value
            )}
          </p>
          <p className="mt-1.5 h-4 truncate text-xs text-muted-foreground">
            {hint ?? "\u00A0"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
