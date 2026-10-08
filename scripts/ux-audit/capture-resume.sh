#!/usr/bin/env bash
# Resume capture — remaining pages after the cold-start timeout.
set -u
BASE=http://localhost:3000
OUT=/home/z/my-project/scripts/ux-audit/shots
B="agent-browser --session freshcap"

$B open "$BASE/" >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1
$B set viewport 1440 900 >/dev/null 2>&1

cap () {
  if [ -f "$OUT/$1.png" ]; then echo "skip $1"; return; fi
  $B open "$BASE$2" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 0.8
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
    echo "  login($who) ok"
    return 0
  done
  echo "  !! login($who) FAILED"
  return 1
}

login "Platform admin"
cap 11-admin-tab-campaigns /admin
cap 16-admin-profile /admin/profile

login "NGO · Green Earth"
cap 21-ngo-campaigns /ngo/campaigns

login "NGO · Bright Futures"
cap 26-ngo-bf-tutoring /ngo/campaigns/c0000000-0000-4000-8000-000000000002
cap 27-ngo-bf-chat /ngo/campaigns/c0000000-0000-4000-8000-000000000002/chat
cap 28-ngo-bf-chat-room /ngo/campaigns/c0000000-0000-4000-8000-000000000002/chat/11000000-0000-4000-8000-000000000001

login "Staff · Green Earth"
cap 30-staff-dashboard /staff
cap 31-staff-profile /staff/profile
cap 32-staff-chat-room /staff/chat/11000000-0000-4000-8000-000000000001

login "Volunteer · verified"
cap 40-volunteer-dashboard /volunteer
cap 41-volunteer-browse /volunteer/browse
cap 42-volunteer-tutoring /volunteer/campaigns/c0000000-0000-4000-8000-000000000002
cap 43-volunteer-river /volunteer/campaigns/c0000000-0000-4000-8000-000000000001
cap 44-volunteer-invites /volunteer/invites
cap 45-volunteer-profile /volunteer/profile
cap 46-volunteer-chat-room /volunteer/chat/11000000-0000-4000-8000-000000000001

login "Volunteer · pending"
cap 47-volunteer-pending /volunteer

login "Volunteer · suspended"
cap 48-suspended /suspended

login "Platform admin"
$B eval "document.documentElement.classList.add('dark')" >/dev/null 2>&1
cap d1-admin /admin
login "NGO · Green Earth"
$B eval "document.documentElement.classList.add('dark')" >/dev/null 2>&1
cap d2-ngo /ngo
login "Volunteer · verified"
$B eval "document.documentElement.classList.add('dark')" >/dev/null 2>&1
cap d3-volunteer /volunteer
cap d4-browse /volunteer/browse
$B cookies clear >/dev/null 2>&1
$B open "$BASE/" >/dev/null 2>&1; $B wait --load networkidle >/dev/null 2>&1
$B eval "document.documentElement.classList.add('dark')" >/dev/null 2>&1
sleep 0.6
$B screenshot --full "$OUT/d5-landing.png" >/dev/null 2>&1
echo "captured d5-landing"

$B set viewport 390 844 >/dev/null 2>&1
cap m1-landing /
login "Volunteer · verified"
cap m2-volunteer /volunteer
cap m3-browse /volunteer/browse
login "NGO · Green Earth"
cap m4-ngo /ngo
login "Platform admin"
cap m5-admin /admin

$B close >/dev/null 2>&1
echo "RESUME COMPLETE"
