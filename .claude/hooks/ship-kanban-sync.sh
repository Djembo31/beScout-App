#!/bin/bash
# Reminds to sync Notion Kanban with active slice
# Trigger: Stop + SessionStart
# Rationale: Kanban-as-Control-Surface-Pattern — Notion Kanban should reflect active worklog/

ACTIVE="worklog/active.md"
if [ ! -f "$ACTIVE" ]; then
  exit 0
fi

STATUS=$(sed -n 's/^status:[[:space:]]*\([a-z]*\).*/\1/p' "$ACTIVE" 2>/dev/null | head -1)
SLICE=$(sed -n 's/^slice:[[:space:]]*\([0-9a-zA-Z_-]*\).*/\1/p' "$ACTIVE" 2>/dev/null | head -1)
STAGE=$(sed -n 's/^stage:[[:space:]]*\([A-Z_]*\).*/\1/p' "$ACTIVE" 2>/dev/null | head -1)

if [ "$STATUS" = "active" ] && [ -n "$SLICE" ] && [ "$SLICE" != "—" ]; then
  cat <<EOF
[kanban-sync] Active slice: $SLICE (stage: $STAGE)
  - If matching Notion-Kanban-Item exists: set Status "In Bearbeitung" + Slice field "$SLICE"
  - If Slice DONE: set Status "Erledigt" + Commit-Hash in Commit field
  - Kanban-URL: https://www.notion.so/20273b4a80e98050b014f37d659bed5c
EOF
elif [ "$STATUS" = "idle" ]; then
  # Check if last 3 commits have been pushed to Kanban
  LAST_SLICES=$(git log --oneline -5 --pretty=format:"%s" 2>/dev/null | grep -oE "Slice [0-9]+" | head -3 | sort -u)
  if [ -n "$LAST_SLICES" ]; then
    cat <<EOF
[kanban-sync] Idle. Recently-completed slices detected:
$LAST_SLICES
  → Verify these are marked "Erledigt" in Notion Kanban
EOF
  fi
fi

exit 0
