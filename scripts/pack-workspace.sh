#!/bin/bash
# Full-workspace archive — everything the agent touched, as a backup.
# Unlike pack-deliverable.sh (the curated clean deliverable), this keeps:
#   scripts/, worklog.md, tool-results/, upload/, .env, lockfiles, git history.
# Excluded ONLY because they are machine-regenerable caches or not shareable:
#   node_modules/ (744M, npm install regenerates from package-lock.json)
#   .next/        (115M build cache, npm run build regenerates)
#   skills/       (internal agent tooling library, not user work)
#   sandbox/      (700M+ of engine binaries + image rootfs for the local test stack)
#   download/     (recursion guard — this zip and the clean deliverable live here)
# Staged via rsync first: `zip -r` walking node_modules+ .next + sandbox while the
# dev stack is running gets the process OOM-killed; the staged tree is ~30M.
set -euo pipefail
cd /home/z/my-project

OUT="download/sanjivani-workspace-full.zip"
echo "==> staging workspace"
rm -rf .wsstage
mkdir -p .wsstage/workspace
rsync -a \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'skills' \
  --exclude 'sandbox' \
  --exclude 'download' \
  --exclude '.wsstage' \
  --exclude '.zipstage' \
  --exclude 'test-results' \
  --exclude '.audit/shots' \
  --exclude 'tsconfig.tsbuildinfo' \
  --exclude 'next-env.d.ts' \
  --exclude '*.log' \
  ./ .wsstage/workspace/

echo "==> zipping"
rm -f "$OUT"
( cd .wsstage && zip -r -q -X "../$OUT" workspace )
rm -rf .wsstage

echo "==> verifying archive integrity"
unzip -t "$OUT" > /dev/null
echo "zip integrity: OK"

echo "==> verifying exclusions"
bad="$(unzip -l "$OUT" | grep -E 'workspace/node_modules/|workspace/\.next/|workspace/skills/|workspace/sandbox/' || true)"
if [ -n "$bad" ]; then
  echo "ERROR: forbidden content found:"; echo "$bad" | head -5; exit 1
fi
echo "exclusions: OK (no node_modules, no .next, no skills, no sandbox)"

echo "==> verifying workspace contents"
listing="$(unzip -l "$OUT")"
for required in "workspace/worklog.md" "workspace/scripts/pack-deliverable.sh" "workspace/.env.example" "workspace/.git/HEAD" "workspace/app/" "workspace/lib/supabase/config.ts" "workspace/supabase/seed.sql" "workspace/README.md" "workspace/WHAT_WE_DID.md" "workspace/package.json" "workspace/tool-results/"; do
  if ! echo "$listing" | grep -F "$required" > /dev/null; then
    echo "ERROR: missing $required"; exit 1
  fi
done
echo "workspace contents: OK (worklog, scripts, git, code, artifacts all present)"

echo "==> result"
ls -lh download/
md5sum "$OUT"
