#!/usr/bin/env bash
# UX visual audit — runs VLM designer inspection over captured screenshots, batched by section.
set -u
SHOTS=/home/z/my-project/scripts/ux-audit/shots
OUT=/home/z/my-project/scripts/ux-audit/vlm
mkdir -p "$OUT"

PROMPT='You are a senior product designer performing a meticulous visual-consistency and UX audit of "Sanjivani", an NGO/volunteer platform (Next.js + shadcn/ui + Tailwind). Its design system: warm green brand (#2E7D32 primary, #E8F5E9 tint), card-based UI, rounded-xl corners, soft shadows, generous whitespace, clean and minimal.

Inspect the attached screenshot(s) of real app pages with the eye of a designer who cares about VISUAL RHYTHM. Hunt specifically for:
1. GRID & SIZE CONSISTENCY — cards in the same row/grid with unequal widths or heights; stat cards of different sizes; boxes that are slightly smaller/bigger than siblings; misaligned card edges or baselines.
2. SPACING RHYTHM — inconsistent paddings inside similar cards; uneven vertical gaps between sections; cramped or orphan whitespace; inconsistent gaps between label/value pairs.
3. TYPOGRAPHY HIERARCHY — page titles that differ in size/weight across sibling pages; inconsistent heading levels for the same logical role; truncated or wrapping text that breaks layout; inconsistent muted-text colors.
4. COMPONENT CONSISTENCY — buttons of mismatched sizes side by side; badges/pills with different radii or padding; tables vs card lists mixing metaphors; empty states that look unfinished (no icon/illustration, plain text only); inconsistent icon sizing.
5. ALIGNMENT & LAYOUT — elements not aligned to the grid/content column; content wider than its container; horizontal overflow; off-center elements that look accidental; sidebar/content edge misalignment.
6. COLOR & STATE — inconsistent status color language (same status shown in different colors on different pages); hover-state leftovers; low-contrast text.
7. UX POLISH — missing loading/empty states, awkward truncation, dates/numbers formatted inconsistently, buttons at odd positions, headers that lose context, footer/pagination rhythm.

For EACH image (refer to them in order as Image 1, Image 2, ...), report:
- PAGE: what page it is
- ISSUES: numbered list; each issue = [SEVERITY: critical|moderate|minor] + precise location (e.g. "second card in top row") + what is wrong + why it breaks visual rhythm
- Do NOT report: content/copy quality, business logic, or things that require interaction you cannot see. Only what is visually observable.
- If a page is visually consistent, say so explicitly with "CLEAN" plus anything borderline.
Be exhaustive and precise — this is the final QA pass before shipping.'

run () { # run <name> <files...>
  local name="$1"; shift
  local args=()
  for f in "$@"; do args+=(-i "$SHOTS/$f"); done
  echo "=== auditing $name ==="
  z-ai vision -p "$PROMPT" "${args[@]}" -o "$OUT/$name.json" 2>&1 | tail -1
}

run public 01-landing.png 02-login.png 03-signup.png
run admin 10-admin-overview.png 1x-admin-tab-campaigns.png 1x-admin-tab-volunteers.png 1x-admin-tab-staff.png 1x-admin-tab-reports.png 15-admin-ngo-detail.png 16-admin-profile.png
run ngo-ge 20-ngo-dashboard.png 21-ngo-campaigns.png 22-ngo-campaign-new.png 23-ngo-campaign-river.png 24-ngo-staff.png 25-ngo-profile.png
run ngo-bf 26-ngo-bf-tutoring.png 27-ngo-bf-chat.png 28-ngo-bf-chat-room.png
run staff 30-staff-dashboard.png 31-staff-profile.png 32-staff-chat-room.png
run volunteer 40-volunteer-dashboard.png 41-volunteer-browse.png 42-volunteer-tutoring.png 43-volunteer-river.png 44-volunteer-invites.png 45-volunteer-profile.png 46-volunteer-chat-room.png 47-volunteer-pending.png 48-suspended.png
run dark d1-admin.png d2-ngo.png d3-volunteer.png d4-browse.png d5-landing.png
run mobile m1-landing.png m2-volunteer.png m3-browse.png m4-ngo.png m5-admin.png

echo "AUDIT COMPLETE"
