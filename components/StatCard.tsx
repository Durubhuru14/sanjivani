import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** Bento-style stat tile: mono label rule, display number, patina accent. */
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
  return (
    <Card className={cn("border-border bg-card", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3">
          <p className="eyebrow truncate">{label}</p>
          <Icon className="h-4 w-4 shrink-0 text-patina" aria-hidden />
        </div>
        <p className="mt-3 font-display text-3xl font-normal leading-none text-champagne">{value}</p>
        {hint ? <p className="mt-1.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
