import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { StarsDisplay } from "@/components/StarsDisplay";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDate } from "@/lib/format";
import { budgetProgress, formatMoney, type BudgetState } from "@/lib/funds";
import { Progress } from "@/components/ui/progress";
import type { Campaign } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CampaignCard({
  campaign,
  href,
  className,
}: {
  campaign: Campaign;
  href: string;
  className?: string;
}) {
  const budget: BudgetState = {
    total: Number(campaign.total_budget ?? 0),
    remaining: Number(campaign.remaining_budget ?? 0),
  };
  const ngo = campaign.ngo;
  const teamSize = (campaign as Campaign & { team_size?: number }).team_size;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card
        className={cn(
          "h-full overflow-hidden border-border/80 shadow-soft transition-all group-hover:-translate-y-0.5 group-hover:shadow-lift group-focus-visible:ring-2 group-focus-visible:ring-ring",
          className
        )}
      >
        {campaign.image_url ? (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="h-36 w-full object-cover"
          />
        ) : (
          <div
            className="flex h-36 w-full items-center justify-center bg-lacquer-deep/60"
            aria-hidden
          >
            <span className="text-4xl font-black tracking-tighter text-primary/25">
              {campaign.title.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <CardContent className="flex flex-col gap-2.5 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={campaign.status} />
            {campaign.type === "invite" ? (
              <StatusBadge status="invite" />
            ) : (
              <StatusBadge status="public" />
            )}
          </div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-primary">
            {campaign.title}
          </h3>
          {ngo ? (
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{ngo.org_name}</span>
              {ngo.verification_status === "approved" ? <VerifiedBadge verified className="scale-90" /> : null}
              {Number(ngo.avg_rating) > 0 ? (
                <StarsDisplay score={Number(ngo.avg_rating)} size="sm" className="scale-90 origin-left" />
              ) : null}
            </div>
          ) : null}
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {campaign.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {campaign.location}
              </span>
            ) : null}
            {campaign.start_date ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatDate(campaign.start_date)}
                {campaign.end_date ? ` – ${formatDate(campaign.end_date)}` : ""}
              </span>
            ) : null}
            {typeof teamSize === "number" ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden /> {teamSize} on team
              </span>
            ) : null}
          </div>
          {budget.total > 0 ? (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {formatMoney(budget.total - budget.remaining)} of {formatMoney(budget.total)} allocated
              </span>
              <Progress value={budgetProgress(budget)} className="h-1.5 w-24" aria-hidden />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
