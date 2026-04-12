#!/bin/bash
# test-reminder.sh — PostToolUse(Edit|Write) hook
# Reminds to run vitest when editing service/hook/migration files.
# Non-blocking — just outputs a reminder.

cd C:/bescout-app || exit 0

# Read tracked files from this session
SESSION_FILES=".claude/session-files.txt"
[ -f "$SESSION_FILES" ] || exit 0

# Check the most recently added file
LAST_FILE=$(tail -1 "$SESSION_FILES" 2>/dev/null)
[ -n "$LAST_FILE" ] || exit 0

case "$LAST_FILE" in
  src/lib/services/*.ts|src/features/*/services/*.ts|src/features/*/mutations/*.ts)
    DIR=$(dirname "$LAST_FILE")
    BASE=$(basename "$LAST_FILE" .ts)
    if [ -f "$DIR/__tests__/$BASE.test.ts" ]; then
      echo "SERVICE EDIT: $LAST_FILE → npx vitest run $DIR/__tests__/$BASE.test.ts"
    elif [ -f "$DIR/__tests__/$BASE.test.tsx" ]; then
      echo "SERVICE EDIT: $LAST_FILE → npx vitest run $DIR/__tests__/$BASE.test.tsx"
    fi
    ;;
  src/app/*/hooks/*.ts|src/features/*/hooks/*.ts)
    DIR=$(dirname "$LAST_FILE")
    BASE=$(basename "$LAST_FILE" .ts)
    if [ -f "$DIR/__tests__/$BASE.test.ts" ]; then
      echo "HOOK EDIT: $LAST_FILE → npx vitest run $DIR/__tests__/$BASE.test.ts"
    fi
    ;;
  supabase/migrations/*.sql)
    echo "MIGRATION EDIT: $LAST_FILE → NULL-scalar + Return-Shape + RLS pruefen"
    ;;
esac

exit 0
