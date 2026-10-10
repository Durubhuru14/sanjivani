#!/usr/bin/env bash
# VLM design review of the "hand-crafted ledger" skin.
set -u
SHOTS=/home/z/my-project/scripts/qa/shots-ledger
OUT=/home/z/my-project/scripts/qa/vlm
mkdir -p "$OUT"

PROMPT='You are a senior UI/UX design director reviewing the NEW visual skin of "Sanjivani", an NGO volunteer-management platform. Design brief: "hand-crafted ledger" — warm paper ground, spec green #2E7D32 used as ink, terracotta + marigold accents, Fraunces display serif, pill buttons, letterpress shadows, hand-drawn botanical illustrations (growth timeline, hands cupping a sprout, garden horizon), a deep forest-green stat band, humane empty-state vignettes. Goal: a humane, $10,000-agency-quality look that says "this platform helps people" — NOT futuristic, NOT SaaS-generic, NOT childish.

For each image IN ORDER (Image 1, Image 2, ...), report:
- PAGE: what it shows
- SCORE: 1-10 for (a) beauty/polish, (b) humane NGO character, (c) hierarchy/typography
- TOP 2 SPECIFIC WINS (what looks premium)
- TOP 2 SPECIFIC PROBLEMS (be brutally concrete: spacing, contrast, alignment, illustration quality, anything reading clip-art/amateur/ugly)
- VERDICT: SHIP or FIX (with the single most important fix)

Also answer at the end:
1. Does the design read as "premium humane NGO" or still "template/SaaS"? Why?
2. Do the illustrations look hand-crafted and charming, or clip-art? Be honest.
3. Any place where the green/terracotta/marigold palette feels off?
4. Is dark mode equally polished?
Be concise but specific — locations, elements, values.'

run () {
  local name="$1"; shift
  local args=()
  for f in "$@"; do args+=(-i "$SHOTS/$f"); done
  echo "=== reviewing $name ==="
  z-ai vision -p "$PROMPT" "${args[@]}" -o "$OUT/ledger-$name.json" 2>&1 | tail -1
}

run landing landing-1280.png landing-768.png landing-320.png
run auth login-1280.png signup-1280.png login-320.png
run dashboards admin-1280.png ngo-1280.png volunteer-1280.png staff-1280.png
run mobile admin-375.png ngo-320.png volunteer-320.png staff-375.png
run dark landing-1280-dark.png login-1280-dark.png admin-1280-dark.png
run dense admin-ngos-375.png ngo-campaigns-1280.png vol-browse-1280.png
