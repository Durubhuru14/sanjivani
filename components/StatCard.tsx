import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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
    <Card className={cn("border-border/80 shadow-soft", className)}>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground/80">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
