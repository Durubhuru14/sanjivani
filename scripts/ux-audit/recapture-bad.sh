#!/usr/bin/env bash
# Recapture the shots corrupted by the poisoned-server window.
set -u
BASE=http://localhost:3000
OUT=/home/z/my-project/scripts/ux-audit/shots
B="agent-browser --session recap"

$B open "$BASE/" >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1
$B set viewport 1440 900 >/dev/null 2>&1

cap () {
  $B open "$BASE$2" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 1
  $B screenshot --full "$OUT/$1.png" >/dev/null 2>&1
  echo "captured $1"
}

login () {
  local who="$1" try
  for try in 1 2 3; do
    $B cookies clear >/dev/null 2>&1
    $B open "$BASE/login" >/dev/null 2>&1
    $B wait --load networkidle >/dev/null 2>&1
    sleep 1.2
    $B find role button click --name "$who" >/dev/null 2>&1
    sleep 0.5
    $B find role button click --name "Log in" >/dev/null 2>&1
    sleep 4.5
    $B wait --load networkidle >/dev/null 2>&1
    local url; url="$($B get url 2>/dev/null)"
    if [[ "$url" == *"/login" ]]; then echo "  retry $who"; continue; fi
    echo "  login($who) ok -> $url"
    return 0
  done
  echo "  !! login($who) FAILED"
  return 1
}

# ---- ADMIN (overview + tabs + detail + profile) ----
login "Platform admin"
cap 10-admin-overview /admin
for tab in Campaigns Volunteers Staff Reports; do
  $B find role tab click --name "$tab" >/dev/null 2>&1
  sleep 0.9
  $B screenshot --full "$OUT/1x-admin-tab-$(echo $tab | tr 'A-Z' 'a-z').png" >/dev/null 2>&1
  echo "captured tab $tab"
done
cap 15-admin-ngo-detail /admin/ngos/a0000000-0000-4000-8000-000000000002
cap 16-admin-profile /admin/profile

# ---- NGO Green Earth ----
login "NGO · Green Earth"
cap 20-ngo-dashboard /ngo
cap 21-ngo-campaigns /ngo/campaigns
cap 22-ngo-campaign-new /ngo/campaigns/new
cap 23-ngo-campaign-river /ngo/campaigns/c0000000-0000-4000-8000-000000000001
cap 24-ngo-staff /ngo/staff
cap 25-ngo-profile /ngo/profile

$B close >/dev/null 2>&1
echo "RECAPTURE DONE"
