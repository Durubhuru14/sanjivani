#!/usr/bin/env bash
# Task 3-c verification rig — volunteer + staff + shared chat.
# Desktop 1440 captures, dark mode, mobile 390 scrollWidth checks.
set -u
BASE=http://localhost:3000
OUT=/home/z/my-project/scripts/ux-audit/shots
mkdir -p "$OUT"
B="agent-browser --session fix3c"

$B open "$BASE/" >/dev/null 2>&1
$B wait --load networkidle >/dev/null 2>&1
$B set viewport 1440 900 >/dev/null 2>&1

login () { # login <demo-button-name-substring>
  local who="$1" try
  for try in 1 2 3; do
    $B cookies clear >/dev/null 2>&1
    $B open "$BASE/login" >/dev/null 2>&1
    $B wait --load networkidle >/dev/null 2>&1
    sleep 1.2
    $B find role button click --name "$who" >/dev/null 2>&1
    sleep 0.5
    local em; em="$($B get value "input[type=email]" 2>/dev/null)"
    if [ -z "$em" ]; then
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

cap () { # cap <name> <path>
  $B open "$BASE$2" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 0.8
  $B screenshot --full "$OUT/$1.png" >/dev/null 2>&1
  echo "captured $1"
}

width () { # width <label> — report document.scrollWidth at current viewport
  local w; w="$($B eval "document.documentElement.scrollWidth" 2>/dev/null)"
  echo "scrollWidth[$1] = $w"
}

# ---------- VOLUNTEER (Priya) desktop ----------
login "Volunteer · verified"
cap after-vol-dashboard /volunteer
cap after-vol-browse /volunteer/browse
cap after-vol-campaign-team /volunteer/campaigns/c0000000-0000-4000-8000-000000000002
cap after-vol-campaign-apply /volunteer/campaigns/c0000000-0000-4000-8000-000000000001
cap after-vol-invites /volunteer/invites
cap after-vol-profile /volunteer/profile
cap after-vol-chat /volunteer/chat/11000000-0000-4000-8000-000000000001

echo "--- chat subtitle check ---"
$B eval "document.querySelector('h1')?.textContent" 2>/dev/null
$B eval "[...document.querySelectorAll('p')].map(p=>p.textContent).filter(t=>t&&t.includes('message')).slice(0,3)" 2>/dev/null

# ---------- VOLUNTEER dark ----------
$B eval "document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark')" >/dev/null 2>&1
cap after-vol-dark-dashboard /volunteer
cap after-vol-dark-chat /volunteer/chat/11000000-0000-4000-8000-000000000001
$B eval "document.documentElement.classList.remove('dark'); localStorage.removeItem('theme')" >/dev/null 2>&1

# ---------- VOLUNTEER mobile 390 ----------
$B set viewport 390 844 >/dev/null 2>&1
for p in "/volunteer" "/volunteer/browse" "/volunteer/campaigns/c0000000-0000-4000-8000-000000000002" "/volunteer/campaigns/c0000000-0000-4000-8000-000000000001" "/volunteer/invites" "/volunteer/profile" "/volunteer/chat/11000000-0000-4000-8000-000000000001"; do
  $B open "$BASE$p" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 0.8
  width "vol$p"
done
cap after-vol-mobile-dashboard /volunteer
cap after-vol-mobile-campaign-team /volunteer/campaigns/c0000000-0000-4000-8000-000000000002

# ---------- STAFF (Meera) ----------
$B set viewport 1440 900 >/dev/null 2>&1
login "Staff · Green Earth"
cap after-staff-dashboard /staff
cap after-staff-profile /staff/profile
cap after-staff-chat /staff/chat/11000000-0000-4000-8000-000000000001

$B eval "document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark')" >/dev/null 2>&1
cap after-staff-dark-dashboard /staff
$B eval "document.documentElement.classList.remove('dark'); localStorage.removeItem('theme')" >/dev/null 2>&1

$B set viewport 390 844 >/dev/null 2>&1
for p in "/staff" "/staff/profile" "/staff/chat/11000000-0000-4000-8000-000000000001"; do
  $B open "$BASE$p" >/dev/null 2>&1
  $B wait --load networkidle >/dev/null 2>&1
  sleep 0.8
  width "staff$p"
done
cap after-staff-mobile-dashboard /staff

$B close >/dev/null 2>&1
echo "3-c CAPTURE DONE"
