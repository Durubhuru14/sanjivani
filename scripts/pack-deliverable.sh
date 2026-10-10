#!/usr/bin/env bash
# Package the Sanjivani deliverable: the Next.js app + full .git history.
# (git archive gives exactly the tracked tree; .git rides along so the
#  recipient gets the commit history too.)
set -euo pipefail
cd /home/z/my-project

git gc --quiet

STAGE=$(mktemp -d)
mkdir -p "$STAGE/sanjivani"

# 1) every tracked file, exactly as committed
git archive HEAD | tar -x -C "$STAGE/sanjivani"

# 2) the git history itself
cp -a .git "$STAGE/sanjivani/.git"

# 3) zip it (keep the top-level folder name)
mkdir -p /home/z/my-project/download
rm -f /home/z/my-project/download/sanjivani.zip
(cd "$STAGE" && zip -qr /home/z/my-project/download/sanjivani.zip sanjivani)

# 4) verify by fresh extraction
CHECK=$(mktemp -d)
unzip -q /home/z/my-project/download/sanjivani.zip -d "$CHECK"
cd "$CHECK/sanjivani"
git config --global --add safe.directory "$CHECK/sanjivani" 2>/dev/null || true
echo "commits in shipped repo: $(git rev-list --count HEAD)"
echo "status (should be clean): $(git status --short | wc -l) dirty entries"
echo "zip size: $(du -h /home/z/my-project/download/sanjivani.zip | cut -f1)"
rm -rf "$STAGE" "$CHECK"
