#!/usr/bin/env python3
"""Generate seeded demo media: avatars, NGO logos, campaign banners (SVG).

All art stays inside the Sanjivani green family (spec §3) with a few
neighbouring botanical hues so the demo looks alive without feeling
random. Files land in public/demo/ and are referenced by the demo store.
"""
import pathlib

OUT = pathlib.Path("/home/z/my-project/public/demo")
OUT.mkdir(parents=True, exist_ok=True)

GRADIENTS = [
    ("#2E7D32", "#66BB6A"),
    ("#00695C", "#26A69A"),
    ("#558B2F", "#9CCC65"),
    ("#1B5E20", "#43A047"),
    ("#33691E", "#8BC34A"),
    ("#2E5D50", "#7DCFB4"),
    ("#4E342E", "#A1887F"),
    ("#37474F", "#78909C"),
    ("#3E2723", "#8D6E63"),
    ("#1A4D2E", "#4E9F5F"),
    ("#0F5132", "#71B280"),
    ("#3F6212", "#84A83C"),
]

def initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    return (parts[0][0] + (parts[-1][0] if len(parts) > 1 else "")).upper()

def avatar(name: str, idx: int) -> str:
    a, b = GRADIENTS[idx % len(GRADIENTS)]
    ini = initials(name)
    dot = 7 if idx % 2 else 11
    dots = "".join(
        f'<circle cx="{x}" cy="{y}" r="1.6" fill="#ffffff" opacity="0.28"/>'
        for x in range(10, 90, dot)
        for y in range(10, 90, dot)
        if (x + y) % (dot * 2) == 0
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="{name}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" fill="url(#g)"/>
  {dots}
  <circle cx="48" cy="48" r="34" fill="#ffffff" opacity="0.12"/>
  <text x="48" y="48" text-anchor="middle" dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600"
    fill="#ffffff" letter-spacing="1">{ini}</text>
</svg>'''

PEOPLE = [
    "Platform Admin",
    "Green Earth Foundation",
    "Bright Futures Trust",
    "New Hope Collective",
    "Meera Deshpande",
    "Arvind Kulkarni",
    "Priya Sharma",
    "Rahul Patil",
    "Aisha Khan",
    "Vikram Joshi",
    "Sneha Iyer",
    "Tarun Mehta",
]

for i, name in enumerate(PEOPLE):
    slug = name.lower().replace(" ", "-").replace(".", "")
    (OUT / f"avatar-{slug}.svg").write_text(avatar(name, i))

# ---- NGO logos: emblem marks -------------------------------------------
def logo(kind: str, a: str, b: str, label: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="88" height="88" rx="22" fill="url(#g)"/>
  <rect x="4" y="4" width="88" height="88" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>
  {kind}
</svg>'''

TREE = '''<path d="M48 18 L64 44 L54 44 L66 62 L52 62 L52 74 L44 74 L44 62 L30 62 L42 44 L32 44 Z" fill="#ffffff" opacity="0.94"/>'''
HANDS = '''<path d="M34 30 C 28 40 28 52 36 62 L 36 74 L 44 74 L 44 62 C 48 52 46 40 42 34 Z" fill="#ffffff" opacity="0.94"/>
<path d="M62 30 C 68 40 68 52 60 62 L 60 74 L 52 74 L 52 62 C 48 52 50 40 54 34 Z" fill="#ffffff" opacity="0.75"/>'''
SEED = '''<circle cx="48" cy="40" r="16" fill="#ffffff" opacity="0.9"/>
<path d="M48 56 L48 72 M48 62 C 40 62 36 58 34 52 M48 62 C 56 62 60 58 62 52" stroke="#ffffff" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.9"/>'''

(OUT / "logo-green-earth.svg").write_text(logo(TREE, "#2E7D32", "#66BB6A", "Green Earth Foundation"))
(OUT / "logo-bright-futures.svg").write_text(logo(HANDS, "#00695C", "#26A69A", "Bright Futures Trust"))
(OUT / "logo-new-hope.svg").write_text(logo(SEED, "#558B2F", "#9CCC65", "New Hope Collective"))

# ---- Campaign banners ----------------------------------------------------
def banner(a: str, b: str, motif: str, label: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="240" fill="url(#bg)"/>
  {motif}
  <rect width="640" height="240" fill="#0e1712" opacity="0.12"/>
</svg>'''

rings = "".join(
    f'<circle cx="560" cy="120" r="{r}" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2"/>'
    for r in range(40, 200, 34)
)
dots = "".join(
    f'<circle cx="{x}" cy="{y}" r="3" fill="#ffffff" opacity="0.22"/>'
    for x in range(24, 640, 44)
    for y in range(24, 240, 44)
)
leaves = "".join(
    f'<path d="M {x} 190 C {x-14} 160 {x-10} 130 {x+8} 118 C {x+22} 148 {x+18} 176 {x} 190 Z" fill="#ffffff" opacity="0.16"/>'
    for x in (60, 180, 300, 420, 540)
)
sun = '<circle cx="520" cy="70" r="42" fill="#ffffff" opacity="0.2"/><circle cx="520" cy="70" r="26" fill="#ffffff" opacity="0.28"/>'

(OUT / "campaign-tutoring.svg").write_text(banner("#1B5E20", "#43A047", rings, "After-school tutoring"))
(OUT / "campaign-river.svg").write_text(banner("#00695C", "#26A69A", sun, "River clean-up"))
(OUT / "campaign-trees.svg").write_text(banner("#558B2F", "#9CCC65", leaves, "Tree plantation"))
(OUT / "campaign-health.svg").write_text(banner("#2E7D32", "#66BB6A", dots, "Health camps"))

print("generated:", len(list(OUT.glob("*.svg"))), "files in", OUT)
