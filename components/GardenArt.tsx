import type { LucideIcon } from "lucide-react";
import {
  Bean,
  Bird,
  Flower2,
  Leaf,
  Sprout,
  TreeDeciduous,
  Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GardenArt — the platform's humane illustration set, volume III.
 *
 * The scenes are professional artwork, not hand-rolled paths:
 *   - Full scenes  → Storyset illustration sets by Freepik
 *     (storyset.com), stored under /public/illustrations/{human,nature}
 *     and recolored into the Sanjivini green-ledger palette
 *     (purple → leaf green, yellow → marigold, floor → warm paper).
 *     See public/illustrations/CREDITS.md for the required attribution.
 *   - Small glyphs (timeline stages, watermarks) → Lucide
 *     (lucide.dev), stroke-only, tinted by `currentColor`.
 *
 * The component surface is unchanged from volume II — same names, same
 * props — so every page keeps rendering exactly as designed:
 *
 *  - Swash          marigold marker underline (draws itself in)
 *  - StepFlora      growth stages — seed → sprout → plant → bloom — the
 *                   how-it-works timeline nodes (Lucide glyphs)
 *  - SpotArt        empty-state vignettes (Storyset scenes)
 *  - HandsSprout    people serving — the auth brand panel centerpiece
 *  - GardenBed      the wide reforestation horizon strip
 *  - GardenSprig    a corner bloom peeking out from behind a card
 *  - FloraMark      stroke-only botanical watermarks (Lucide, seeded)
 *  - CampaignFlora  deterministic scene covers for campaigns without a
 *                   photo (seeded by title — same campaign, same art)
 *  - VineLine       a stitched seed-line connector that draws itself on
 *                   scroll (pairs with [data-reveal] ancestors)
 *
 * Every scene keeps Storyset's soft floor ellipse, recolored to the
 * exact warm paper of --background, so illustrations melt into cream
 * panels and read as paper vignettes on darker surfaces. All purely
 * decorative: aria-hidden, unfocusable, never intercepts pointers.
 */

/* ------------------------------------------------------------------ */
/* Shared plumbing                                                     */
/* ------------------------------------------------------------------ */

/** Deterministic 0..mod-1 index from a string — same seed, same art. */
function seedIndex(seed: string, mod: number) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

type ImgProps = { src: string; className?: string; alt?: string; loading?: "eager" | "lazy" };

/** One Storyset scene, rendered as a crisp responsive <img>. */
function Scene({ src, className, loading = "eager" }: ImgProps) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      draggable={false}
      loading={loading}
      decoding="async"
      className={cn("pointer-events-none select-none", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Hand-drawn marker underline (kept from vol. II — abstract, no figure) */
/* ------------------------------------------------------------------ */

export function Swash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 26"
      className={cn("swash", className)}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      pointerEvents="none"
    >
      <path
        d="M5 16 C 38 8, 72 6, 104 10 C 136 14, 172 10, 215 7"
        stroke="var(--marigold)"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
        pathLength={1}
      />
      {/* second pass — the pencil double-stroke */}
      <path
        d="M9 21 C 44 14, 82 12, 116 16 C 148 19, 182 16, 211 12"
        stroke="var(--marigold)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
        pathLength={1}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Growth stages for the how-it-works timeline (Lucide glyphs)          */
/* ------------------------------------------------------------------ */

export type FloraStage = "seed" | "sprout" | "plant" | "bloom";

const STAGE_GLYPH: Record<FloraStage, LucideIcon> = {
  seed: Bean,
  sprout: Sprout,
  plant: TreeDeciduous,
  bloom: Flower2,
};

export function StepFlora({
  stage,
  className,
}: {
  stage: FloraStage;
  className?: string;
}) {
  const Glyph = STAGE_GLYPH[stage];
  return (
    <Glyph
      className={cn("text-primary", className)}
      strokeWidth={1.9}
      aria-hidden
      focusable={false}
      pointerEvents="none"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Empty-state vignettes (Storyset scenes)                              */
/* ------------------------------------------------------------------ */

export type SpotMood = "sprout-pot" | "basket" | "bird" | "watering";

const SPOT_SRC: Record<SpotMood, string> = {
  "sprout-pot": "/illustrations/nature/potted-plants.svg",
  basket: "/illustrations/nature/farmers-market.svg",
  bird: "/illustrations/nature/birds-in-love.svg",
  watering: "/illustrations/nature/water-drop.svg",
};

export function SpotArt({
  mood = "sprout-pot",
  className,
}: {
  mood?: SpotMood;
  className?: string;
}) {
  return (
    <Scene
      src={SPOT_SRC[mood]}
      className={cn("h-full w-full object-contain", className)}
      loading="lazy"
    />
  );
}

/* ------------------------------------------------------------------ */
/* People serving — the auth brand panel centerpiece                    */
/* ------------------------------------------------------------------ */

export function HandsSprout({ className }: { className?: string }) {
  return (
    <Scene
      src="/illustrations/human/volunteering.svg"
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* The reforestation horizon — people planting the next forest          */
/* ------------------------------------------------------------------ */

export function GardenBed({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-44 w-full overflow-hidden rounded-2xl border border-border/60 bg-tint shadow-soft sm:h-52",
        className
      )}
      aria-hidden
    >
      <Scene
        src="/illustrations/nature/reforestation.svg"
        className="absolute inset-0 h-full w-full object-cover object-[50%_38%]"
      />
      {/* paper wash top + bottom so the crop reads as one composed band */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#f7f2e5]/70 to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Corner bloom                                                         */
/* ------------------------------------------------------------------ */

export function GardenSprig({
  className,
  variant = "sun",
}: {
  className?: string;
  /** "sun" = top-left corner bloom; "butterfly" = bottom-right corner pair of birds */
  variant?: "sun" | "butterfly";
}) {
  return (
    <Scene
      src={
        variant === "sun"
          ? "/illustrations/nature/cherry-blossom.svg"
          : "/illustrations/nature/birds-in-love.svg"
      }
      className={cn("h-full w-full object-contain", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Botanical watermarks — Lucide line art, seeded, tinted by parent      */
/* ------------------------------------------------------------------ */

const MARK_GLYPHS: LucideIcon[] = [Leaf, Sprout, Flower2, TreeDeciduous, Wheat, Bird];

export function FloraMark({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const Glyph = MARK_GLYPHS[seedIndex(seed, MARK_GLYPHS.length)];
  return (
    <Glyph
      className={className}
      strokeWidth={1.1}
      aria-hidden
      focusable={false}
      pointerEvents="none"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Deterministic scene covers for campaigns without a photo             */
/* ------------------------------------------------------------------ */

const FLORA_COVERS = [
  "/illustrations/nature/poppy-flower.svg",
  "/illustrations/nature/spring-flower.svg",
  "/illustrations/nature/cherry-blossom.svg",
  "/illustrations/nature/rose-flower.svg",
  "/illustrations/nature/strelitzia-plant.svg",
  "/illustrations/nature/cactus-flower.svg",
  "/illustrations/nature/gardening.svg",
  "/illustrations/nature/potted-plants.svg",
];

export function CampaignFlora({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  return (
    <Scene
      src={FLORA_COVERS[seedIndex(seed, FLORA_COVERS.length)]}
      className={cn("h-full w-full object-cover object-[50%_30%]", className)}
      loading="lazy"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Stitched seed-line connector (pairs with [data-reveal])              */
/* ------------------------------------------------------------------ */

export function VineLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 100"
      className={cn("vine-draw", className)}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
      pointerEvents="none"
    >
      {/* a line of seeds, stitched down the timeline */}
      <path
        d="M10 0 L10 100"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="0.016 0.02"
        fill="none"
        opacity="0.6"
        pathLength={1}
      />
    </svg>
  );
}
