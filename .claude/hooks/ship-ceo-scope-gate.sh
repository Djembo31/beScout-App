#!/usr/bin/env bash
# SHIP-Loop: CEO-Scope-Gate.
# PreToolUse on Write of worklog/specs/*.md.
# Detects CEO-Scope-Keywords in Spec → injects Plan-Review-Reminder.
# Non-blocking, session-once per slice.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0

# Only trigger on Spec-files
case "$FILE_PATH" in
    */worklog/specs/*.md) ;;
    *) exit 0 ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
STATE_DIR="$REPO_ROOT/.claude/state"
mkdir -p "$STATE_DIR" 2>/dev/null

# Per-spec-file warned-cache (so we don't spam on every edit of same spec)
SPEC_BASENAME="$(basename "$FILE_PATH" .md)"
WARNED_FLAG="$STATE_DIR/ceo-scope-${SPEC_BASENAME}.flag"

if [ -f "$WARNED_FLAG" ]; then
    FLAG_AGE=$(( $(date +%s) - $(stat -c %Y "$WARNED_FLAG" 2>/dev/null || echo 0) ))
    [ "$FLAG_AGE" -lt 28800 ] && exit 0
    rm -f "$WARNED_FLAG"
fi

# Extract new_string or content from JSON_INPUT
# Edit: `new_string`, Write: `content`
CONTENT="$(echo "$JSON_INPUT" | sed -n 's/.*"new_string"[[:space:]]*:[[:space:]]*"\(.*\)","old_string".*/\1/p')"
[ -z "$CONTENT" ] && CONTENT="$(echo "$JSON_INPUT" | sed -n 's/.*"content"[[:space:]]*:[[:space:]]*"\(.*\)"}.*/\1/p')"

# Also scan file itself if it exists (content extraction may miss)
if [ -f "$FILE_PATH" ]; then
    CONTENT="$CONTENT
$(cat "$FILE_PATH" 2>/dev/null)"
fi

[ -z "$CONTENT" ] && exit 0

# Lowercase for case-insensitive match
LC_CONTENT="$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]')"

# Trigger-Lists
MONEY_HIT=""
LEGAL_HIT=""
QA_HIT=""

case "$LC_CONTENT" in
    *"\$scout"*|*'$scout'*) MONEY_HIT="$MONEY_HIT \$SCOUT" ;;
esac
for kw in "fee" "gebuehr" "gebühr" "pbt" "wallet" "geld" "cents" "bigint" "trading-fee" "ipo" "erstverkauf" "liquidate" "liquidation" "withdraw" "auszahlung" "refund" "treasury"; do
    case "$LC_CONTENT" in
        *"$kw"*) MONEY_HIT="$MONEY_HIT $kw" ;;
    esac
done

for kw in "licensing" "license" "lizenz" "mica" "casp" "mga" "spk" "masak" "disclaimer" "wording" "prize" "preisgeld" "gewinner" "gewinn" "rendite" "invest" "dividende" "asset-klasse" "anteil"; do
    case "$LC_CONTENT" in
        *"$kw"*) LEGAL_HIT="$LEGAL_HIT $kw" ;;
    esac
done

for kw in "edge case" "null-guard" "race condition" "stale cache" "offline" "double-click" "unauth" "i18n" "mobile 393"; do
    case "$LC_CONTENT" in
        *"$kw"*) QA_HIT="$QA_HIT $kw" ;;
    esac
done

# Emit reminders if hits
ANY_HIT=0

if [ -n "$MONEY_HIT" ]; then
    ANY_HIT=1
    echo "[CEO-SCOPE-GATE] Money-Keywords in Spec:${MONEY_HIT}"
    echo "  → plan-ceo-review empfohlen VOR BUILD (Business-Hat-Check)"
    echo "  → CEO-Approval gemaess memory/ceo-approval-matrix.md pruefen"
fi

if [ -n "$LEGAL_HIT" ]; then
    ANY_HIT=1
    echo "[CEO-SCOPE-GATE] Legal/Compliance-Keywords:${LEGAL_HIT}"
    echo "  → plan-legal-review empfohlen VOR BUILD (Wording/Phase/Disclaimer-Check)"
    echo "  → business.md Asset-Klasse-Positionierung + erweiterter Verbots-Register pruefen"
fi

if [ -n "$QA_HIT" ]; then
    ANY_HIT=1
    echo "[CEO-SCOPE-GATE] Edge-Case-Keywords:${QA_HIT}"
    echo "  → plan-qa-review empfohlen VOR BUILD (12 Edge-Case-Kategorien)"
fi

if [ "$ANY_HIT" -eq 1 ]; then
    touch "$WARNED_FLAG"
fi

exit 0
