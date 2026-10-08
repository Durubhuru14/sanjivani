#!/usr/bin/env bash
# Task 3-d public-section VLM designer pass over after-* screenshots.
set -u
SHOTS=/home/z/my-project/scripts/ux-audit/shots
OUT=/home/z/my-project/scripts/ux-audit/vlm
mkdir -p "$OUT"

PROMPT='You are a senior product designer performing a meticulous visual-consistency and UX audit of "Sanjivani", an NGO/volunteer platform (Next.js + shadcn/ui + Tailwind). Its design system: warm green brand (#2E7D32 primary, #E8F5E9 tint), card-based UI, rounded-xl corners, soft shadows, generous whitespace, clean and minimal. This is the PUBLIC marketing + auth surface.

Inspect the attached screenshot(s) with the eye of a designer who cares about VISUAL RHYTHM. Hunt specifically for:
1. GRID & SIZE CONSISTENCY — cards in the same row/grid with unequal widths or heights; misaligned edges or baselines.
2. SPACING RHYTHM — inconsistent paddings inside similar cards; uneven vertical gaps between sections; cramped or orphan whitespace.
3. TYPOGRAPHY HIERARCHY — inconsistent heading sizes for the same logical role; wrapping text that breaks layout; inconsistent muted-text colors or contrast that is too low.
4. COMPONENT CONSISTENCY — buttons of mismatched sizes side by side; pills/chips with different radii or padding; inconsistent icon sizing; demo-account chips with ragged heights.
5. ALIGNMENT & LAYOUT — elements not aligned to the content column; horizontal overflow; off-center elements that look accidental.
6. COLOR & STATE — inconsistent status color language; low-contrast text (especially dark mode); washed-out footer text.
7. UX POLISH — awkward truncation, buttons at odd positions, sticky-header bleed-through.

For EACH image (refer to them in order as Image 1, Image 2, ...), report:
- PAGE: what page it is
- ISSUES: numbered list; each issue = [SEVERITY: critical|moderate|minor] + precise location + what is wrong + why it breaks visual rhythm
- Do NOT report content/copy quality, business logic, or interaction-only concerns. Only what is visually observable.
- If a page is visually consistent, say so explicitly with "CLEAN" plus anything borderline.
Be exhaustive and precise — this is the final QA pass before shipping.'

run () { # run <name> <files...>
  local name="$1"; shift
  local args=()
  for f in "$@"; do args+=(-i "$SHOTS/$f"); done
  echo "=== auditing $name ==="
  z-ai vision -p "$PROMPT" "${args[@]}" -o "$OUT/$name.json" 2>&1 | tail -1
}

run 3d-landing-light after-landing-top.png after-landing-marquee-stats.png after-landing-features.png after-landing-how-it-works.png after-landing-closing-footer.png
run 3d-landing-dark after-landing-top-dark.png after-landing-stats-dark.png after-landing-features-dark.png after-landing-closing-dark.png after-landing-footer-dark.png
run 3d-auth after-login-desktop.png after-signup-desktop.png after-signup-ngo-selected.png after-suspended-desktop.png
run 3d-auth-dark after-login-dark.png after-signup-dark.png after-suspended-dark.png
run 3d-mobile after-landing-mobile-top.png after-landing-mobile-footer.png after-login-mobile.png after-signup-mobile.png after-suspended-mobile.png

echo "AUDIT COMPLETE"
