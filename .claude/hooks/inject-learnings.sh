#!/usr/bin/env bash
# SessionStart hook — Injects unseen learnings-queue entries as additionalContext.
# Closes self-learning loop: capture → INJECT → reflect → drafts → promote.
#
# Reads: .claude/learnings-queue.jsonl
# Sidecar: .claude/learnings-shown.jsonl (tracks which entries already injected)
# Output: JSON {"additionalContext": "..."} on stdout
#
# Limit: max 5 unseen entries per session to keep context lean.

set -u

QUEUE="C:/bescout-app/.claude/learnings-queue.jsonl"
SHOWN="C:/bescout-app/.claude/learnings-shown.jsonl"

[ ! -f "$QUEUE" ] && exit 0
[ ! -s "$QUEUE" ] && exit 0

# Init sidecar if missing
touch "$SHOWN"

# Read all queue entries, deduplicate against shown (grep -Fvxf works even with empty SHOWN)
if [ -s "$SHOWN" ]; then
  UNSEEN=$(grep -Fvxf "$SHOWN" "$QUEUE" 2>/dev/null)
else
  UNSEEN=$(cat "$QUEUE")
fi
[ -z "$UNSEEN" ] && exit 0

# Take last 5 (most recent)
TOP5=$(echo "$UNSEEN" | tail -5)
COUNT=$(echo "$TOP5" | grep -c .)
TOTAL_UNSEEN=$(echo "$UNSEEN" | grep -c .)

# Build human-readable list (extract "text" field from each JSON line)
LIST=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  TS=$(echo "$line" | sed -n 's/.*"ts"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 | cut -c1-10)
  TXT=$(echo "$line" | sed -n 's/.*"text"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  LIST="${LIST}- [$TS] $TXT\n"
done <<< "$TOP5"

# Mark these as shown
echo "$TOP5" >> "$SHOWN"

# Emit additionalContext as JSON
if [ -n "$LIST" ]; then
  CTX="📌 RECENT CORRECTIONS (queue: $TOTAL_UNSEEN ungesehen, zeige top $COUNT):\n\n${LIST}\n→ Beachte diese Korrekturen in dieser Session. /reflect für Promotion zu Drafts."
  # JSON-escape for stdout
  CTX_ESC=$(echo -e "$CTX" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' '\n' | sed ':a;N;$!ba;s/\n/\\n/g')
  echo "{\"additionalContext\": \"$CTX_ESC\"}"
fi

exit 0
