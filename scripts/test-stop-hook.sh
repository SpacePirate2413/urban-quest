#!/usr/bin/env bash
# Stop hook: runs the Phase 1 test suite after every assistant turn.
# Silent on success; emits a chat warning (via systemMessage JSON) on failure.
#
# Wired up in .claude/settings.json under hooks.Stop.
# Manual run any time: `bash scripts/test-stop-hook.sh`
set -uo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)}"

OUT=$(mktemp -t claude-tests.XXXXXX)
trap 'rm -f "$OUT"' EXIT

node scripts/update-testing-doc.mjs > "$OUT" 2>&1
rc=$?

if [ $rc -ne 0 ]; then
  # Build a systemMessage payload — Claude Code parses this and shows the
  # message to the user. tail -25 keeps the warning short enough to scan.
  body="⚠️  TEST FAILURE — Phase 1 suite reported failures after this turn.

$(tail -25 "$OUT")

See Testing.md for the full per-test breakdown."
  jq -Rsc --arg m "$body" '{systemMessage: $m}' < /dev/null
fi
exit 0
