/**
 * Decorative layer of leaf silhouettes drifting down through the hero.
 * Pure CSS animation (see .animate-leaf in globals.css); fully hidden
 * from assistive tech and switched off under prefers-reduced-motion.
 */
const LEAVES = [
  { left: "6%", size: 14, duration: 17, delay: 0, opacity: 0.34 },
  { left: "17%", size: 10, duration: 22, delay: 3.5, opacity: 0.26 },
  { left: "29%", size: 18, duration: 15, delay: 6, opacity: 0.3 },
  { left: "44%", size: 9, duration: 26, delay: 1.5, opacity: 0.22 },
  { left: "58%", size: 13, duration: 19, delay: 8, opacity: 0.32 },
  { left: "71%", size: 11, duration: 24, delay: 4.5, opacity: 0.24 },
  { left: "83%", size: 16, duration: 16, delay: 2, opacity: 0.3 },
  { left: "93%", size: 9, duration: 21, delay: 10, opacity: 0.2 },
] as const;

function Leaf({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden focusable="false">
      <path
        d="M12 2 C 6 7 4 12 5 17 C 10 18 16 16 19 9 C 20 6 19 3 17 2 C 15.5 4 14 6.5 12 8 C 10 6.5 8.5 4 12 2 Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function FallingLeaves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-leaf" aria-hidden>
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className="animate-leaf absolute -top-6 block"
          style={
            {
              left: leaf.left,
              "--leaf-opacity": leaf.opacity,
              animationDuration: `${leaf.duration}s`,
              animationDelay: `${leaf.delay}s`,
            } as React.CSSProperties
          }
        >
          <Leaf size={leaf.size} />
        </span>
      ))}
    </div>
  );
}
