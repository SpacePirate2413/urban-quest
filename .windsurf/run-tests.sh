#!/bin/bash

# Wrapper script for post_cascade_response hook
# Only runs tests if source files changed since last run

WORKSPACE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP_FILE="$WORKSPACE_ROOT/.windsurf/.last-test-run"

# Get last test run time (0 if never run)
if [[ -f "$TIMESTAMP_FILE" ]]; then
  LAST_RUN=$(cat "$TIMESTAMP_FILE")
else
  LAST_RUN=0
fi

# Find any source files modified since last run
CHANGED_FILES=$(find "$WORKSPACE_ROOT/apps" \
  -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/.expo/*" \
  -newer "$TIMESTAMP_FILE" 2>/dev/null | head -1)

# Skip if no changes (and we've run before)
if [[ "$LAST_RUN" -ne 0 && -z "$CHANGED_FILES" ]]; then
  exit 0
fi

# Record current time before running tests
date +%s > "$TIMESTAMP_FILE"

# Run tests and capture output
OUTPUT=$(cd "$WORKSPACE_ROOT" && pnpm test 2>&1)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "Auto-Test run: All Tests Passed"
else
  # Extract first meaningful error
  ERROR_LINE=$(echo "$OUTPUT" | grep -E "(FAIL|Error|error|failed|SyntaxError|TypeError)" | head -1)
  
  # Try to find file:line reference
  FILE_REF=$(echo "$OUTPUT" | grep -oE "[a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx):[0-9]+" | head -1)
  
  if [[ -n "$FILE_REF" ]]; then
    echo "Auto-Test run: FAILED at $FILE_REF - $ERROR_LINE"
  elif [[ -n "$ERROR_LINE" ]]; then
    echo "Auto-Test run: FAILED - $ERROR_LINE"
  else
    echo "Auto-Test run: FAILED (exit code $EXIT_CODE)"
  fi
fi

exit 0
