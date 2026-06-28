#!/bin/bash
# Stop Hook: Write useful session state for next session recovery.
# Output: memory/session-handoff.md (read by inject-context-on-compact + ship-session-start)
# Also outputs warnings to Claude's context on stop.
#
# MERGE-STRATEGY (seit 2026-04-24):
#   Statt die Datei komplett zu ueberschreiben, ersetzt der Hook NUR den Block
#   zwischen den Markern:
#     <!-- auto:handoff-start -->
#     ...
#     <!-- auto:handoff-end -->
#
#   Manueller Rich-Content (Priority-Queue, Next-Session-Briefing, DB-Stand)
#   oberhalb/unterhalb der Marker bleibt intakt.
#
#   Migration: Wenn die Datei Content ohne Marker hat, wird der Auto-Block
#   oben eingefuegt und existierender Content bleibt darunter.

cd C:/bescout-app || exit 0

HANDOFF="memory/session-handoff.md"
NOW=$(date +"%Y-%m-%d %H:%M")
START_MARK="<!-- auto:handoff-start -->"
END_MARK="<!-- auto:handoff-end -->"

mkdir -p memory

# --- Gather auto-section data ---

UNCOMMITTED=$(git status --porcelain 2>/dev/null | head -20)
UNCOMMITTED_COUNT=0
if [ -n "$UNCOMMITTED" ]; then
  UNCOMMITTED_COUNT=$(echo "$UNCOMMITTED" | grep -c "." 2>/dev/null || echo 0)
fi

RECENT=$(git log --since="4 hours ago" --oneline 2>/dev/null | head -10)
RECENT_COUNT=$(echo "$RECENT" | grep -c "." 2>/dev/null || echo 0)

WT_WITH_CHANGES=0
WT_CLEAN=0
WT_DETAILS=""
while IFS= read -r WT_LINE; do
  WT_PATH=$(echo "$WT_LINE" | awk '{print $1}')
  WT_BRANCH=$(echo "$WT_LINE" | sed -n 's/.*\[\(.*\)\].*/\1/p')
  [ "$WT_PATH" = "C:/bescout-app" ] && continue
  WT_DIFF=$(cd "$WT_PATH" && git diff --stat HEAD 2>/dev/null | tail -1)
  WT_NAME=$(basename "$WT_PATH")
  if [ -n "$WT_DIFF" ]; then
    WT_WITH_CHANGES=$((WT_WITH_CHANGES + 1))
    WT_DETAILS="${WT_DETAILS}- **${WT_NAME}** (${WT_BRANCH}): ${WT_DIFF}\n"
  else
    WT_CLEAN=$((WT_CLEAN + 1))
  fi
done < <(git worktree list 2>/dev/null)

STASH=$(git stash list 2>/dev/null | head -5)

# tsc-at-Stop removed (slice 431): full `npx tsc --noEmit` on EVERY Stop was a
# perf brake + theatre — tsc already runs during BUILD. Type-truth belongs in the
# build loop, not the handoff writer.

# --- Build auto-section content into temp file ---

NEW_AUTO=$(mktemp 2>/dev/null || echo "/tmp/handoff-auto-$$.tmp")

{
  echo "$START_MARK"
  echo "# Session Handoff — Auto ($NOW)"
  echo ""
  echo "> Dieser Block wird vom Stop-Hook aktualisiert. Manueller Rich-Content steht ausserhalb der Marker."
  echo ""

  if [ -n "$UNCOMMITTED" ]; then
    echo "## Uncommitted Changes: $UNCOMMITTED_COUNT Files"
    echo '```'
    echo "$UNCOMMITTED"
    echo '```'
    echo ""
  else
    echo "## Working Tree: Clean"
    echo ""
  fi

  if [ -n "$RECENT" ] && [ "$RECENT_COUNT" -gt 0 ]; then
    echo "## Session Commits: $RECENT_COUNT"
    echo "$RECENT" | sed 's/^/- /'
    echo ""
  fi

  if [ "$WT_WITH_CHANGES" -gt 0 ]; then
    echo "## Pending Agent Work: $WT_WITH_CHANGES Worktrees"
    echo -e "$WT_DETAILS"
  fi
  if [ "$WT_CLEAN" -gt 0 ]; then
    echo "## Stale Worktrees: $WT_CLEAN (cleanup candidates)"
    echo ""
  fi

  if [ -n "$STASH" ]; then
    echo "## Stashed Changes"
    echo "$STASH" | sed 's/^/- /'
    echo ""
  fi

  echo "$END_MARK"
} > "$NEW_AUTO"

# --- Merge into handoff file (3 cases) ---

if [ -f "$HANDOFF" ] && grep -qF "$START_MARK" "$HANDOFF" 2>/dev/null && grep -qF "$END_MARK" "$HANDOFF" 2>/dev/null; then
  # Case 1: Existing file WITH markers — replace only the FIRST block between them.
  # State-machine via awk (sed-based approach had ordering bugs with duplicate marker lines).
  TMP="${HANDOFF}.new.$$"
  awk -v start="$START_MARK" -v end="$END_MARK" -v newfile="$NEW_AUTO" '
    BEGIN { state = "before" }
    {
      if (state == "before") {
        if (index($0, start) > 0) {
          state = "in_block"
          while ((getline line < newfile) > 0) print line
          close(newfile)
          next
        }
        print
        next
      }
      if (state == "in_block") {
        if (index($0, end) > 0) { state = "after" }
        next
      }
      # state == "after" — just print
      print
    }
  ' "$HANDOFF" > "$TMP" && mv "$TMP" "$HANDOFF"
elif [ -s "$HANDOFF" ]; then
  # Case 2: Existing file WITHOUT markers — prepend auto-block, keep user content below.
  # Migration-path so we never destroy rich content again.
  BAK="${HANDOFF}.premigrate.$$"
  mv "$HANDOFF" "$BAK"
  {
    cat "$NEW_AUTO"
    echo ""
    echo "---"
    echo ""
    cat "$BAK"
  } > "$HANDOFF"
  rm -f "$BAK"
else
  # Case 3: Fresh write (empty or missing file) — auto-block only.
  cp "$NEW_AUTO" "$HANDOFF"
fi

rm -f "$NEW_AUTO"

# --- Output critical warnings to Claude's stop context ---

if [ -n "$UNCOMMITTED" ]; then
  echo "HANDOFF: $UNCOMMITTED_COUNT uncommitted files. State saved to memory/session-handoff.md"
fi
if [ "$WT_WITH_CHANGES" -gt 0 ] 2>/dev/null; then
  echo "HANDOFF: $WT_WITH_CHANGES worktrees with pending agent work — next session must merge first"
fi

exit 0
