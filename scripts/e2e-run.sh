#!/usr/bin/env bash
# E2E runner: fresh mock backend (in-memory seed resets per process) + the
# Playwright suite (which boots its own dev server via webServer config).
set -uo pipefail
cd /home/z/my-project
cleanup() { pkill -f "next dev" 2>/dev/null; pkill -f "mock-supabase" 2>/dev/null; true; }
trap cleanup EXIT

node scripts/mock-supabase.mjs > .audit/mock.log 2>&1 &
for i in $(seq 1 40); do curl -s --max-time 2 -o /dev/null http://127.0.0.1:54321/auth/v1/settings && break; sleep 0.5; done
curl -s --max-time 2 -o /dev/null http://127.0.0.1:54321/auth/v1/settings || { echo "mock failed"; cat .audit/mock.log; exit 1; }
echo "mock supabase: up"

npx playwright test --reporter=list 2>&1 | tail -40
