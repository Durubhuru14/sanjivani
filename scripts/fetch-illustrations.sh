#!/usr/bin/env bash
# Fetch curated Storyset (stories.freepiklabs.com) illustrations for Sanjivini's
# "human + nature" library. License: free with attribution (see CREDITS.md).
set -u
STAGE=/tmp/illustrations-staging
mkdir -p "$STAGE/human" "$STAGE/nature"
BASE=https://stories.freepiklabs.com/storage

dl () { # dl <category> <outname> <path>
  local out="$STAGE/$1/$2.svg"
  if [ -s "$out" ]; then echo "skip  $2"; return 0; fi
  curl -sL --max-time 20 -A "Mozilla/5.0" -o "$out" "$BASE/$3"
  if head -c 100 "$out" | grep -qi '<svg\|<?xml'; then echo "ok    $1/$2 ($(wc -c <"$out") bytes)"; else echo "FAIL  $1/$2"; rm -f "$out"; fi
}

# ---------- human ----------
dl human volunteering            13718/Volunteering-01.svg
dl human taking-care-of-plants   43001/People-taking-care-of-plants_Mesa-de-trabajo-1.svg
dl human charity                 14480/Charity-01.svg
dl human team-work               28377/Team-work-01.svg
dl human community               1973/Community-01.svg
dl human seeding                 47565/Seeding-01.svg
dl human helping-partner         58516/Helping-a-partner_Artboard-1.svg
dl human shared-goal             35673/Shared-goal-01.svg
dl human send-gift               39068/Send-gift-01.svg
dl human eco-education           41833/Eco-education-01.svg

# ---------- nature ----------
dl nature sprout                 47578/Sprout_Mesa-de-trabajo-1.svg
dl nature potted-plants          71328/Potted-plants-01.svg
dl nature gardening              2348/Gardening-01.svg
dl nature blooming               51157/Blooming_Mesa-de-trabajo-1.svg
dl nature water-drop             55857/Water-drop-01.svg
dl nature poppy-flower           61983/Poppy-flower-01.svg
dl nature spring-flower          61984/Spring-flower-01.svg
dl nature cactus-flower          65472/Cactus-flower_Mesa-de-trabajo-1.svg
dl nature cherry-blossom         66703/Cherry-blossom-01.svg
dl nature rose-flower            61981/Rose-flower-01.svg
dl nature strelitzia-plant       71330/Strelitzia-plant-01.svg
dl nature nature-scene           31767/Nature-01.svg
dl nature forest                 12245/Forest-01.svg
dl nature reforestation          58122/Reforestation-01.svg
dl nature happy-earth            56478/Happy-Earth-01.svg
dl nature birds-in-love          100993/Birds-In-Love_Mesa-de-trabajo-1.svg
dl nature charity-market         16709/Charity-market-01.svg
dl nature farmers-market         58643/Farmers-Market_Mesa-de-trabajo-1.svg

echo "---- done ----"
