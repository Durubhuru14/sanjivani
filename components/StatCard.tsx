import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/CountUp";
import { Card, CardContent } from "@/components/ui/card";
import { FloraMark } from "@/components/GardenArt";

/** Stat tile — the ledger's figures. A hand-drawn botanical mark rests in
 *  the corner (swaying very gently, like a plant on a windowsill), the
 *  number is set in the display serif in deep leaf ink, and the hint line
 *  always renders (blank when unused) so every tile in a row shares one
 *  height and the values sit on the same bottom-aligned baseline across
 *  the grid. Gentle lift on hover — the card answers the cursor even when
 *  it isn't a link, but never promises a click it can't keep. */
export function StatCard({
  label,
  value,
  icon: _icon,
  hint,
  className,
}: {
  label: string;
  value: string | number;
  /** Legacy icon slot — kept for API compatibility; the botanical mark
   *  (seeded by label) is the watermark now. */
  icon: LucideIcon;
  hint?: string;
  className?: string;
}) {
  const numeric = typeof value === "number" && Number.isFinite(value);

  return (
    <Card
      className={cn(
        "group relative h-full overflow-hidden border-border bg-card shadow-card transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift",
        className
      )}
    >
      {/* botanical watermark — hand-drawn line art, ~12% leaf ink */}
      <span
        className="pointer-events-none absolute -bottom-5 -right-4 text-leaf/[0.13] dark:text-leaf/[0.15]"
        aria-hidden
      >
        <FloraMark seed={label} className="animate-sway-soft h-28 w-28" />
      </span>
      {/* Mobile-compact paddings/icon/label so two-up grids keep readable
          labels down to 320px; sm+ restores the roomier rhythm. The label
          wraps (leading-snug) instead of truncating — a two-line eyebrow
          reads better than "CAMPA…". */}
      <CardContent className="relative flex h-full flex-col p-4 sm:p-5">
        <p className="eyebrow leading-snug break-words" title={label}>
          {label}
        </p>
        <div className="mt-auto flex flex-1 flex-col justify-end pt-4">
          <p className="animate-harvest font-display text-[1.7rem] font-semibold leading-none tabular-nums text-grow sm:text-3xl">
            {numeric ? (
              <CountUp value={value} duration={850} />
            ) : (
              value
            )}
          </p>
          <p className="mt-2 h-4 truncate text-xs text-muted-foreground">
            {hint ?? "\u00A0"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
