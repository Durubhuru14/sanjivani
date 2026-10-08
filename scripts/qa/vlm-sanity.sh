#!/usr/bin/env bash
# Final UI sanity VLM pass over the post-fix screenshots.
set -u
SHOTS=/home/z/my-project/scripts/qa/shots
OUT=/home/z/my-project/scripts/qa/vlm
mkdir -p "$OUT"

PROMPT='You are a senior product designer performing a FINAL pre-ship sanity check of "Sanjivani", an NGO/volunteer platform. Design system: warm green brand, card-based UI, rounded-xl corners, soft shadows, generous whitespace.

These screenshots were taken AFTER a behavioral bug-fix round (auth/middleware/networking fixes — no visual changes were intended). Your job: confirm NOTHING visually regressed and the pages still follow the design system.

For each image (in order, Image 1, Image 2, ...), report:
- PAGE: what page it is
- VERDICT: CLEAN or ISSUES
- If issues: [SEVERITY: critical|moderate|minor] + location + what is wrong (only visually observable problems: broken CSS, unstyled elements, missing fonts/icons, overlapping or clipped content, unequal cards in one grid, misaligned buttons, horizontal overflow).
- Do NOT report: content/copy, business logic, data values, or anything requiring interaction.
Be precise and concise.'

run () {
  local name="$1"; shift
  local args=()
  for f in "$@"; do args+=(-i "$SHOTS/$f"); done
  echo "=== auditing $name ==="
  z-ai vision -p "$PROMPT" "${args[@]}" -o "$OUT/$name.json" 2>&1 | tail -1
}

run desktop sanity-landing.png sanity-login.png sanity-admin.png sanity-ngo.png sanity-ngo-campaign.png
run users sanity-volunteer.png sanity-volunteer-browse.png sanity-staff.png
run mobile sanity-admin-mobile.png sanity-ngo-mobile.png sanity-volunteer-mobile.png
