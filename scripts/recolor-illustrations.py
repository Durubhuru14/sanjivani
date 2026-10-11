#!/usr/bin/env python3
"""Recolor the downloaded Storyset illustrations into the Sanjivini green
ledger palette and install them under public/illustrations/.

Source license: free with attribution (storyset.com, art by Freepik).
The palette swap below only touches the accent hues that clash with the
product's identity; the ink (#263238), neutral greys, skin tones and the
coral accent stay untouched — that combination is what makes the artwork
feel warm and humane rather than clip-arty.
"""
import re
import shutil
from pathlib import Path

STAGE = Path("/tmp/illustrations-staging")
DEST = Path("/home/z/my-project/public/illustrations")

# case-insensitive hex -> hex (applied to fill:, stroke: and bare fills)
MAP = {
    "ba68c8": "66bb6a",  # Pana purple accent -> leaf bright
    "407bff": "4caf50",  # Pana blue accent   -> green 500
    "ffc727": "dfa737",  # Pana yellow        -> marigold (brand)
    "fafafa": "f7f2e5",  # floor ellipse      -> warm paper (--background, seamless blend)
}

CREDITS = """# Illustration credits

All scene illustrations in `human/` and `nature/` are from
[Storyset](https://storyset.com) — free illustration sets by Freepik
(Pana / Cuate / Rafiki styles), used under the Storyset license
(free for personal and commercial use **with attribution**).

- Source: https://storyset.com
- Art by: Freepik (stories.freepiklabs.com)
- Modification: accent hues remapped to the Sanjivini palette
  (purple -> leaf green, yellow -> marigold, floor -> warm paper);
  everything else is the original artwork.

Small interface glyphs (timeline stages, stat-card watermarks) are from
[Lucide](https://lucide.dev) (ISC license), rendered inline.

If you ship Sanjivini publicly, keep this file (or an equivalent credit
line in your README) so the attribution requirement is met.
"""


def recolor(svg: str) -> tuple[str, int]:
    count = 0

    def sub(m: re.Match) -> str:
        nonlocal count
        hexv = m.group(1).lower()
        if hexv in MAP:
            count += 1
            return m.group(0).replace(m.group(1), MAP[hexv])
        return m.group(0)

    out = re.sub(r"#([0-9a-fA-F]{6})\b", sub, svg)
    return out, count


def main() -> None:
    if DEST.exists():
        shutil.rmtree(DEST)
    total_swaps = 0
    files = 0
    for cat in ("human", "nature"):
        outdir = DEST / cat
        outdir.mkdir(parents=True, exist_ok=True)
        for src in sorted((STAGE / cat).glob("*.svg")):
            svg = src.read_text(encoding="utf-8", errors="ignore")
            svg, n = recolor(svg)
            # keep the xml prologue off — inline <svg> is fine for <img> too
            outdir.joinpath(src.name).write_text(svg, encoding="utf-8")
            total_swaps += n
            files += 1
            print(f"  {cat}/{src.name}: {n} color swaps")
    (DEST / "CREDITS.md").write_text(CREDITS, encoding="utf-8")
    print(f"\ninstalled {files} illustrations into {DEST} ({total_swaps} recolors)")


if __name__ == "__main__":
    main()
