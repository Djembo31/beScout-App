#!/bin/bash
# Ferrari 10/10 Pre-Commit Guard — chained audits
# Wired into .claude/settings.json PreToolUse(Bash git commit*)
# Exit 1 = block. Exit 0 = pass.
set -e
cd "$(git rev-parse --show-toplevel)"

# Skip when no staged files (e.g., amend or empty commits)
if git diff --cached --quiet --exit-code 2>/dev/null; then
  exit 0
fi

# Read hook-input from stdin (Claude Code hook protocol)
# If called from CLI-hook, $CLAUDE_TOOL_INPUT may contain command
# Otherwise just run unconditionally

# Trigger only on `git commit` commands (match via env or first-arg)
TOOL_INPUT="${CLAUDE_TOOL_INPUT:-}"
if [ -n "$TOOL_INPUT" ]; then
  if ! echo "$TOOL_INPUT" | grep -qE '\bgit\s+commit\b'; then
    exit 0
  fi
fi

echo "🏎️  Ferrari Pre-Commit Guard activated"

# 1. Compliance-Audit (business.md violations)
if [ -x scripts/audit/compliance.sh ]; then
  if ! bash scripts/audit/compliance.sh; then
    exit 1
  fi
fi

# 2. i18n-Coverage (DE↔TR parity)
if [ -f scripts/audit/i18n-coverage.js ]; then
  if ! node scripts/audit/i18n-coverage.js; then
    exit 1
  fi
fi

# 3. Merge-conflict markers in staged files
CONFLICT_FILES=$(git diff --cached --name-only 2>/dev/null | xargs -I{} grep -l '^<<<<<<< ' {} 2>/dev/null | head -5 || true)
if [ -n "$CONFLICT_FILES" ]; then
  printf '\033[31m❌ Merge-conflict markers in staged files:\033[0m\n'
  echo "$CONFLICT_FILES"
  exit 1
fi

echo "🏁 Ferrari Pre-Commit Guard: PASS"
exit 0
