import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-lacquer-deep/40 px-6 py-12 text-center",
        className
      )}
    >
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-sm border border-kinpaku/25 bg-kinpaku/10 text-kinpaku">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
