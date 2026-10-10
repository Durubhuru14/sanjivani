import { cn } from "@/lib/utils";
import { SpotArt, type SpotMood } from "@/components/GardenArt";

/** Canonical empty state: a quiet tinted panel with a hand-drawn botanical
 *  vignette (potted sprout, basket, sleeping bird, or watering can — pick
 *  with `mood`), one warm heading, one muted line, optional action.
 *  Same anatomy everywhere. The vignette bobs once on entrance, then
 *  breathes — an empty state should feel like a waiting room, not an error. */
export function EmptyState({
  mood = "sprout-pot",
  title,
  hint,
  action,
  icon: _icon,
  className,
}: {
  mood?: SpotMood;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  /** Legacy icon slot — kept for API compatibility, no longer rendered
   *  (the vignette carries the symbolism now). */
  icon?: React.ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border/70 bg-tint/40 px-6 py-12 text-center",
        className
      )}
    >
      <span className="animate-bob block">
        <SpotArt mood={mood} className="animate-breathe h-24 w-24" />
      </span>
      <p className="mt-4 text-sm font-semibold text-foreground">{title}</p>
      {hint ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
