#!/bin/bash
# Full-workspace archive — everything the agent touched, as a backup.
# Unlike pack-deliverable.sh (the curated clean deliverable), this keeps:
#   scripts/, worklog.md, tool-results/, upload/, .env, lockfiles, git history.
# Excluded ONLY because they are machine-regenerable caches or not shareable:
#   node_modules/ (744M, npm install regenerates from package-lock.json)
#   .next/        (115M build cache, npm run build regenerates)
#   skills/       (internal agent tooling library, not user work)
#   download/     (recursion guard — this zip and the clean deliverable live here)
set -euo pipefail
cd /home/z/my-project

OUT="download/sanjivani-workspace-full.zip"
echo "==> building workspace zip"
rm -f "$OUT"
zip -r -q "$OUT" . \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "skills/*" \
  -x "download/*" \
  -x ".zipstage/*" \
  -x "*.log"

echo "==> verifying archive integrity"
unzip -t "$OUT" > /dev/null
echo "zip integrity: OK"

echo "==> verifying exclusions"
bad="$(unzip -l "$OUT" | grep -E '^[^ ]*[0-9]+ +[0-9-]+ [0-9:]+ +node_modules/|\.next/[a-z]|skills/[a-z]' || true)"
if [ -n "$bad" ]; then
  echo "ERROR: forbidden content found:"; echo "$bad" | head -5; exit 1
fi
echo "exclusions: OK (no node_modules, no .next, no skills, no download recursion)"

echo "==> verifying workspace contents"
listing="$(unzip -l "$OUT")"
for required in "worklog.md" "scripts/pack-deliverable.sh" ".env" ".env.example" ".git/HEAD" "app/" "lib/supabase/config.ts" "supabase/seed.sql" "README.md" "WHAT_WE_DID.md" "package.json" "tool-results/" "upload/"; do
  if ! echo "$listing" | grep -F "$required" > /dev/null; then
    echo "ERROR: missing $required"; exit 1
  fi
done
echo "workspace contents: OK (worklog, scripts, env, git, code, artifacts all present)"

echo "==> result"
ls -lh download/
md5sum "$OUT"
