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

# Slice 232: Bypass-Convention erzwingt Begründungs-Klammer.
# `tr -d ' '` oben hat schon alle Spaces gestrippt, daher z.B.
#   spec: inline (Pattern-Wiederholung)  →  $SPEC_FILE_REL = "inline(Pattern-Wiederholung)"
#   spec: inline                         →  $SPEC_FILE_REL = "inline"  → BLOCK
case "$SPEC_FILE_REL" in
    "")        exit 0 ;;       # Idle (schon oben gefangen, defensive)
    "—"|"-")   exit 0 ;;       # Em-Dash idle marker
    inline|skipped)
        # Plain ohne Begründung → Hard-BLOCK
        cat >&2 <<EOF
SHIP-SPEC-QUALITY-BLOCK (Slice 232):
  Active Slice: $SLICE (stage: $STAGE)
  Spec-Wert:    "$SPEC_FILE_REL"

  Plain "$SPEC_FILE_REL" ohne Begründungs-Klammer ist Bypass-Missbrauch.
  Spec-Quality-Gate ist Self-Disziplin-Anker — Bypass dokumentieren WARUM:

    spec: inline (Pattern-Wiederholung Slice X)
    spec: inline (XS-Trivial-Wiederholung)
    spec: skipped (cosmetic XS, S-Slice X)

  ODER schreibe eine echte Spec-Datei: worklog/specs/<slice>-<title>.md
  ODER aktiviere Notbremse: /ship emergency "<grund>"

  Hook-Quelle: .claude/hooks/ship-spec-quality-gate.sh
EOF
        exit 2
        ;;
    inline*|skipped*)
        # Beginnt mit inline/skipped — Klammer-Check
        case "$SPEC_FILE_REL" in
            *"("*")"*) exit 0 ;;       # Klammer vorhanden → bypass legitim
            *)
                cat >&2 <<EOF
SHIP-SPEC-QUALITY-BLOCK (Slice 232):
  Active Slice: $SLICE (stage: $STAGE)
  Spec-Wert:    "$SPEC_FILE_REL"

  "$SPEC_FILE_REL" hat keine Begründungs-Klammer "(...)".
  Bypass dokumentieren:

    spec: inline (XS-Trivial Slice X)
    spec: skipped (cosmetic)

  Hook-Quelle: .claude/hooks/ship-spec-quality-gate.sh
EOF
                exit 2
                ;;
        esac
        ;;
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
# Slice 231: 2-Step Detection (umgeht MSYS Git Bash UTF-8-`\b`-Bug bei `ö`):
#   1. Finde erste Line mit Größe/Groesse/Size:
#   2. Extrahiere XS/S/M/L\b aus dieser Line (head -1, kein tail — sonst
#      matcht "Size: S" aus Edge-Case-Beispiel-Strings)
SIZE_LINE="$(grep -im1 -E "(Größe|Groesse|Size)[[:space:]]*:" "$SPEC_FILE" 2>/dev/null | head -1)"
SLICE_SIZE="$(echo "$SIZE_LINE" | grep -oE "(XS|S|M|L)\b" | head -1)"

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

# Slice 231: Zählt Items in einer Spec-Sektion (Bullets + Numbered + Tabellen-Rows).
#
# $1: lowercase-regex für Sektion-Header (z.B. "code.?reading|reading.?liste").
# Output: Item-Count als Integer.
#
# Boundary:        Erste Header-Zeile, deren tolower($0) das Pattern matcht, ist Start.
#                  Nächste `^#{1,4}[[:space:]]`-Zeile ist End. Bei Datei-Ende: Stop EOF.
# Code-Block:      Innerhalb ` ``` ` werden NUR `^[A-Z]+[-_][0-9]+:`-Pattern (AC-01, EC_02)
#                  gezählt — _TEMPLATE.md formatiert ACs als Code-Block, das ist Standard.
# Tabellen-Header: Wird tentativ als Row gezählt; sieht der Folge-Trenner `|---|`,
#                  rollback (count--). So bleibt nur die Daten-Row-Zahl.
count_items() {
    awk -v pat="$1" '
    BEGIN { in_section=0; in_code=0; count=0; last_was_table_row=0 }
    {
        # Code-Block toggle (` ``` ` am Zeilen-Anfang)
        if ($0 ~ /^[[:space:]]*```/) { in_code = !in_code; last_was_table_row=0; next }

        # Innerhalb Code-Block: nur AC-NN/EC-NN-Pattern zählen
        if (in_code) {
            if (in_section && $0 ~ /^[[:space:]]*[A-Z][A-Z0-9]*[-_][0-9]+:/) count++
            next
        }

        # Header-Detection (außerhalb Code-Block)
        if ($0 ~ /^#{1,4}[[:space:]]/) {
            if (in_section) exit
            lower = tolower($0)
            if (lower ~ pat) in_section=1
            last_was_table_row=0
            next
        }

        if (!in_section) next

        # Tabellen-Trenner: rollback prev `^\|` (das war Header)
        if ($0 ~ /^\|[[:space:]:|=-]+\|[[:space:]]*$/) {
            if (last_was_table_row) count--
            last_was_table_row=0
            next
        }

        # Bullet: -, *, +
        if ($0 ~ /^[[:space:]]*[-*+] /) { count++; last_was_table_row=0; next }
        # Numbered: 1. 2. ...
        if ($0 ~ /^[[:space:]]*[0-9]+\. /) { count++; last_was_table_row=0; next }
        # Tabellen-Row (Header oder Daten — Trenner-Rollback korrigiert)
        if ($0 ~ /^\|/) { count++; last_was_table_row=1; next }

        # Andere Lines: reset state
        last_was_table_row=0
    }
    END { print count+0 }
    ' "$SPEC_FILE" 2>/dev/null
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

# Wenn Sektionen fehlen → WARN (Sektion-Existenz Layer 1)
if [ -n "$MISSING" ]; then
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
    exit 0
fi

# === Slice 231: Item-Count-Validation (Layer 2) ===
# Sektionen existieren, aber haben sie genug Items?
# Mindest-Counts pro Slice-Größe (workflow.md D50):
#   XS: Code-Reading ≥ 3, Edge-Cases ≥ 3, ACs ≥ 3
#   S:  alle ≥ 6
#   M:  Code-Reading ≥ 6, Edge-Cases ≥ 8, ACs ≥ 8
#   L:  alle ≥ 10

READING_COUNT=$(count_items "code.?reading|reading.?liste")
EDGE_COUNT=$(count_items "edge.?case")
AC_COUNT=$(count_items "acceptance.?criteria|ac.?liste|acceptance.?cri")

# Defaults falls awk leer ausgibt
READING_COUNT="${READING_COUNT:-0}"
EDGE_COUNT="${EDGE_COUNT:-0}"
AC_COUNT="${AC_COUNT:-0}"

# Min-Counts je Größe
case "$SLICE_SIZE" in
    XS) MIN_READING=3; MIN_EDGE=3; MIN_AC=3 ;;
    S)  MIN_READING=6; MIN_EDGE=6; MIN_AC=6 ;;
    M)  MIN_READING=6; MIN_EDGE=8; MIN_AC=8 ;;
    L)  MIN_READING=10; MIN_EDGE=10; MIN_AC=10 ;;
    *)  MIN_READING=6; MIN_EDGE=6; MIN_AC=6 ;;
esac

INSUFFICIENT=""
[ "$READING_COUNT" -lt "$MIN_READING" ] 2>/dev/null && \
    INSUFFICIENT="$INSUFFICIENT Code-Reading-Liste:$READING_COUNT/$MIN_READING;"
[ "$EDGE_COUNT" -lt "$MIN_EDGE" ] 2>/dev/null && \
    INSUFFICIENT="$INSUFFICIENT Edge-Cases:$EDGE_COUNT/$MIN_EDGE;"
[ "$AC_COUNT" -lt "$MIN_AC" ] 2>/dev/null && \
    INSUFFICIENT="$INSUFFICIENT Acceptance-Criteria:$AC_COUNT/$MIN_AC;"

# Wenn alles ok → silent exit
[ -z "$INSUFFICIENT" ] && exit 0

cat >&2 <<EOF
SHIP-SPEC-QUALITY-WARN (Slice 231 — Item-Count-Layer):
  Active Slice:  $SLICE (stage: $STAGE, size: $SLICE_SIZE)
  Spec:          $SPEC_FILE_REL
  Sektionen existieren — aber Item-Counts unter Mindest:
    $INSUFFICIENT

  Slice 211 D50 Standard:
    XS: Code-Reading ≥ 3, Edge-Cases ≥ 3, ACs ≥ 3
    S:  alle ≥ 6
    M:  Code-Reading ≥ 6, Edge-Cases ≥ 8, ACs ≥ 8
    L:  alle ≥ 10

  Eine Spec mit Header-Sektion + 0 Items ist eine Wunschliste, nicht
  ein Kompass — der Agent läuft blind in bekannte Fallen.

  Diese Warnung blockt KEINEN commit. WARN-only, Self-Disziplin.
  Hook-Quelle: .claude/hooks/ship-spec-quality-gate.sh
EOF

exit 0
