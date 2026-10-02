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
              "inline-flex items-center gap-1 rounded-sm border border-patina/35 bg-patina/12 px-2 py-0.5 text-xs font-medium text-patina",
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
