/**
 * GardenArt — the platform's humane illustration set.
 *
 * Flat, hand-drawn-feeling botanical scenes rendered as inline SVG with
 * fills taken from the CSS custom properties (--primary, --primary-bright,
 * --primary-deep, --tint, --terracotta, --marigold), so every illustration
 * re-skins itself in light and dark mode with zero JS. Purely decorative:
 * aria-hidden, unfocusable, and never intercepts pointer events.
 *
 *  - GardenBed   wide "growing garden" horizon: seedling → plant → bush →
 *                sapling → bloom, with a sun, birds, and a butterfly.
 *                Used as a grounding strip under closing sections and in
 *                the auth brand panels.
 *  - GardenSprig a corner sprig that peeks out from behind a card corner
 *                ("sun" for the top-left, "butterfly" for the bottom-right),
 *                like a leaf tucked behind a notice-board card.
 */

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
      {/* sun with soft rounded rays */}
      <circle cx="540" cy="52" r="23" fill="var(--marigold)" opacity="0.92" />
      <g stroke="var(--marigold)" strokeWidth="5" strokeLinecap="round" opacity="0.7">
        <line x1="540" y1="19" x2="540" y2="9" />
        <line x1="563" y1="29" x2="570" y2="22" />
        <line x1="573" y1="52" x2="583" y2="52" />
        <line x1="563" y1="75" x2="570" y2="82" />
        <line x1="517" y1="75" x2="510" y2="82" />
        <line x1="507" y1="52" x2="497" y2="52" />
        <line x1="517" y1="29" x2="510" y2="22" />
      </g>

      {/* birds */}
      <path
        d="M236 44 q 7 -9 14 0 q 7 -9 14 0"
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M288 68 q 5.5 -7 11 0 q 5.5 -7 11 0"
        fill="none"
        stroke="var(--terracotta)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* butterfly near the bloom */}
      <g>
        <ellipse cx="573" cy="112" rx="6.5" ry="9.5" transform="rotate(-22 573 112)" fill="var(--terracotta)" />
        <ellipse cx="585" cy="112" rx="6.5" ry="9.5" transform="rotate(22 585 112)" fill="var(--marigold)" />
        <line x1="579" y1="103" x2="579" y2="121" stroke="var(--primary-deep)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* stage 1 — seedling in its mound */}
      <ellipse cx="70" cy="175" rx="24" ry="8" fill="var(--terracotta)" opacity="0.28" />
      <path d="M70 172 C 70 163 70 156 70 149" fill="none" stroke="var(--primary-deep)" strokeWidth="4" strokeLinecap="round" />
      <path d="M70 151 C 62 149 56 143 56 136 C 64 136 70 142 70 151 Z" fill="var(--primary-bright)" />
      <path d="M70 151 C 78 149 84 143 84 136 C 76 136 70 142 70 151 Z" fill="var(--primary)" />

      {/* stage 2 — leafy plant */}
      <path d="M170 176 C 169 160 171 146 170 130" fill="none" stroke="var(--primary-deep)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M170 141 C 158 139 150 131 150 123 C 160 123 168 131 170 141 Z" fill="var(--primary)" />
      <path d="M170 141 C 182 139 190 131 190 123 C 180 123 172 131 170 141 Z" fill="var(--primary-bright)" />
      <path d="M170 155 C 159 153 152 146 152 139 C 161 139 168 146 170 155 Z" fill="var(--primary-bright)" />
      <path d="M170 155 C 181 153 188 146 188 139 C 179 139 172 146 170 155 Z" fill="var(--primary)" />
      <path d="M170 130 C 162 126 158 119 159 112 C 167 114 171 121 170 130 Z" fill="var(--primary)" />
      <path d="M170 130 C 178 126 182 119 181 112 C 173 114 169 121 170 130 Z" fill="var(--primary-bright)" />

      {/* stage 3 — leafy bush with berries */}
      <circle cx="278" cy="159" r="16" fill="var(--primary-deep)" />
      <circle cx="302" cy="159" r="16" fill="var(--primary)" />
      <circle cx="290" cy="145" r="18" fill="var(--primary-bright)" />
      <circle cx="286" cy="168" r="3" fill="var(--marigold)" />
      <circle cx="298" cy="166" r="3" fill="var(--marigold)" />

      {/* stage 4 — young sapling */}
      <path d="M410 176 C 409 162 411 152 410 143" fill="none" stroke="var(--terracotta)" strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <path d="M410 153 C 402 149 398 143 397 137" fill="none" stroke="var(--terracotta)" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
      <circle cx="410" cy="119" r="25" fill="var(--primary)" />
      <circle cx="393" cy="129" r="15" fill="var(--primary-deep)" />
      <circle cx="426" cy="127" r="14" fill="var(--primary-bright)" />

      {/* stage 5 — tall bloom */}
      <path d="M520 176 C 519 158 521 140 520 123" fill="none" stroke="var(--primary-deep)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M520 152 C 532 150 540 142 540 134 C 530 134 522 142 520 152 Z" fill="var(--primary)" />
      <g fill="var(--marigold)">
        <circle cx="520" cy="108" r="13" />
        <circle cx="508" cy="102" r="6" />
        <circle cx="532" cy="102" r="6" />
        <circle cx="508" cy="114" r="6" />
        <circle cx="532" cy="114" r="6" />
        <circle cx="520" cy="95" r="6" />
        <circle cx="520" cy="121" r="6" />
      </g>
      <circle cx="520" cy="108" r="6" fill="var(--terracotta)" />

      {/* little sprout ticks between the stages */}
      <g fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M120 176 C 120 171 120 167 120 163" />
        <path d="M346 176 C 346 172 346 168 346 164" />
        <path d="M462 178 C 462 174 462 170 462 166" />
      </g>

      {/* rolling ground */}
      <path
        d="M0 178 C 80 162 150 170 224 176 C 300 182 356 162 436 162 C 516 162 578 176 640 168 L 640 220 L 0 220 Z"
        fill="var(--tint)"
      />
      <path
        d="M0 198 C 120 188 240 198 340 192 C 440 186 540 194 640 188 L 640 220 L 0 220 Z"
        fill="var(--primary)"
        opacity="0.08"
      />
      {/* seeds in the soil */}
      <g fill="var(--primary-deep)" opacity="0.22">
        <circle cx="120" cy="196" r="2.5" />
        <circle cx="212" cy="202" r="2" />
        <circle cx="346" cy="198" r="2.5" />
        <circle cx="462" cy="204" r="2" />
        <circle cx="590" cy="200" r="2.5" />
      </g>
    </svg>
  );
}

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
        {/* stem sweeping away from the card corner */}
        <path
          d="M88 92 C 70 74 52 56 34 38 C 28 32 22 26 16 21"
          fill="none"
          stroke="var(--primary-deep)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* alternating leaves along the stem */}
        <path d="M74 78 C 66 70 64 60 68 52 C 76 58 78 68 74 78 Z" fill="var(--primary)" />
        <path d="M56 60 C 48 52 46 42 50 34 C 58 40 60 50 56 60 Z" fill="var(--primary-bright)" />
        <path d="M38 42 C 32 36 30 28 32 20 C 40 26 42 34 38 42 Z" fill="var(--primary)" />
        {/* small sun at the stem's reach */}
        <circle cx="17" cy="17" r="10.5" fill="var(--marigold)" />
        <g stroke="var(--marigold)" strokeWidth="3.5" strokeLinecap="round" opacity="0.8">
          <line x1="17" y1="1.5" x2="17" y2="6" />
          <line x1="1.5" y1="17" x2="6" y2="17" />
          <line x1="6.5" y1="6.5" x2="9.5" y2="9.5" />
        </g>
        {/* berry dots */}
        <circle cx="63" cy="49" r="2.5" fill="var(--terracotta)" opacity="0.8" />
        <circle cx="80" cy="66" r="2" fill="var(--terracotta)" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false" pointerEvents="none">
      {/* stem sweeping away from the card corner */}
      <path
        d="M12 8 C 26 24 42 40 58 56 C 66 64 74 72 82 80"
        fill="none"
        stroke="var(--primary-deep)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* alternating leaves along the stem */}
      <path d="M30 26 C 38 34 40 44 36 52 C 28 46 26 36 30 26 Z" fill="var(--primary-bright)" />
      <path d="M48 44 C 56 52 58 62 54 70 C 46 64 44 54 48 44 Z" fill="var(--primary)" />
      {/* butterfly resting at the stem's reach */}
      <ellipse cx="71" cy="78" rx="6" ry="8.5" transform="rotate(-22 71 78)" fill="var(--terracotta)" />
      <ellipse cx="83" cy="78" rx="6" ry="8.5" transform="rotate(22 83 78)" fill="var(--marigold)" />
      <line x1="77" y1="70" x2="77" y2="87" stroke="var(--primary-deep)" strokeWidth="2.5" strokeLinecap="round" />
      {/* berry dots */}
      <circle cx="42" cy="38" r="2.5" fill="var(--terracotta)" opacity="0.7" />
      <circle cx="24" cy="20" r="2" fill="var(--terracotta)" opacity="0.55" />
    </svg>
  );
}
