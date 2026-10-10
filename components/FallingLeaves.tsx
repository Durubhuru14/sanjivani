/**
 * Decorative layer of leaf silhouettes drifting down through the hero —
 * mostly new-leaf green with a couple of marigold sun flecks, like a
 * garden breeze. Pure CSS animation (see .animate-leaf in globals.css);
 * fully hidden from assistive tech and switched off under
 * prefers-reduced-motion.
 */
const LEAVES = [
  { left: "8%", size: 13, duration: 20, delay: 0, opacity: 0.26, tone: "leaf" },
  { left: "26%", size: 9, duration: 26, delay: 7, opacity: 0.2, tone: "sun" },
  { left: "47%", size: 16, duration: 17, delay: 3, opacity: 0.28, tone: "leaf" },
  { left: "69%", size: 10, duration: 24, delay: 11, opacity: 0.22, tone: "leaf" },
  { left: "88%", size: 12, duration: 21, delay: 5, opacity: 0.24, tone: "sun" },
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
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className={`animate-leaf absolute -top-6 block ${leaf.tone === "sun" ? "text-marigold" : "text-leaf"}`}
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
