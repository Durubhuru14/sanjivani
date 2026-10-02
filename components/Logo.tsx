import { cn } from "@/lib/utils";

/**
 * Kinpaku carved-tile mark (DESIGN.md brand lockup):
 * a solid kinpaku square split by a diagonal slash — no container border.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-8 w-8", className)}
      role="img"
      aria-label="Sanjivani"
    >
      <defs>
        <linearGradient id="sv-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(86% 0.07 84)" />
          <stop offset="0.5" stopColor="oklch(84% 0.19 80.46)" />
          <stop offset="1" stopColor="oklch(77% 0.13 82)" />
        </linearGradient>
      </defs>
      {/* carved tile */}
      <rect x="4" y="4" width="56" height="56" rx="6" fill="url(#sv-gold)" />
      {/* diagonal slash through the leaf */}
      <path d="M 34 4 L 64 34 L 64 40 L 40 64 L 34 64 L 4 34 L 4 28 Z" fill="oklch(7% 0.006 95)" opacity="0.92" />
      {/* patina node marks */}
      <circle cx="47" cy="17" r="3.4" fill="oklch(70% 0.12 188)" />
      <circle cx="17" cy="47" r="3.4" fill="oklch(70% 0.12 188)" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      <span
        className={cn(
          "font-display font-normal uppercase text-champagne tracking-[0.15em] leading-none",
          compact ? "text-base" : "text-lg"
        )}
      >
        Sanjivani
      </span>
    </span>
  );
}
