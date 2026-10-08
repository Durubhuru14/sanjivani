#!/usr/bin/env python3
"""Regenerate the 4 demo campaign banners as ONE consistent visual family:
same 640x240 frame, same diagonal gradient structure, same concentric-arc
motif top-right; per-campaign variation = hue + a single white glyph."""
import pathlib

OUT = pathlib.Path("/home/z/my-project/public/demo")

# hue pairs: (dark, light) — all in the green/teal family, same saturation feel
CAMPAIGNS = [
    ("campaign-river.svg", "River clean-up", ("#00695C", "#26A69A"), "drop"),
    ("campaign-tutoring.svg", "After-school tutoring", ("#1B5E20", "#43A047"), "book"),
    ("campaign-trees.svg", "Tree plantation", ("#33691E", "#7CB342"), "tree"),
    ("campaign-health.svg", "Health camps", ("#2E7D32", "#66BB6A"), "cross"),
]

GLYPHS = {
    # single glyph, drawn around origin (0,0), ~56 units tall
    "drop": """<path d="M 0 -28 C 14 -8 22 2 22 12 A 22 22 0 0 1 -22 12 C -22 2 -14 -8 0 -28 Z"/>""",
    "book": """<path d="M -26 -20 C -16 -24 -6 -24 0 -18 C 6 -24 16 -24 26 -20 L 26 18 C 16 14 6 14 0 20 C -6 14 -16 14 -26 18 Z M 0 -18 L 0 20"/>""",
    "tree": """<path d="M 0 -30 L 22 4 L 10 4 L 24 24 L -24 24 L -10 4 L -22 4 Z M -4 24 L -4 34 L 4 34 L 4 24 Z"/>""",
    "cross": """<path d="M -8 -26 h 16 v 18 h 18 v 16 h -18 v 18 h -16 v -18 h -18 v -16 h 18 Z"/>""",
}

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{dark}"/><stop offset="1" stop-color="{light}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="240" fill="url(#bg)"/>
  <!-- shared motif: concentric arcs, top-right -->
  <circle cx="520" cy="96" r="40" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="520" cy="96" r="74" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>
  <circle cx="520" cy="96" r="108" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>
  <!-- campaign glyph, same slot every time -->
  <g transform="translate(520, 96) scale(0.85)" fill="#ffffff" fill-opacity="0.22" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" stroke-linejoin="round">
    {glyph}
  </g>
  <!-- shared ground line -->
  <path d="M 0 214 C 120 204 220 222 340 214 C 460 206 560 220 640 212 L 640 240 L 0 240 Z" fill="#ffffff" opacity="0.08"/>
</svg>
"""

for fname, label, (dark, light), glyph_key in CAMPAIGNS:
    svg = TEMPLATE.format(label=label, dark=dark, light=light, glyph=GLYPHS[glyph_key])
    (OUT / fname).write_text(svg, encoding="utf-8")
    print(f"wrote {fname} ({len(svg)} bytes)")
