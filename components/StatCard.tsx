import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/CountUp";
import { Card, CardContent } from "@/components/ui/card";

/** Stat tile: mono label, animated count-up number, leaf accent, hover lift. */
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
    <Card className={cn("interactive border-border bg-card", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
          <p className="eyebrow truncate">{label}</p>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-tint text-leaf transition-colors">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
        <p className="mt-3 font-display text-3xl font-medium leading-none tabular-nums text-foreground">
          {numeric ? (
            <CountUp value={value} duration={850} />
          ) : (
            value
          )}
        </p>
        {hint ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
