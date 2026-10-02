import { cn } from "@/lib/utils";
import { statusTone, humanize } from "@/lib/format";

export function StatusBadge({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em]",
        statusTone(status),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {humanize(status)}
    </span>
  );
}
