#!/usr/bin/env bash
# SHIP-Loop Slice 212 (D50 Wave 2): WARN bei Spec ohne Pflicht-Sektionen.
#
# Trigger: PreToolUse Edit/Write
# Wirkung: Liest active.md → spec-File → greppt Pflicht-Section-Keywords →
#          WARN wenn Mindest-Items je Slice-Größe nicht erfüllt sind.
# WARN-only, kein BLOCK (analog ship-cto-review-gate Verdict-Schema).
#
# Pflicht-Sektionen je Slice-Größe (workflow.md Slice 211 D50):
#   XS:  6 Sektionen (Problem, Files, Code-Reading, ACs, Self-Verification, Proof)
#   S/M: 13 Sektionen (alle aus _TEMPLATE.md)
#   L:   13 Sektionen + Pre-Mortem ≥ 5 Szenarien
#
# Skip:
#   - emergency-Slice
#   - active.md idle (kein Slice)
#   - stage SPEC (Spec wird gerade geschrieben)
#   - stage LOG (Slice fertig)
#   - meta-Files (worklog/, memory/, .claude/, scripts/audit/)
#   - Test-Files (__tests__, *.test.ts, *.spec.ts)
#   - node_modules, .next, dist
#
# Robustheit:
#   - exit 0 bei eigenen Errors (Hook bricht nie andere Hooks)
#   - tolerant gegen Section-Header-Drift (`## 1.`, `## 1)`, `## Ziel`, etc.)
#   - JSON-Stdin-Parsing analog ship-spec-gate.sh

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

# Empty file_path → not Edit/Write → allow silent
[ -z "$FILE_PATH" ] && exit 0

# Normalize path (strip drive-letter for cross-platform matching)
NORM_PATH="$(echo "$FILE_PATH" | sed 's|^[A-Za-z]:||' | sed 's|\\|/|g')"

# Skip meta-File-Edits — Hook nur fuer Code-Files
case "$NORM_PATH" in
    */worklog/*)             exit 0 ;;
    */memory/*)              exit 0 ;;
    */.claude/*)             exit 0 ;;
    */scripts/audit/*)       exit 0 ;;
    */node_modules/*)        exit 0 ;;
    */.next/*)               exit 0 ;;
    */dist/*)                exit 0 ;;
    */__tests__/*)           exit 0 ;;
    *.test.ts|*.test.tsx)    exit 0 ;;
    *.spec.ts|*.spec.tsx)    exit 0 ;;
    *.md)                    exit 0 ;;  # Markdown selbst nicht checken
esac

REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
ACTIVE="$REPO_ROOT/worklog/active.md"

# active.md missing → first-run, allow silent
[ ! -f "$ACTIVE" ] && exit 0

SLICE="$(sed -n 's/^slice:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d ' ')"
STAGE="$(sed -n 's/^stage:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d ' ')"

# Idle / no-slice → silent
case "$SLICE" in
    ""|"—"|"-") exit 0 ;;
esac

# Emergency-Slice → silent (analog Verdict-Hook)
case "$SLICE" in
    emergency-*) exit 0 ;;
esac

# Stage-Filter: Hook nur aktiv waehrend BUILD/REVIEW/PROVE
# - SPEC: spec wird gerade geschrieben, noch nicht fertig
# - LOG: Slice abgeschlossen, no point checking
# - "—" / leer: idle (schon oben gefangen)
case "$STAGE" in
    BUILD|REVIEW|PROVE) ;;  # OK — pruefen
    *) exit 0 ;;             # andere Stages skip
esac

# Spec-File suchen via active.md `spec:` Zeile
SPEC_FILE_REL="$(sed -n 's/^spec:[[:space:]]*\(.*\)$/\1/p' "$ACTIVE" | head -1 | tr -d ' ')"

# Skip wenn spec ist "inline" oder leer
case "$SPEC_FILE_REL" in
    ""|"—"|"-"|"inline"|"inline*"|"skipped*") exit 0 ;;
esac

# Skip wenn pattern nicht wie ein File-Pfad aussieht
case "$SPEC_FILE_REL" in
    worklog/specs/*) ;;
    *) exit 0 ;;
esac

SPEC_FILE="$REPO_ROOT/$SPEC_FILE_REL"

# Spec-File missing → WARN aber kein BLOCK
if [ ! -f "$SPEC_FILE" ]; then
    cat >&2 <<EOF
SHIP-SPEC-QUALITY-WARN (Slice 212 D50 Wave 2):
  Active Slice: $SLICE (stage: $STAGE)
  Erwartete Spec: $SPEC_FILE_REL (fehlt)
  → Spec-File-Pfad in active.md korrigieren oder Spec-File anlegen.
EOF
    exit 0
fi

# Slice-Größe detektieren aus Spec-Header `**Größe:** XS|S|M|L`
# Tolerant gegen Bold-Markdown-Variation
SLICE_SIZE="$(grep -oiE "(\*\*)?(Größe|Groesse|Size)(\*\*)?[[:space:]]*:[[:space:]]*(\*\*)?(XS|S|M|L)\b" "$SPEC_FILE" | head -1 | grep -oE "(XS|S|M|L)\b" | tail -1)"

# Default zu S wenn nicht detektiert (mittlere Strenge)
[ -z "$SLICE_SIZE" ] && SLICE_SIZE="S"

# Pflicht-Sektion-Keywords (case-insensitive grep, tolerant gegen Stil-Drift)
# Header-Patterns: `## 1. Problem`, `## Ziel`, `### Problem-Statement`, `## 1) Problem`
# Wir greppen für **bekannte Keywords** anywhere in einem Header (^##)

# Sektions-Map (Slice 211 D50):
#   1: Problem-Statement / Ziel
#   2: Lösungs-Design / Architektur
#   3: Betroffene Files / Files
#   4: Code-Reading-Liste / Code-Reading
#   5: Pattern-References / Pattern-Refs
#   6: Acceptance Criteria / ACs
#   7: Edge Cases
#   8: Self-Verification
#   9: Open-Questions / Klärung
#  10: Proof-Plan / Proof
#  11: Scope-Out
#  12: Stage-Chain
#  13: Pre-Mortem

count_section() {
    # $1: regex pattern (case-insensitive)
    grep -ciE "^#{1,4}[[:space:]].*$1" "$SPEC_FILE" 2>/dev/null
}

S_PROBLEM=$(count_section "(Problem.?Statement|Ziel|Problem)")
S_DESIGN=$(count_section "(Lösungs.?Design|Architektur|Solution.?Design)")
S_FILES=$(count_section "(Betroffene Files|Files|Affected Files)")
S_READING=$(count_section "(Code.?Reading|Reading.?Liste)")
S_PATTERNS=$(count_section "(Pattern.?References|Pattern.?Refs)")
S_ACS=$(count_section "(Acceptance.?Criteria|ACs|AC.?Liste)")
S_EDGE=$(count_section "(Edge.?Cases?)")
S_VERIFY=$(count_section "(Self.?Verification|Verification.?Commands)")
S_OPEN=$(count_section "(Open.?Questions|Offene.?Fragen|Klärung)")
S_PROOF=$(count_section "(Proof.?Plan|Proof)")
S_SCOPE=$(count_section "(Scope.?Out|Scope-Out)")
S_STAGE=$(count_section "(Stage.?Chain)")
S_PREMORTEM=$(count_section "(Pre.?Mortem)")

# Pflicht-Items je Slice-Größe (Slice 211 workflow.md)
# XS: 1, 3, 4, 6, 8, 10 (Problem, Files, Code-Reading, ACs, Self-Verify, Proof)
# S/M: alle 13
# L: alle 13 + Pre-Mortem ≥ 5 Szenarien

MISSING=""
case "$SLICE_SIZE" in
    XS)
        [ "$S_PROBLEM" = "0" ]  && MISSING="$MISSING Problem-Statement;"
        [ "$S_FILES" = "0" ]    && MISSING="$MISSING Files;"
        [ "$S_READING" = "0" ]  && MISSING="$MISSING Code-Reading-Liste;"
        [ "$S_ACS" = "0" ]      && MISSING="$MISSING Acceptance-Criteria;"
        [ "$S_VERIFY" = "0" ]   && MISSING="$MISSING Self-Verification;"
        [ "$S_PROOF" = "0" ]    && MISSING="$MISSING Proof-Plan;"
        ;;
    S|M)
        [ "$S_PROBLEM" = "0" ]   && MISSING="$MISSING Problem-Statement;"
        [ "$S_DESIGN" = "0" ]    && MISSING="$MISSING Lösungs-Design;"
        [ "$S_FILES" = "0" ]     && MISSING="$MISSING Files;"
        [ "$S_READING" = "0" ]   && MISSING="$MISSING Code-Reading-Liste;"
        [ "$S_PATTERNS" = "0" ]  && MISSING="$MISSING Pattern-References;"
        [ "$S_ACS" = "0" ]       && MISSING="$MISSING Acceptance-Criteria;"
        [ "$S_EDGE" = "0" ]      && MISSING="$MISSING Edge-Cases;"
        [ "$S_VERIFY" = "0" ]    && MISSING="$MISSING Self-Verification;"
        [ "$S_OPEN" = "0" ]      && MISSING="$MISSING Open-Questions;"
        [ "$S_PROOF" = "0" ]     && MISSING="$MISSING Proof-Plan;"
        [ "$S_SCOPE" = "0" ]     && MISSING="$MISSING Scope-Out;"
        [ "$S_STAGE" = "0" ]     && MISSING="$MISSING Stage-Chain;"
        ;;
    L)
        [ "$S_PROBLEM" = "0" ]   && MISSING="$MISSING Problem-Statement;"
        [ "$S_DESIGN" = "0" ]    && MISSING="$MISSING Lösungs-Design;"
        [ "$S_FILES" = "0" ]     && MISSING="$MISSING Files;"
        [ "$S_READING" = "0" ]   && MISSING="$MISSING Code-Reading-Liste;"
        [ "$S_PATTERNS" = "0" ]  && MISSING="$MISSING Pattern-References;"
        [ "$S_ACS" = "0" ]       && MISSING="$MISSING Acceptance-Criteria;"
        [ "$S_EDGE" = "0" ]      && MISSING="$MISSING Edge-Cases;"
        [ "$S_VERIFY" = "0" ]    && MISSING="$MISSING Self-Verification;"
        [ "$S_OPEN" = "0" ]      && MISSING="$MISSING Open-Questions;"
        [ "$S_PROOF" = "0" ]     && MISSING="$MISSING Proof-Plan;"
        [ "$S_SCOPE" = "0" ]     && MISSING="$MISSING Scope-Out;"
        [ "$S_STAGE" = "0" ]     && MISSING="$MISSING Stage-Chain;"
        [ "$S_PREMORTEM" = "0" ] && MISSING="$MISSING Pre-Mortem;"
        ;;
esac

# Wenn alles da → silent exit
[ -z "$MISSING" ] && exit 0

# Sonst WARN
cat >&2 <<EOF
SHIP-SPEC-QUALITY-WARN (Slice 212 D50 Wave 2):
  Active Slice:  $SLICE (stage: $STAGE, size: $SLICE_SIZE)
  Spec:          $SPEC_FILE_REL
  Fehlende Pflicht-Sektionen: $MISSING

  Slice 211 D50 Standard (workflow.md):
    XS:  6 Sektionen (Problem, Files, Code-Reading, ACs, Self-Verification, Proof)
    S/M: 13 Sektionen (siehe worklog/specs/_TEMPLATE.md)
    L:   13 Sektionen + Pre-Mortem ≥ 5 Szenarien

  Diese Warnung blockt KEINEN commit. Spec-Quality ist Self-Disziplin.
  Bei nicht-konformer Spec: Sektion ergänzen ODER Slice-Größe-Header
  korrigieren (z.B. **Größe:** XS wenn Mini-Slice).

  Hook-Quelle: .claude/hooks/ship-spec-quality-gate.sh
EOF

# WARN-only — kein BLOCK
exit 0
