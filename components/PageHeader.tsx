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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
