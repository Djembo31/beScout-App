#!/bin/bash
# Slice 230: Reminds to update worklog/beta-phase.md findings_open after feat/fix-Commits
# Trigger: Stop event
#
# Rationale: Slices die Findings closen sollten findings_open Counter dekrementieren.
# Bei Heal-Wave 224+225+226+227 wurde das manuell via sed gemacht — fehleranfällig.
# Reminder-Hook (NICHT Auto-Update — zu fehleranfällig).
#
# Skip-Conditions:
#   - active.md status != idle (Slice noch aktiv)
#   - Letzter Commit ist chore/docs/test (kein feat/fix)
#   - Letzter feat/fix-Commit hatte beta-phase.md im Diff (= Counter wurde aktualisiert)

ACTIVE="worklog/active.md"
PHASE_TRACKER="worklog/beta-phase.md"

# Kein active.md → exit (legacy state)
[ ! -f "$ACTIVE" ] && exit 0
# Kein beta-phase.md → exit (kein Phase-Tracker im Repo)
[ ! -f "$PHASE_TRACKER" ] && exit 0

STATUS=$(sed -n 's/^status:[[:space:]]*\([a-z-]*\).*/\1/p' "$ACTIVE" 2>/dev/null | head -1)

# Nur reminden bei status=idle (Slice gerade abgeschlossen)
[ "$STATUS" != "idle" ] && exit 0

# Letzten 5 Commits scannen für feat/fix-Pattern
RECENT_COMMITS=$(git log --oneline -5 --pretty=format:"%H %s" 2>/dev/null)
[ -z "$RECENT_COMMITS" ] && exit 0

# Find latest feat/fix-Commit (innerhalb letzter 5)
FEAT_FIX_HASH=""
FEAT_FIX_SUBJECT=""
while IFS= read -r line; do
  HASH=$(echo "$line" | awk '{print $1}')
  SUBJECT=$(echo "$line" | cut -d' ' -f2-)
  case "$SUBJECT" in
    feat\(*\)*|fix\(*\)*)
      FEAT_FIX_HASH="$HASH"
      FEAT_FIX_SUBJECT="$SUBJECT"
      break
      ;;
  esac
done <<< "$RECENT_COMMITS"

# Kein feat/fix in den letzten 5 → silent (Wave-3-Tooling/Docs-only Sessions)
[ -z "$FEAT_FIX_HASH" ] && exit 0

# Check ob beta-phase.md im Diff dieses Commits war
if git show --stat "$FEAT_FIX_HASH" 2>/dev/null | grep -q "worklog/beta-phase.md"; then
  # beta-phase.md wurde aktualisiert → silent
  exit 0
fi

# Reminder
cat <<EOF
[phase-tracker-reminder] Slice gerade idle — letzter feat/fix-Commit hat beta-phase.md NICHT modifiziert.
  Commit: $FEAT_FIX_HASH ${FEAT_FIX_SUBJECT:0:80}
  Frage: hat dieser Slice Findings geheilt/closed?
    → JA: \`worklog/beta-phase.md\` findings_open Counter manuell dekrementieren
    → NEIN (Tooling/Docs/Audit-only Slice): ignorieren, Hook ist nicht-blocking
  Hook-Quelle: .claude/hooks/ship-phase-tracker-reminder.sh
EOF

exit 0
