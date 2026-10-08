#!/usr/bin/env bash
# UX audit screenshot rig v2 — robust login (hydration-race safe) + correct viewport.
set -u
BASE=http://localhost:3000
OUT=/home/z/my-project/scripts/ux-audit/shots
mkdir -p "$OUT"
B="agent-browser --session audit"

# Open a page first so the viewport applies to a real context.
$B open "$BASE/" >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1
$B set viewport 1440 900 >/dev/null 2>&1

cap () { # cap <name> <path>
  $B open "$BASE$2" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 0.8
  $B screenshot --full "$OUT/$1.png" >/dev/null 2>&1
  echo "captured $1"
}

getemail () { $B get value "input[type=email], input[name=email]" 2>/dev/null; }

login () { # login <demo-button-name-substring>
  local who="$1" try
  for try in 1 2 3; do
    $B cookies clear >/dev/null 2>&1
    $B open "$BASE/login" >/dev/null 2>&1
    $B wait --load networkidle >/dev/null 2>&1
    sleep 1.2   # let React hydrate
    $B find role button click --name "$who" >/dev/null 2>&1
    sleep 0.5
    local em; em="$(getemail)"
    if [ -z "$em" ] || [ "$em" = "" ]; then
      echo "  login($who) attempt $try: form not filled, retrying"
      continue
    fi
    $B find role button click --name "Log in" >/dev/null 2>&1
    sleep 2
    $B wait --load networkidle >/dev/null 2>&1
    local url; url="$($B get url 2>/dev/null)"
    if [[ "$url" == *"/login" ]]; then
      echo "  login($who) attempt $try: still on /login, retrying"
      continue
    fi
    echo "  login($who) ok -> $url"
    return 0
  done
  echo "  !! login($who) FAILED after 3 attempts"
  return 1
}

# ---------- PUBLIC ----------
cap 01-landing /
cap 02-login /login
cap 03-signup /signup

# ---------- ADMIN ----------
login "Platform admin"
cap 10-admin-overview /admin
for tab in Campaigns Volunteers Staff Reports; do
  $B find role tab click --name "$tab" >/dev/null 2>&1
  sleep 0.7
  $B screenshot --full "$OUT/1x-admin-tab-$(echo $tab | tr 'A-Z' 'a-z').png" >/dev/null 2>&1
  echo "captured admin tab $tab"
done
cap 15-admin-ngo-detail /admin/ngos/a0000000-0000-4000-8000-000000000002
cap 16-admin-profile /admin/profile

# ---------- NGO (Green Earth) ----------
login "NGO · Green Earth"
cap 20-ngo-dashboard /ngo
cap 21-ngo-campaigns /ngo/campaigns
cap 22-ngo-campaign-new /ngo/campaigns/new
cap 23-ngo-campaign-river /ngo/campaigns/c0000000-0000-4000-8000-000000000001
cap 24-ngo-staff /ngo/staff
cap 25-ngo-profile /ngo/profile

# ---------- NGO (Bright Futures — owns chat rooms) ----------
login "NGO · Bright Futures"
cap 26-ngo-bf-tutoring /ngo/campaigns/c0000000-0000-4000-8000-000000000002
cap 27-ngo-bf-chat /ngo/campaigns/c0000000-0000-4000-8000-000000000002/chat
cap 28-ngo-bf-chat-room /ngo/campaigns/c0000000-0000-4000-8000-000000000002/chat/11000000-0000-4000-8000-000000000001

# ---------- STAFF ----------
login "Staff · Green Earth"
cap 30-staff-dashboard /staff
cap 31-staff-profile /staff/profile
cap 32-staff-chat-room /staff/chat/11000000-0000-4000-8000-000000000001

# ---------- VOLUNTEER (Priya — verified) ----------
login "Volunteer · verified"
cap 40-volunteer-dashboard /volunteer
cap 41-volunteer-browse /volunteer/browse
cap 42-volunteer-tutoring /volunteer/campaigns/c0000000-0000-4000-8000-000000000002
cap 43-volunteer-river /volunteer/campaigns/c0000000-0000-4000-8000-000000000001
cap 44-volunteer-invites /volunteer/invites
cap 45-volunteer-profile /volunteer/profile
cap 46-volunteer-chat-room /volunteer/chat/11000000-0000-4000-8000-000000000001

# ---------- VOLUNTEER (Aisha — pending) ----------
login "Volunteer · pending"
cap 47-volunteer-pending /volunteer

# ---------- SUSPENDED ----------
login "Volunteer · suspended"
cap 48-suspended /suspended

# ---------- DARK MODE ----------
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

# ---------- MOBILE ----------
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
echo "ALL CAPTURED"
