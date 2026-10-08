#!/usr/bin/env bash
# Task 3-c VLM designer audit over the after-* screenshots.
set -u
SHOTS=/home/z/my-project/scripts/ux-audit/shots
OUT=/home/z/my-project/scripts/ux-audit/vlm
mkdir -p "$OUT"

PROMPT='You are a senior product designer performing the FINAL visual-consistency QA of the volunteer + staff + chat sections of "Sanjivani", an NGO/volunteer platform (Next.js + shadcn/ui + Tailwind). Design system: warm green brand, card-based UI, rounded corners, soft shadows, generous whitespace. Shared contract every page must follow: canonical page header (back link + title + subtitle, actions right); stat tiles equal height in one row; status chips only via one StatusBadge component; list rows = truncated title + muted subtitle left, badge/actions right; buttons size sm outline for row actions, solid for page primary; dashboards 32px section rhythm; empty states via one shared component.

Inspect the attached screenshots with the eye of a designer who cares about VISUAL RHYTHM. Hunt specifically for:
1. GRID & SIZE CONSISTENCY — cards in the same row with unequal heights; stat tiles of different sizes; misaligned edges between main column and sidebar.
2. SPACING RHYTHM — inconsistent paddings inside similar cards; uneven vertical gaps; cramped or orphan whitespace; buttons flush against card borders.
3. TYPOGRAPHY HIERARCHY — page titles differing in size/weight across sibling pages; truncation that breaks layout; inconsistent muted text.
4. COMPONENT CONSISTENCY — mismatched button sizes side by side; chat bubbles with inconsistent padding/radius/timestamp placement; avatars misaligned; composer input vs send button height mismatch.
5. ALIGNMENT & LAYOUT — content wider than container; horizontal overflow; sidebar top-edge misalignment; header action collisions.
6. COLOR & STATE — inconsistent status colors; low-contrast text (note: dark mode screenshots are included and intentional).
7. UX POLISH — unfinished empty states; awkward wrapping; duplicated labels; headers losing context.

For EACH image (refer to them in order as Image 1, Image 2, ...), report:
- PAGE: what page it is
- ISSUES: numbered list; each issue = [SEVERITY: critical|moderate|minor] + precise location + what is wrong + why it breaks visual rhythm
- Do NOT report content/copy quality, business logic, or things requiring interaction. Only what is visually observable.
- If a page is visually consistent, say so explicitly with "CLEAN" plus anything borderline.
Be exhaustive and precise — this is the final QA pass before shipping.'

run () {
  local name="$1"; shift
  local args=()
  for f in "$@"; do args+=(-i "$SHOTS/$f"); done
  echo "=== auditing $name ==="
  z-ai vision -p "$PROMPT" "${args[@]}" -o "$OUT/$name.json" 2>&1 | tail -1
}

run 3c-volunteer after-vol-dashboard.png after-vol-browse.png after-vol-campaign-team.png after-vol-campaign-apply.png after-vol-invites.png after-vol-profile.png
run 3c-chat after-vol-chat.png after-staff-chat.png after-vol-dark-chat.png
run 3c-staff after-staff-dashboard.png after-staff-profile.png after-staff-dark-dashboard.png
run 3c-dark after-vol-dark-dashboard.png
run 3c-mobile after-vol-mobile-dashboard.png after-vol-mobile-campaign-team.png after-staff-mobile-dashboard.png

echo "3-c VLM AUDIT COMPLETE"
