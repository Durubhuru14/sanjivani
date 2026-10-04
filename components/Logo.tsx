import { cn } from "@/lib/utils";

/**
 * Sanjivani leaf-S mark (Sanjivani_Spec.md §3):
 * two layered leaves sweeping into an "S" — the NGO arm and the
 * volunteer arm forming one continuous growth path. Deep green
 * #2E7D32 with the lighter #66BB6A accent; solid two-tone cut so
 * it stays crisp from 24px (navbar) to 512px (app icon).
 */
export function LogoMark({ className, detailed = false }: { className?: string; detailed?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} role="img" aria-label="Sanjivani">
      {/* upper leaf (deep green) */}
      <path
        d="M 31 34 C 20 33 13 27 13 19 C 13 10 21 4 31 5 C 39 6 46 10 48 17 C 44 13 38 11 32 12 C 24 13 20 17 20 22 C 20 27 25 31 31 34 Z"
        fill="#2E7D32"
      />
      {/* lower leaf (bright green, layered over the upper at the crossing) */}
      <path
        d="M 31 34 C 20 33 13 27 13 19 C 13 10 21 4 31 5 C 39 6 46 10 48 17 C 44 13 38 11 32 12 C 24 13 20 17 20 22 C 20 27 25 31 31 34 Z"
        fill="#66BB6A"
        transform="rotate(180 32 32)"
      />
      {/* midrib veins — leaf texture, only when rendered large */}
      {detailed && (
        <>
          <path
            d="M 45 13 C 37 8 27 7.5 19.5 12.5"
            fill="none"
            stroke="#E8F5E9"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M 45 13 C 37 8 27 7.5 19.5 12.5"
            fill="none"
            stroke="#E8F5E9"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
            transform="rotate(180 32 32)"
          />
        </>
      )}
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
      <span
        className={cn(
          "font-display font-medium tracking-wide text-foreground leading-none",
          compact ? "text-lg" : "text-xl"
        )}
      >
        Sanjivani
      </span>
    </span>
  );
}
