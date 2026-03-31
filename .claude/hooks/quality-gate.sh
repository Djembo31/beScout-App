#!/bin/bash
# Stop Hook: Lightweight quality gate — replaces expensive AI agent hook
# Only checks if .ts/.tsx files were changed, then runs fast static checks

cd C:/bescout-app

# Get changed .ts/.tsx files (staged + unstaged)
CODE_FILES=$(git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$')
STAGED_CODE=$(git diff --cached --name-only 2>/dev/null | grep -E '\.(ts|tsx)$')
ALL_CODE="$CODE_FILES$STAGED_CODE"

# No code changes? Skip entirely.
if [ -z "$ALL_CODE" ]; then
  exit 0
fi

# Fast checks on changed code files
ISSUES=""

for f in $(echo "$ALL_CODE" | sort -u); do
  [ ! -f "$f" ] && continue

  # Check: raw query keys (must use qk.*)
  if grep -n "useQuery\|useInfiniteQuery" "$f" 2>/dev/null | grep -v "qk\." | grep -q "queryKey.*\["; then
    ISSUES="$ISSUES\n  $f: raw query key (use qk.* factory)"
  fi

  # Check: supabase direct in components
  if echo "$f" | grep -q "components/" && grep -q "from.*supabaseClient" "$f" 2>/dev/null; then
    ISSUES="$ISSUES\n  $f: supabase direct in component (use service layer)"
  fi

  # Check: empty catch
  if grep -nP '\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)' "$f" 2>/dev/null | head -1 | grep -q .; then
    ISSUES="$ISSUES\n  $f: empty .catch(() => {}) (add console.error)"
  fi
done

if [ -n "$ISSUES" ]; then
  echo "QUALITY GATE warnings:$ISSUES"
fi

exit 0
