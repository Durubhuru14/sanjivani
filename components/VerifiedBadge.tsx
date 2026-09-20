import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function VerifiedBadge({
  verified,
  className,
  label = "Verified by Sanjivani",
}: {
  verified: boolean;
  className?: string;
  label?: string;
}) {
  if (!verified) return null;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-700",
              className
            )}
            aria-label={label}
            data-testid="verified-badge"
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Verified
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
