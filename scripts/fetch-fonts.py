#!/usr/bin/env python3
"""Download latin woff2 subsets for the Sanjivani type system into app/fonts/
with friendly names for next/font/local.

Warm-community retheme (NGO/social-work identity):
  Display: Fraunces (400/500/600) — soft humanist serif, editorial warmth
  Body/UI: Albert Sans (400/500/600/700) — humanist, friendly for staff
Alumni Sans (the old condensed display face) was retired with this change.
"""
import re, pathlib, subprocess

CSS_DIR = pathlib.Path("/tmp/fonts")
OUT = pathlib.Path("/home/z/my-project/app/fonts")
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"

FAMILIES = [
    ("Fraunces", ["400", "500", "600"]),
    ("Albert Sans", ["400", "500", "600", "700"]),
]

def css_url(family: str, weight: str) -> str:
    q = family.replace(" ", "+") + f":wght@{weight}"
    return f"https://fonts.googleapis.com/css2?family={q}&display=swap"

for family, weights in FAMILIES:
    for weight in weights:
        css = subprocess.run(
            ["curl", "-s", css_url(family, weight), "-A", UA],
            capture_output=True, text=True, check=True).stdout
        # split into @font-face blocks, keep the one whose unicode-range covers basic latin (U+0000-00FF)
        blocks = re.findall(r"@font-face\s*\{[^}]+\}", css)
        latin = None
        for b in blocks:
            if "U+0000-00FF" in b:
                latin = b
                break
        if latin is None:
            raise SystemExit(f"no latin block for {family} {weight}")
        url = re.search(r"url\((https://[^)]+\.woff2)\)", latin).group(1)
        slug = family.replace(" ", "")
        dest = OUT / f"{slug}-{weight}.woff2"
        subprocess.run(["curl", "-s", url, "-o", str(dest)], check=True)
        size = dest.stat().st_size
        print(f"{dest.name:26s} {size/1024:7.1f} KB  <- {url}")

# also fetch a mono? use system stack instead (ui-monospace, SFMono, Consolas)
print("done")
