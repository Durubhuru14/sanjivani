import { cn } from "@/lib/utils";

/**
 * GardenArt — the platform's humane illustration set, volume II.
 *
 * One illustration language: organic Bézier stems, tapered fills,
 * deliberately asymmetric leaves, stroke-linecap round everywhere,
 * and a strict palette taken from the CSS custom properties
 * (--primary, --primary-bright, --primary-deep, --tint, --terracotta,
 * --marigold). Every piece re-skins itself in light and dark mode with
 * zero JS. Purely decorative: aria-hidden, unfocusable, never intercepts
 * pointer events.
 *
 *  - Swash          hand-drawn marigold marker underline (draws itself in)
 *  - StepFlora      growth stages — seed → sprout → plant → bloom — used
 *                   as the how-it-works timeline nodes
 *  - SpotArt        empty-state vignettes: a hopeful potted sprout, an
 *                   empty basket, a sleeping bird, a watering can mid-pour
 *  - HandsSprout    two hands cupping a growing sprout — the "serving
 *                   people" centerpiece for the auth brand panels
 *  - GardenBed      the wide "growing garden" horizon strip
 *  - GardenSprig    a corner sprig peeking out from behind a card
 *  - CampaignFlora  deterministic botanical cover art for campaigns
 *                   without a photo (seeded by title — same campaign,
 *                   same flora, every render)
 *  - VineLine       a wobbly hand-drawn connector that draws itself on
 *                   scroll (pair with [data-reveal] ancestors)
 */

/* ------------------------------------------------------------------ */
/* Hand-drawn marker underline                                         */
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
/* Growth stages for the how-it-works timeline                         */
/* ------------------------------------------------------------------ */

export type FloraStage = "seed" | "sprout" | "plant" | "bloom";

export function StepFlora({
  stage,
  className,
}: {
  stage: FloraStage;
  className?: string;
}) {
  if (stage === "seed") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false" pointerEvents="none">
        {/* falling seed with motion ticks */}
        <ellipse cx="31" cy="29" rx="5.5" ry="8" transform="rotate(-16 31 29)" fill="var(--primary-deep)" />
        <path d="M31 24 C 29.5 27, 29 30, 30 33" stroke="var(--tint)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
        <g stroke="var(--terracotta)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M20 18 l3 3" />
          <path d="M43 21 l-3 3" />
        </g>
        {/* a marigold sparkle waiting for it */}
        <path d="M49 10 v8 M45 14 h8" stroke="var(--marigold)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* soil mound */}
        <path d="M15 47 C 22 40, 42 40, 49 47 C 43 53, 21 53, 15 47 Z" fill="var(--terracotta)" opacity="0.3" />
        <circle cx="24" cy="47" r="1.7" fill="var(--primary-deep)" opacity="0.35" />
        <circle cx="40" cy="48" r="1.4" fill="var(--primary-deep)" opacity="0.3" />
      </svg>
    );
  }

  if (stage === "sprout") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false" pointerEvents="none">
        {/* stem — one confident stroke */}
        <path d="M32 54 C 31.4 47, 31.4 41, 32.3 33" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* cotyledons — asymmetric first leaves */}
        <path d="M32 39 C 24 38, 18 32, 17 23 C 25.5 24.5, 31 31, 32 39 Z" fill="var(--primary-bright)" />
        <path d="M30.6 36.8 C 27 33.4, 24 29.5, 22.6 26.2" stroke="var(--primary-deep)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.45" />
        <path d="M32.6 37 C 40 35, 46 28.5, 47 20 C 39 22, 33.6 28.5, 32.6 37 Z" fill="var(--primary)" />
        <path d="M34 34.8 C 37.4 31.6, 40.4 28, 42 24.8" stroke="var(--primary-deep)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.45" />
        {/* dew drop */}
        <circle cx="49" cy="13" r="2.6" fill="var(--marigold)" opacity="0.8" />
        {/* soil mound */}
        <path d="M15 53 C 22 46.5, 42 46.5, 49 53 C 43 58.5, 21 58.5, 15 53 Z" fill="var(--terracotta)" opacity="0.28" />
      </svg>
    );
  }

  if (stage === "plant") {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false" pointerEvents="none">
        <path d="M32 56 C 30.8 47, 33 38, 32 28" stroke="var(--primary-deep)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
        {/* lower leaves */}
        <path d="M31.5 45 C 22 44, 15 37, 14 27.5 C 23.5 29, 30 36, 31.5 45 Z" fill="var(--primary-bright)" />
        <path d="M29.8 42.4 C 25.6 38.4, 22 33.8, 20.3 29.8" stroke="var(--primary-deep)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.45" />
        <path d="M32.6 41 C 41.5 39, 47.5 32, 48.5 23 C 40 24.5, 33.6 31.5, 32.6 41 Z" fill="var(--primary)" />
        {/* a smaller leaf higher up */}
        <path d="M31.8 32.5 C 25.5 31.5, 20.8 26.8, 19.8 21 C 26 22, 31 27, 31.8 32.5 Z" fill="var(--primary)" opacity="0.92" />
        {/* closed bud, about to open */}
        <path d="M32 28 C 28.4 24, 28.6 17.5, 32 14 C 35.4 17.5, 35.6 24, 32 28 Z" fill="var(--primary-deep)" />
        <path d="M32 20.5 C 31 22.5, 31 25, 32 27" stroke="var(--tint)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M29.6 27.6 C 28 26.4, 27 24.6, 26.8 22.6 M34.4 27.6 C 36 26.4, 37 24.6, 37.2 22.6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* soil mound */}
        <path d="M15 55 C 22 48.5, 42 48.5, 49 55 C 43 60.5, 21 60.5, 15 55 Z" fill="var(--terracotta)" opacity="0.26" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false" pointerEvents="none">
      <path d="M32 56 C 30.8 46, 33 36, 32 27" stroke="var(--primary-deep)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <path d="M31.5 46 C 23 45, 17 39, 16 30.5 C 24.5 32, 30 38.5, 31.5 46 Z" fill="var(--primary-bright)" />
      <path d="M32.6 42 C 40.5 40.2, 46 33.8, 47 25.5 C 39 27, 33.6 33.5, 32.6 42 Z" fill="var(--primary)" />
      {/* the bloom — a scalloped, slightly wonky flower */}
      <path
        d="M32 8.5 C 36 8.5, 38.3 11.2, 37.7 14.3 C 40.4 16.2, 40.6 20, 37.7 21.8 C 36.9 24.9, 33.2 26.6, 30.3 25.1 C 27.2 25.8, 24 23.4, 24.4 20.2 C 21.8 18.2, 22.2 14.2, 25.2 13 C 25.9 9.9, 29.2 7.9, 32 8.5 Z"
        fill="var(--marigold)"
      />
      <circle cx="31.6" cy="17" r="3.4" fill="var(--terracotta)" />
      <circle cx="30.4" cy="15.8" r="0.9" fill="var(--tint)" opacity="0.8" />
      {/* a friendly visitor */}
      <g>
        <ellipse cx="47.5" cy="14" rx="3.4" ry="4.8" transform="rotate(-24 47.5 14)" fill="var(--terracotta)" />
        <ellipse cx="53.5" cy="15.5" rx="3" ry="4.4" transform="rotate(22 53.5 15.5)" fill="var(--marigold)" />
      </g>
      <path d="M15 55 C 22 48.5, 42 48.5, 49 55 C 43 60.5, 21 60.5, 15 55 Z" fill="var(--terracotta)" opacity="0.26" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Empty-state vignettes                                               */
/* ------------------------------------------------------------------ */

export type SpotMood = "sprout-pot" | "basket" | "bird" | "watering";

export function SpotArt({
  mood = "sprout-pot",
  className,
}: {
  mood?: SpotMood;
  className?: string;
}) {
  if (mood === "basket") {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false" pointerEvents="none">
        {/* handle */}
        <path d="M38 52 C 42 30, 78 30, 82 52" stroke="var(--terracotta)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* a couple of leaves resting on the rim — something was gathered */}
        <path d="M46 52 C 42 45, 42.5 38, 47 33 C 51 38, 50.5 45, 46 52 Z" fill="var(--primary-bright)" />
        <path d="M45.2 48.6 C 44 45.4, 44.2 41.6, 46 38.6" stroke="var(--primary-deep)" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M68 52 C 72.5 47, 72.5 40, 68 36 C 63.5 40, 63.5 47, 68 52 Z" fill="var(--primary)" opacity="0.9" />
        {/* rim */}
        <rect x="24" y="50" width="72" height="11" rx="5.5" fill="var(--terracotta)" />
        {/* woven body */}
        <path d="M28 61 C 28 80, 39 92, 60 92 C 81 92, 92 80, 92 61 Z" fill="var(--terracotta)" opacity="0.85" />
        <g stroke="var(--primary-deep)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.18">
          <path d="M32 68 C 44 72, 76 72, 88 68" />
          <path d="M34 77 C 45 81, 75 81, 86 77" />
          <path d="M46 63 C 45 74, 45 84, 47 91" />
          <path d="M60 63 C 60 74, 60 84, 60 92" />
          <path d="M74 63 C 75 74, 75 84, 73 91" />
        </g>
        {/* ground shadow + floating seeds */}
        <ellipse cx="60" cy="100" rx="30" ry="5" fill="var(--primary-deep)" opacity="0.1" />
        <circle cx="98" cy="34" r="2.4" fill="var(--marigold)" opacity="0.7" />
        <circle cx="22" cy="40" r="2" fill="var(--primary)" opacity="0.4" />
      </svg>
    );
  }

  if (mood === "bird") {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false" pointerEvents="none">
        {/* branch */}
        <path d="M10 80 C 34 74, 58 78, 82 71 C 94 68, 102 70, 110 65" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M58 77 C 56 69, 50 64, 43 63 C 47 69, 52 73, 58 77 Z" fill="var(--primary-bright)" />
        <path d="M80 73 C 82 67, 87 63, 93 62 C 90 67, 86 71, 80 73 Z" fill="var(--primary)" opacity="0.85" />
        {/* sleeping bird — round, tucked, at peace */}
        <path d="M46 64 C 46 51, 57 46, 65 51 C 73 47, 81 54, 78.5 62.5 C 76 70, 63 73, 54 70.5 C 49 69, 46 67, 46 64 Z" fill="var(--primary)" />
        <path d="M78 61 C 86 58, 92 52, 97 44 C 93.5 55, 87.5 62, 80 65 Z" fill="var(--primary-deep)" />
        <path d="M56 57.5 q 2.4 1.8 4.8 0" stroke="var(--primary-deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M66.5 51.5 l 6.5 2.2 l -6.2 2.4 Z" fill="var(--marigold)" />
        <path d="M54 63.5 C 58 60, 64 59.5, 68 61.5" stroke="var(--primary-deep)" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.35" />
        {/* zzz */}
        <g stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.45">
          <path d="M88 40 h5.5 l-5.5 5.5 h5.5" />
          <path d="M99 27 h4.5 l-4.5 4.5 h4.5" />
        </g>
        {/* setting sun */}
        <circle cx="24" cy="28" r="11" fill="var(--marigold)" opacity="0.85" />
        <g stroke="var(--marigold)" strokeWidth="2.6" strokeLinecap="round" opacity="0.6">
          <line x1="24" y1="10" x2="24" y2="5" />
          <line x1="8" y1="26" x2="3" y2="24" />
          <line x1="12" y1="14" x2="8" y2="10" />
        </g>
      </svg>
    );
  }

  if (mood === "watering") {
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false" pointerEvents="none">
        {/* the can */}
        <path d="M68 62 C 68 58, 71 56, 74 56 L 86 56 C 90 56, 92 58, 92 62 L 92 79 C 92 85, 88 88, 82 88 L 78 88 C 72 88, 68 85, 68 79 Z" fill="var(--primary)" />
        <path d="M68 64 C 58 66, 50 73, 44.5 80.5 L 51.5 85 C 56.5 78.5, 62 73.5, 68.5 71 Z" fill="var(--primary)" />
        <ellipse cx="47.5" cy="83" rx="5" ry="3.4" transform="rotate(38 47.5 83)" fill="var(--primary-deep)" />
        <path d="M72 56 C 75 45, 88 45, 90 56" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M92 66 C 100 66, 100 78, 92 78" stroke="var(--primary-deep)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <path d="M74 66 C 74 63, 77 61.5, 80 62.5" stroke="var(--tint)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.6" />
        {/* the pour — drops of care */}
        <g fill="var(--primary-bright)">
          <path d="M38 92 c -2.4 3.4 -2.4 5.6 0 7.2 c 2.4 -1.6 2.4 -3.8 0 -7.2 Z" />
          <path d="M30 84 c -2 2.8 -2 4.6 0 6 c 2 -1.4 2 -3.2 0 -6 Z" opacity="0.85" />
          <path d="M25 98 c -1.8 2.6 -1.8 4.2 0 5.4 c 1.8 -1.2 1.8 -2.8 0 -5.4 Z" opacity="0.7" />
        </g>
        {/* the soil that is waiting */}
        <path d="M10 108 C 20 101, 42 101, 50 108 C 42 113.5, 18 113.5, 10 108 Z" fill="var(--terracotta)" opacity="0.25" />
        <g stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M24 100 l -0.5 -4.5" />
          <path d="M31 101 l 1.5 -4" />
          <path d="M17 102 l -2 -3.5" />
        </g>
        <circle cx="57" cy="30" r="2.4" fill="var(--marigold)" opacity="0.7" />
        <circle cx="103" cy="42" r="2" fill="var(--primary)" opacity="0.35" />
      </svg>
    );
  }

  /* sprout-pot — the default: a hopeful little plant on the windowsill */
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false" pointerEvents="none">
      {/* morning sun */}
      <circle cx="95" cy="24" r="10" fill="var(--marigold)" opacity="0.9" />
      <g stroke="var(--marigold)" strokeWidth="2.6" strokeLinecap="round" opacity="0.6">
        <line x1="95" y1="8" x2="95" y2="3.5" />
        <line x1="108" y1="17" x2="112" y2="14" />
        <line x1="111" y1="30" x2="116" y2="30" />
      </g>
      {/* the leaning sprout */}
      <path d="M59 60 C 58.6 50, 56.5 42, 60 33" stroke="var(--primary-deep)" strokeWidth="4.4" strokeLinecap="round" fill="none" />
      <path d="M59 46 C 51 44.5, 45.5 38, 44.5 29.5 C 52.5 31, 58 38, 59 46 Z" fill="var(--primary-bright)" />
      <path d="M57.5 43.6 C 53.6 39.8, 50.4 35.4, 49 31.2" stroke="var(--primary-deep)" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M60 42 C 67.5 40, 72.5 34, 73.5 26 C 66 27.5, 61 34, 60 42 Z" fill="var(--primary)" />
      {/* the pot */}
      <path d="M42 60 L 76 60 L 71.5 90 C 70.5 93.5, 67 95.5, 63.5 95.5 L 54.5 95.5 C 51 95.5, 47.5 93.5, 46.5 90 Z" fill="var(--terracotta)" />
      <path d="M48 66 C 55 64.5, 65 64.5, 71 66" stroke="var(--primary-deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.2" />
      <rect x="38" y="53" width="42" height="10" rx="5" fill="var(--terracotta)" />
      <path d="M46 56 C 52 54.8, 66 54.8, 72 56" stroke="var(--tint)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" />
      {/* a fallen leaf and ground shadow */}
      <path d="M28 98 C 24 95, 23.4 90.5, 26.4 87.5 C 30.4 89.5, 31 94, 28 98 Z" fill="var(--primary)" opacity="0.45" />
      <ellipse cx="59" cy="101" rx="27" ry="5" fill="var(--primary-deep)" opacity="0.1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hands cupping a sprout — the "serving people" centerpiece            */
/* ------------------------------------------------------------------ */

export function HandsSprout({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 210" className={className} aria-hidden focusable="false" pointerEvents="none">
      {/* morning sun + birds + sparkles — the world these hands work in */}
      <circle cx="42" cy="42" r="17" fill="var(--marigold)" opacity="0.92" />
      <g stroke="var(--marigold)" strokeWidth="3.4" strokeLinecap="round" opacity="0.65">
        <line x1="42" y1="15" x2="42" y2="8" />
        <line x1="20" y1="30" x2="14" y2="26" />
        <line x1="24" y1="56" x2="18" y2="61" />
        <line x1="60" y1="20" x2="66" y2="15" />
      </g>
      <g stroke="var(--terracotta)" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M158 42 q 7 -8 14 0 q 7 -8 14 0" />
        <path d="M196 64 q 5.5 -7 11 0 q 5.5 -7 11 0" opacity="0.75" />
      </g>
      <g stroke="var(--marigold)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.7">
        <path d="M204 22 v7 M200.5 25.5 h7" />
        <path d="M92 20 v5.5 M89.2 22.8 h5.6" opacity="0.7" />
      </g>

      {/* the sprout they are raising */}
      <path d="M120 128 C 118.8 108, 121.4 88, 120 66" stroke="var(--primary-deep)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M119.4 104 C 100 102, 86 90, 82 71 C 101 73.5, 114.5 86, 119.4 104 Z" fill="var(--primary)" />
      <path d="M116.6 99.8 C 106.4 92, 97.8 81.6, 93.6 71.6" stroke="var(--primary-deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M120.8 98 C 139 95, 153 82, 157 64 C 139 66.5, 125.5 79, 120.8 98 Z" fill="var(--primary-bright)" />
      <path d="M123.6 94 C 133.4 86.4, 141.6 76.4, 145.6 66.8" stroke="var(--primary-deep)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.4" />
      {/* the bud at the top — what it will become */}
      <path d="M120 66 C 116 60.5, 116 53.5, 120 48 C 124 53.5, 124 60.5, 120 66 Z" fill="var(--primary)" />
      <circle cx="120" cy="38" r="3" fill="var(--marigold)" />

      {/* the soil mound the hands hold */}
      <path d="M78 136 C 92 122, 148 122, 162 136 C 150 147, 90 147, 78 136 Z" fill="var(--primary-deep)" opacity="0.92" />
      <circle cx="98" cy="135" r="1.8" fill="var(--tint)" opacity="0.35" />
      <circle cx="130" cy="137" r="1.5" fill="var(--tint)" opacity="0.3" />
      <circle cx="146" cy="133" r="1.6" fill="var(--tint)" opacity="0.3" />

      {/* two cupped hands — clay-warm, steadying the mound */}
      <path
        d="M118 200 C 88 198, 58 182, 46 150 C 41.5 137, 46 124, 57 118 C 60.5 128, 67 136.5, 77 141 C 70.5 149, 68.5 159.5, 73 168 C 85 184.5, 102 193, 118 195 Z"
        fill="var(--terracotta)"
      />
      <path
        d="M122 200 C 152 198, 182 182, 194 150 C 198.5 137, 194 124, 183 118 C 179.5 128, 173 136.5, 163 141 C 169.5 149, 171.5 159.5, 167 168 C 155 184.5, 138 193, 122 195 Z"
        fill="var(--terracotta)"
      />
      {/* cuff seams — the hands belong to someone */}
      <g stroke="var(--primary-deep)" strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.28">
        <path d="M58 126.5 C 61 131, 63.5 134, 67 137" />
        <path d="M182 126.5 C 179 131, 176.5 134, 173 137" />
      </g>
      {/* soft ground shadow */}
      <ellipse cx="120" cy="201" rx="58" ry="6" fill="var(--primary-deep)" opacity="0.1" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The growing-garden horizon                                          */
/* ------------------------------------------------------------------ */

export function GardenBed({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 220"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
      focusable="false"
      pointerEvents="none"
    >
      {/* sun with uneven, lazy rays */}
      <circle cx="540" cy="50" r="21" fill="var(--marigold)" opacity="0.92" />
      <g stroke="var(--marigold)" strokeWidth="4.4" strokeLinecap="round" opacity="0.65">
        <line x1="540" y1="21" x2="540" y2="11" />
        <line x1="562" y1="29" x2="570" y2="22" />
        <line x1="571" y1="50" x2="582" y2="50" />
        <line x1="561" y1="72" x2="568" y2="80" />
        <line x1="519" y1="73" x2="512" y2="81" />
        <line x1="509" y1="50" x2="498" y2="51" />
      </g>

      {/* birds */}
      <path d="M226 42 q 7 -9 14 0 q 7 -9 14 0" fill="none" stroke="var(--terracotta)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M282 66 q 5.5 -7 11 0 q 5.5 -7 11 0" fill="none" stroke="var(--terracotta)" strokeWidth="2.8" strokeLinecap="round" opacity="0.8" />

      {/* stage 1 — a seedling in its mound */}
      <ellipse cx="70" cy="176" rx="23" ry="7.5" fill="var(--terracotta)" opacity="0.28" />
      <path d="M70 174 C 69.4 166, 69.4 159, 70.3 151" fill="none" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 157 C 62.5 155.5, 57.5 149.5, 56.5 142 C 64 143.5, 69 150, 70 157 Z" fill="var(--primary-bright)" />
      <path d="M70.7 156 C 77.5 154, 82 148, 83 141 C 76 142.5, 71.4 148.5, 70.7 156 Z" fill="var(--primary)" />

      {/* stage 2 — a leafy plant, four leaves in */}
      <path d="M172 176 C 170.8 162, 173.2 148, 172 134" fill="none" stroke="var(--primary-deep)" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M171.4 152 C 161 150.5, 154.5 143.5, 153.5 135 C 162.5 136.5, 169 144, 171.4 152 Z" fill="var(--primary)" />
      <path d="M172.8 149 C 182 147, 188 140.5, 189 132.5 C 180.5 134, 174.5 141, 172.8 149 Z" fill="var(--primary-bright)" />
      <path d="M171.7 137 C 164 135.8, 158.6 130.4, 157.7 123.5 C 165 124.7, 170.4 130, 171.7 137 Z" fill="var(--primary-bright)" opacity="0.92" />
      <path d="M172.5 134 C 174 126, 178.5 120.5, 184.5 118.5 C 183 126, 178.5 131.5, 172.5 134 Z" fill="var(--primary)" />
      <path d="M172 134 C 168.8 128, 168.4 121, 171 115 C 174.4 120.5, 175 127.5, 172 134 Z" fill="var(--primary)" opacity="0.9" />

      {/* stage 3 — a leafy bush with berries (scalloped, never circles) */}
      <path d="M276 165 C 266 150, 278 138, 292 143 C 295.5 130, 312.5 130, 316.5 142.5 C 330 139, 340 150, 332.5 161 C 339 170, 327 179.5, 316.5 175 C 310 183, 294 183, 289 175.5 C 279 178.5, 271 173, 276 165 Z" fill="var(--primary-bright)" />
      <path d="M288 163 C 283 153, 291 144, 301 148 C 304 138, 317 139, 319 149 C 328 147, 334 155, 328 162 C 331 168, 322 174, 315 170 C 309 176, 297 175, 294 169 C 287 171, 282 168, 288 163 Z" fill="var(--primary)" opacity="0.55" />
      <circle cx="291" cy="168" r="3.2" fill="var(--marigold)" />
      <circle cx="304" cy="172" r="2.7" fill="var(--marigold)" />
      <circle cx="317" cy="167" r="2.9" fill="var(--marigold)" />

      {/* stage 4 — a young sapling with a tapered trunk */}
      <path d="M407 176 C 405 164, 408.6 152, 406.8 142 L 414.6 141.4 C 413 152, 416.6 164, 414.8 176 Z" fill="var(--terracotta)" opacity="0.88" />
      <path d="M409 150 C 403 147, 398.6 141.6, 397 135.5" fill="none" stroke="var(--terracotta)" strokeWidth="3.6" strokeLinecap="round" opacity="0.85" />
      <path d="M415 146 C 420.5 143, 424.5 138, 426 132" fill="none" stroke="var(--terracotta)" strokeWidth="3.2" strokeLinecap="round" opacity="0.85" />
      <path d="M412 122 C 396 112, 400 92, 417 90 C 421 76, 442 77, 445 91 C 460 92, 463 110, 449 118 C 446 130, 426 132, 419 124 Z" fill="var(--primary)" />
      <path d="M404 118 C 394 111, 396.5 97, 408 96 C 411 86, 425 86.5, 427.5 96.5 C 437 97.5, 439 109, 430 113 C 427.5 121, 413 122, 409 116 Z" fill="var(--primary-deep)" opacity="0.85" />
      <path d="M424 114 C 419 107, 421.5 96, 431 96 C 434 87.5, 446 90, 446.5 99 C 455 101, 455 112, 446 114 C 442 120, 429 120, 426 115 Z" fill="var(--primary-bright)" opacity="0.9" />

      {/* stage 5 — the tall bloom */}
      <path d="M520 176 C 518.8 160, 521.2 142, 520 124" fill="none" stroke="var(--primary-deep)" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M519.4 152 C 510 150.5, 503.5 144, 502.5 135.5 C 511.5 137, 518 144, 519.4 152 Z" fill="var(--primary)" />
      <path d="M520.8 147 C 529.5 145, 535.5 138.5, 536.5 130.5 C 528 132, 522 138.5, 520.8 147 Z" fill="var(--primary-bright)" />
      {/* scalloped, wonky bloom head */}
      <path
        d="M520 92 C 526.5 92, 530.5 96.5, 529.5 101.5 C 534 104.5, 534.2 110.5, 529.5 113.4 C 528.2 118.4, 522.2 121.1, 517.5 118.6 C 512.4 119.8, 507 115.8, 507.7 110.6 C 503.3 107.4, 504 101, 508.9 99.1 C 510 94.1, 515.5 90.8, 520 92 Z"
        fill="var(--marigold)"
      />
      <circle cx="519" cy="105.5" r="5.4" fill="var(--terracotta)" />
      <circle cx="517" cy="103.6" r="1.4" fill="var(--tint)" opacity="0.85" />
      {/* a butterfly visiting */}
      <g>
        <ellipse cx="561" cy="112" rx="6" ry="8.8" transform="rotate(-22 561 112)" fill="var(--terracotta)" />
        <ellipse cx="573" cy="114" rx="5.6" ry="8.2" transform="rotate(22 573 114)" fill="var(--marigold)" />
        <line x1="567" y1="104" x2="567" y2="124" stroke="var(--primary-deep)" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* little sprout ticks between the stages */}
      <g fill="none" stroke="var(--primary)" strokeWidth="2.8" strokeLinecap="round" opacity="0.5">
        <path d="M120 176 C 119.4 171, 119.4 167, 120 163" />
        <path d="M118.8 166 C 116 164.4, 114.4 162, 114 159.5" />
        <path d="M348 176 C 347.4 172, 347.4 168, 348 164" />
        <path d="M464 178 C 463.4 174, 463.4 170, 464 166" />
      </g>

      {/* rolling ground — two organic layers */}
      <path
        d="M0 178 C 80 161, 152 170, 226 176 C 300 182, 356 161, 436 161 C 516 161, 578 176, 640 167 L 640 220 L 0 220 Z"
        fill="var(--tint)"
      />
      <path
        d="M0 199 C 120 188, 244 199, 344 192 C 444 185, 544 194, 640 187 L 640 220 L 0 220 Z"
        fill="var(--primary)"
        opacity="0.09"
      />
      {/* seeds in the soil */}
      <g fill="var(--primary-deep)" opacity="0.22">
        <circle cx="120" cy="196" r="2.4" />
        <circle cx="212" cy="202" r="1.9" />
        <circle cx="348" cy="198" r="2.4" />
        <circle cx="464" cy="204" r="1.9" />
        <circle cx="592" cy="200" r="2.3" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Corner sprig                                                        */
/* ------------------------------------------------------------------ */

export function GardenSprig({
  className,
  variant = "sun",
}: {
  className?: string;
  /** "sun" = top-left corner (leaf stem + small sun); "butterfly" = bottom-right corner (leaf stem + butterfly) */
  variant?: "sun" | "butterfly";
}) {
  if (variant === "sun") {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false" pointerEvents="none">
        <path
          d="M88 92 C 72 76, 54 58, 36 40 C 30 34, 23 27, 16 21"
          fill="none"
          stroke="var(--primary-deep)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path d="M73 79 C 64.5 71.5, 62 61.5, 66 52.5 C 74.5 58.5, 77 69, 73 79 Z" fill="var(--primary)" />
        <path d="M71.6 74.6 C 68 68.6, 66.4 62, 67 56" stroke="var(--primary-deep)" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
        <path d="M55 61 C 47 53.5, 44.8 43.5, 48.4 34.8 C 56.6 40.8, 58.8 51, 55 61 Z" fill="var(--primary-bright)" />
        <path d="M37 43 C 30.6 37, 28.6 28.6, 31.2 21 C 38.2 26.6, 40.2 34.8, 37 43 Z" fill="var(--primary)" />
        <circle cx="17" cy="17" r="10" fill="var(--marigold)" />
        <g stroke="var(--marigold)" strokeWidth="3.2" strokeLinecap="round" opacity="0.8">
          <line x1="17" y1="2" x2="17" y2="6" />
          <line x1="2" y1="17" x2="6" y2="17" />
          <line x1="6.6" y1="6.6" x2="9.4" y2="9.4" />
        </g>
        <circle cx="61" cy="47" r="2.2" fill="var(--terracotta)" opacity="0.75" />
        <circle cx="80" cy="67" r="1.9" fill="var(--terracotta)" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false" pointerEvents="none">
      <path
        d="M12 8 C 26 24, 43 41, 59 57 C 67 65, 75 73, 84 81"
        fill="none"
        stroke="var(--primary-deep)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path d="M28 25 C 36 33, 38.4 43, 34.4 52 C 26.2 46, 24 35.5, 28 25 Z" fill="var(--primary-bright)" />
      <path d="M29.4 29.6 C 33 35.6, 34.6 42, 34 48" stroke="var(--primary-deep)" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M47 44 C 55 52, 57.4 62, 53.4 71 C 45.2 65, 43 54.5, 47 44 Z" fill="var(--primary)" />
      <g>
        <ellipse cx="70" cy="77" rx="5.6" ry="8" transform="rotate(-22 70 77)" fill="var(--terracotta)" />
        <ellipse cx="81" cy="78" rx="5.2" ry="7.4" transform="rotate(22 81 78)" fill="var(--marigold)" />
        <line x1="75.5" y1="70" x2="75.5" y2="87" stroke="var(--primary-deep)" strokeWidth="2.3" strokeLinecap="round" />
      </g>
      <circle cx="41" cy="36" r="2.2" fill="var(--terracotta)" opacity="0.7" />
      <circle cx="23" cy="18" r="1.8" fill="var(--terracotta)" opacity="0.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Botanical line-art marks — stroke-only watermarks for stat cards    */
/* ------------------------------------------------------------------ */

/** Hand-drawn monoline flora for card watermarks: stroke-only, round caps,
 *  seeded so each stat keeps its own plant (same label, same mark). */
export function FloraMark({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const motif = seedIndex(seed, 5);

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden focusable="false" pointerEvents="none">
      {motif === 0 && (
        /* sprig — a curved stem of alternating leaves */
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 58 C 30 44, 34 28, 44 16 C 49 10, 55 7, 59 6" />
          <path d="M33.5 44 C 26 42.5, 21 37, 19.5 30 C 26.5 31.5, 32 37, 33.5 44 Z" />
          <path d="M36 34 C 43 31, 47.5 25.5, 48.5 18.5 C 41.5 21, 37 27, 36 34 Z" />
          <path d="M39 25 C 34 23, 30.5 18.5, 29.8 13 C 35 15, 38 19.5, 39 25 Z" />
          <path d="M44 18 C 45.5 13.5, 48.5 10, 52 8.2" />
        </g>
      )}
      {motif === 1 && (
        /* bloom — stem and a wonky open flower */
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 58 C 31 47, 33 37, 32 27" />
          <path d="M31.5 46 C 25 45, 20.5 40.5, 19.5 34 C 25.5 35.5, 30.5 40, 31.5 46 Z" />
          <path d="M32.6 42 C 38.5 40.5, 42.5 36, 43.5 30 C 37.5 32, 33.5 36.5, 32.6 42 Z" />
          <path d="M32 22 C 37.5 22, 41 26, 40 30.5 C 44.5 33, 44.5 38.5, 40 41 C 38.8 45.5, 32.8 47.5, 29 44.8 C 24.5 46, 20.5 42, 21.5 37.8 C 18 35, 19 29.5, 23.5 28.5 C 24.5 24.5, 28.5 21.5, 32 22 Z" />
          <circle cx="31.5" cy="34" r="3.6" />
        </g>
      )}
      {motif === 2 && (
        /* fern — a stem of curled pinnae */
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 58 C 27 44, 33 28, 46 18 C 51 14.5, 56 12.5, 60 12" />
          <path d="M29 46 C 22.5 44.5, 18 40, 16.8 34.5" />
          <path d="M31 38 C 37.5 35, 41 29.5, 41.5 23.5" />
          <path d="M33 30 C 27 28, 23 23.5, 22 18" />
          <path d="M37 23 C 43 19.5, 46 14, 46 8.5" />
          <path d="M41 18 C 36 15, 33.5 10.5, 33 5.8" />
          <path d="M46 15 C 51.5 11.5, 54 6.5, 54 2" />
        </g>
      )}
      {motif === 3 && (
        /* berry branch */
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 58 C 30 45, 35 32, 46 23 C 51 18.5, 56 16, 60 15" />
          <path d="M31.5 44 C 25 43, 20.5 38.5, 19.5 32.5 C 25.5 34, 30.5 38.5, 31.5 44 Z" />
          <path d="M35 33 C 41.5 31, 45.5 26.5, 46.5 20.5 C 40.5 22.5, 36 27.5, 35 33 Z" />
          <circle cx="42" cy="14" r="4.6" />
          <circle cx="50" cy="19" r="4" />
          <circle cx="47" cy="9.5" r="3.4" />
        </g>
      )}
      {motif === 4 && (
        /* daisy — slim petals around a warm heart */
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 58 C 31 50, 33 41, 32 34" />
          <path d="M31.5 50 C 26 49, 22 45, 21 39.5 C 26.5 40.5, 30.5 44.5, 31.5 50 Z" />
          <path d="M36.5 26 C 34 20.5, 34.5 14.5, 37.5 9.5 C 40.5 14.5, 40 20.5, 36.5 26 Z" />
          <path d="M27.5 26 C 25 20.5, 25.5 14.5, 28.5 9.5 C 31.5 14.5, 31 20.5, 27.5 26 Z" />
          <path d="M43.5 31.5 C 42 25.5, 43.5 19.5, 47.5 15.5 C 49 21, 47.5 27, 43.5 31.5 Z" />
          <path d="M20.5 31.5 C 19 25.5, 20.5 19.5, 24.5 15.5 C 26 21, 24.5 27, 20.5 31.5 Z" />
          <path d="M41 39.5 C 46 35.5, 52.5 34.5, 58 36.5 C 53 40.5, 46.5 41.5, 41 39.5 Z" />
          <path d="M23 39.5 C 18 35.5, 11.5 34.5, 6 36.5 C 11 40.5, 17.5 41.5, 23 39.5 Z" />
          <circle cx="32" cy="32.5" r="4.4" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Deterministic botanical cover for campaigns without a photo         */
/* ------------------------------------------------------------------ */

function seedIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % mod;
}

export function CampaignFlora({
  seed,
  className,
}: {
  seed: string;
  className?: string;
}) {
  const motif = seedIndex(seed, 5);

  return (
    <svg viewBox="0 0 320 144" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden focusable="false" pointerEvents="none">
      {/* soft sun wash, top-left */}
      <circle cx="52" cy="34" r="46" fill="var(--marigold)" opacity="0.12" />
      <circle cx="52" cy="34" r="9" fill="var(--marigold)" opacity="0.5" />

      {motif === 0 && (
        <g>
          {/* sprig — a curved stem of alternating leaves */}
          <path d="M236 138 C 234 112, 244 84, 268 62 C 282 50, 296 44, 306 42" fill="none" stroke="var(--primary-deep)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M244 112 C 232 110, 224 102, 222 92 C 233 93.5, 242 101, 244 112 Z" fill="var(--primary)" />
          <path d="M250 96 C 262 92, 270 83, 272 73 C 261 75.5, 252.5 84, 250 96 Z" fill="var(--primary-bright)" />
          <path d="M258 80 C 248 77.5, 241.5 70.5, 240 62 C 249.5 64, 256 70.5, 258 80 Z" fill="var(--primary)" opacity="0.9" />
          <path d="M268 66 C 278 61, 284 53, 285.5 44 C 276.5 47.5, 270.5 55, 268 66 Z" fill="var(--primary-bright)" opacity="0.9" />
          <circle cx="288" cy="36" r="3.2" fill="var(--marigold)" opacity="0.8" />
          <circle cx="230" cy="60" r="2.4" fill="var(--terracotta)" opacity="0.5" />
        </g>
      )}

      {motif === 1 && (
        <g>
          {/* bloom — stem and a wonky scalloped flower */}
          <path d="M252 138 C 250 116, 254 94, 252 72" fill="none" stroke="var(--primary-deep)" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M251.4 112 C 240 110.4, 233 103, 232 94 C 242.5 95.6, 249.5 103, 251.4 112 Z" fill="var(--primary)" />
          <path d="M252.8 104 C 264 102, 271 94.5, 272 85.5 C 261.5 87.5, 254.5 95, 252.8 104 Z" fill="var(--primary-bright)" />
          <path
            d="M252 44 C 259.5 44, 264 49.2, 262.8 55 C 268 58.6, 268.2 65.6, 262.8 69 C 261.3 74.8, 254.3 77.9, 248.9 75 C 243 76.4, 236.9 71.7, 237.8 65.8 C 232.6 62.1, 233.4 54.6, 239 52.3 C 240.3 46.5, 246.7 42.7, 252 44 Z"
            fill="var(--marigold)"
          />
          <circle cx="250.6" cy="59.5" r="6" fill="var(--terracotta)" />
          <circle cx="248.6" cy="57.5" r="1.5" fill="var(--tint)" opacity="0.85" />
          <circle cx="282" cy="40" r="2.8" fill="var(--primary)" opacity="0.45" />
          <circle cx="226" cy="72" r="2.2" fill="var(--terracotta)" opacity="0.5" />
        </g>
      )}

      {motif === 2 && (
        <g>
          {/* fern — a stem of curled pinnae */}
          <path d="M244 138 C 240 112, 252 88, 276 70 C 288 61, 298 56, 306 54" fill="none" stroke="var(--primary-deep)" strokeWidth="3.2" strokeLinecap="round" />
          <g fill="none" stroke="var(--primary)" strokeWidth="2.6" strokeLinecap="round">
            <path d="M242 118 C 232 116, 226 110, 225 103" />
            <path d="M246 106 C 256 102.5, 261 96, 261.5 88.5" />
            <path d="M252 94 C 243 91, 238 85, 237.5 78.5" />
            <path d="M258 83 C 267 78.5, 271.5 71.5, 271.5 64" />
            <path d="M266 73 C 258 69.5, 254 63.5, 253.5 57" />
            <path d="M274 64 C 282 59, 286 52.5, 286 45.5" />
          </g>
          <g fill="none" stroke="var(--primary-bright)" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
            <path d="M242 118 C 238 112, 237.5 107, 239 103" />
            <path d="M252 94 C 250 88.5, 250.5 83.5, 252.5 79.5" />
            <path d="M266 73 C 263.5 68, 263 63.5, 264.5 59.5" />
          </g>
          <circle cx="292" cy="38" r="3" fill="var(--marigold)" opacity="0.75" />
          <circle cx="228" cy="92" r="2.2" fill="var(--terracotta)" opacity="0.5" />
        </g>
      )}

      {motif === 3 && (
        <g>
          {/* berry branch */}
          <path d="M240 138 C 240 114, 250 92, 272 74 C 284 64, 295 58, 304 55" fill="none" stroke="var(--primary-deep)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M246 112 C 235 110.4, 228.5 103.5, 227.5 95 C 237.5 96.6, 244.4 103.5, 246 112 Z" fill="var(--primary-bright)" />
          <path d="M256 96 C 267 93.6, 274 86.5, 275 77.5 C 264.5 80, 257.6 87, 256 96 Z" fill="var(--primary)" />
          <g fill="var(--primary-deep)">
            <circle cx="266" cy="70" r="6.5" />
            <circle cx="279" cy="63" r="5.8" />
            <circle cx="272" cy="57" r="5.2" />
          </g>
          <circle cx="277" cy="64" r="1.6" fill="var(--tint)" opacity="0.6" />
          <g fill="var(--marigold)">
            <circle cx="293" cy="46" r="5.4" />
            <circle cx="301" cy="52" r="4.4" />
            <circle cx="296" cy="56" r="3.8" />
          </g>
          <circle cx="232" cy="80" r="2.4" fill="var(--terracotta)" opacity="0.5" />
        </g>
      )}

      {motif === 4 && (
        <g>
          {/* daisy — slim uneven petals around a warm heart */}
          <path d="M250 138 C 248 118, 252 98, 250 80" fill="none" stroke="var(--primary-deep)" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M249.4 116 C 239 114.4, 232.5 107.5, 231.5 99 C 241.5 100.6, 248.4 107.5, 249.4 116 Z" fill="var(--primary)" />
          <g fill="var(--primary-bright)">
            <path d="M250 62 C 246.5 55, 246.5 48, 250 42 C 253.5 48, 253.5 55, 250 62 Z" />
            <path d="M262 66 C 259 59.5, 259.4 52.5, 263 47 C 266.2 53, 266 60, 262 66 Z" opacity="0.95" />
            <path d="M238 66 C 235 60, 235.4 53, 239 47.5 C 242.2 53.5, 242 60.5, 238 66 Z" opacity="0.95" />
            <path d="M271 74 C 269 67.5, 269.8 61, 273.5 56 C 276.2 62, 275.6 69, 271 74 Z" opacity="0.9" />
            <path d="M229 75 C 227 68.5, 227.8 62, 231.5 57 C 234.2 63, 233.6 70, 229 75 Z" opacity="0.9" />
          </g>
          <circle cx="250.5" cy="72" r="7.5" fill="var(--terracotta)" />
          <circle cx="248" cy="69.5" r="1.9" fill="var(--tint)" opacity="0.8" />
          <circle cx="284" cy="42" r="2.8" fill="var(--marigold)" opacity="0.75" />
          <circle cx="224" cy="96" r="2.2" fill="var(--terracotta)" opacity="0.5" />
        </g>
      )}

      {/* shared floating seeds */}
      <g fill="var(--primary)" opacity="0.3">
        <circle cx="96" cy="86" r="2.4" />
        <circle cx="150" cy="58" r="1.9" />
        <circle cx="188" cy="98" r="2.2" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hand-drawn vine connector (pairs with [data-reveal])                */
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
      <path
        d="M10 0 C 5.5 18, 14.5 32, 10 50 C 6.2 66, 14 82, 10 100"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
        pathLength={1}
      />
    </svg>
  );
}
