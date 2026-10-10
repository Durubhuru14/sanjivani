import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Canonical page header: optional back link above, then title + subtitle on
 *  the left and actions flush right. Every dashboard and sub-page uses this
 *  so headings, weights and action alignment never drift between roles. */
export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
  backLabel = "Back",
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {backHref ? (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> {backLabel}
          </Link>
        </Button>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-medium leading-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? (
          // Mobile: actions claim the full row under the title (they wrap
          // left-aligned instead of overflowing the 320px viewport); sm+
          // keeps them flush right beside the title.
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
