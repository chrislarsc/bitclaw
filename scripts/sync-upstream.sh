#!/usr/bin/env bash
set -euo pipefail

# Sync chris/personal with the latest upstream main.
# Usage: ./scripts/sync-upstream.sh

PERSONAL_BRANCH="chris/personal"

echo "Fetching upstream..."
git fetch upstream

echo "Updating local main..."
git checkout main
git merge upstream/main --ff-only

echo "Rebasing $PERSONAL_BRANCH onto main..."
git checkout "$PERSONAL_BRANCH"
git rebase main

echo "Pushing updated branches..."
git push origin main
git push origin "$PERSONAL_BRANCH" --force-with-lease

echo "Done. $PERSONAL_BRANCH is up to date with upstream."
