import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Canonical empty state: rounded-xl dashed panel, circular leaf icon chip,
 *  one bold line, one muted line, optional action. Same anatomy everywhere. */
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
        "flex flex-col items-center justify-center rounded-md border border-dashed border-border/80 bg-tint/30 px-6 py-10 text-center",
        className
      )}
    >
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-leaf/30 bg-tint text-leaf">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
