#!/bin/bash
# Warns (doesn't block) when feat(/fix( commit happens without cto-review artifact
# Trigger: PreToolUse Bash
# Rationale: CTO-Review skill exists but is never invoked — this nudges before commit

TOOL_INPUT="$(cat 2>/dev/null || echo '')"

# Extract command from tool input JSON (simple sed-based, Windows-safe)
COMMAND="$(echo "$TOOL_INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Only trigger on git commit with feat( or fix( prefix
if echo "$COMMAND" | grep -qE "git commit.*-m.*(feat|fix)\("; then
  ACTIVE="worklog/active.md"
  if [ -f "$ACTIVE" ]; then
    STATUS=$(sed -n 's/^status:[[:space:]]*\([a-z]*\).*/\1/p' "$ACTIVE" | head -1)
    SLICE=$(sed -n 's/^slice:[[:space:]]*\([0-9a-zA-Z_-]*\).*/\1/p' "$ACTIVE" | head -1)

    if [ "$STATUS" = "active" ] && [ -n "$SLICE" ] && [ "$SLICE" != "—" ]; then
      REVIEW_FILE="worklog/reviews/${SLICE}-cto-review.md"
      if [ ! -f "$REVIEW_FILE" ]; then
        cat >&2 <<EOF
[cto-review-gate] WARN: feat/fix commit on active slice '$SLICE' without $REVIEW_FILE
  Consider: /cto-review (skill) OR spawn reviewer agent before commit
  To silence this: create empty file touch $REVIEW_FILE
EOF
      fi
    fi
  fi
fi

# Non-blocking — commit proceeds
exit 0
