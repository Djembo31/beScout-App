#!/usr/bin/env bash
# SHIP-Loop Slice 214 (D50 Wave 2): WARN bei "fertig"/"ready"/"launch"-Claims
# wenn worklog/beta-phase.md.last_signoff != PASS.
#
# Trigger: UserPromptSubmit
# Wirkung: Wenn Anil oder CTO sagt "wir sind fertig" / "beta ready" / "launch"
#          und kein PASS-Sign-Off vorliegt → WARN mit echtem Stand.
# WARN-only (analog Slice 211 Verdict-Hook + Slice 212 Spec-Quality).
#
# Anti-False-Positive (Slice 214 Reviewer-Heal HIGH-1):
#   Whitelist-Filter VOR Stage-1-Match — explicit erlaubte "fertig"-Kontexte:
#   - "Slice X fertig" / "Slice fertig committed"
#   - "Wave X fertig"
#   - "Spec fertig" / "Build fertig" / "Review fertig" / "Phase X fertig"
#   PLUS Stage-2-AND-Match (completion-claim AND beta-context-keyword)
#
# Skip:
#   - Phase-Tracker missing (first-run)
#   - Phase-Tracker zeigt last_signoff: PASS (Beta freigegeben)
#   - Stop-Event oder andere non-prompt-events
#
# Robustheit:
#   - exit 0 bei eigenen Errors (Hook bricht nie andere)
#   - JSON-Stdin-Parsing analog ship-cto-review-gate.sh
#   - keine Phase-Tracker-Modifikation (read-only)

set -u

JSON_INPUT="$(cat 2>/dev/null || echo '{}')"

# Extract prompt-text (UserPromptSubmit-Event)
# Slice 214 Reviewer-Heal MED-6: non-greedy `[^"]*` statt greedy `.*`
# (Multi-Field-JSON safe — match nur bis nächstes Quote)
PROMPT="$(echo "$JSON_INPUT" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
if [ -z "$PROMPT" ]; then
    PROMPT="$(echo "$JSON_INPUT" | sed -n 's/.*"user_prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
fi

# Empty prompt → not UserPromptSubmit-Event → silent
[ -z "$PROMPT" ] && exit 0

# Convert to lowercase for case-insensitive match (POSIX-tolerant)
PROMPT_LOWER="$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')"

# Slice 214 Reviewer-Heal HIGH-1: Whitelist-Filter VOR Stage-1.
# Wenn "Slice X fertig" / "Wave X fertig" / "Spec fertig" / etc. erkannt → silent.
# Diese sind legitime Completion-Statements im Per-Slice-Kontext, kein Beta-Claim.
case "$PROMPT_LOWER" in
    *"slice "*" fertig"*|*"slice fertig"*) exit 0 ;;
    *"wave "*" fertig"*|*"wave fertig"*) exit 0 ;;
    *"spec fertig"*|*"build fertig"*|*"review fertig"*|*"prove fertig"*) exit 0 ;;
    *"phase "*" fertig"*) exit 0 ;;
    *"fertig committed"*|*"fertig gepusht"*) exit 0 ;;
esac

# Trigger-Detection: 2-Stage AND-Match
# Stage 1: "fertig"/"ready"/"launch"-Phrase vorhanden?
# Stage 2: "beta"/"launch"/"production"/"go-live"-Kontext vorhanden?

HAS_COMPLETION_CLAIM=0
case "$PROMPT_LOWER" in
    *fertig*|*ready*|*"go live"*|*"go-live"*|*golive*) HAS_COMPLETION_CLAIM=1 ;;
esac

[ "$HAS_COMPLETION_CLAIM" = "0" ] && exit 0

HAS_BETA_CONTEXT=0
case "$PROMPT_LOWER" in
    *beta*|*launch*|*production*|*"go-live"*|*"50 tester"*|*"50-tester"*) HAS_BETA_CONTEXT=1 ;;
esac

[ "$HAS_BETA_CONTEXT" = "0" ] && exit 0

# Beide Stages getroffen — jetzt Phase-Tracker prüfen
REPO_ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
TRACKER="$REPO_ROOT/worklog/beta-phase.md"

# Tracker missing → silent (first-run, Phase-Tracker noch nicht initialisiert)
[ ! -f "$TRACKER" ] && exit 0

# Extract last_signoff-Wert
SIGNOFF="$(grep -E "^last_signoff:" "$TRACKER" | head -1 | sed 's/last_signoff:[[:space:]]*//' | tr -d ' ')"

# Wenn PASS → silent (Beta-Sign-Off hat stattgefunden)
case "$SIGNOFF" in
    PASS|"PASS") exit 0 ;;
esac

# Sonst: WARN mit echtem Stand
PHASE="$(grep -E "^phase:" "$TRACKER" | head -1 | sed 's/phase:[[:space:]]*//' | tr -d ' ')"
LAST_RUN="$(grep -E "^last_phase_run:" "$TRACKER" | head -1 | sed 's/last_phase_run:[[:space:]]*//')"
P0="$(grep -E "^[[:space:]]+P0:" "$TRACKER" | head -1 | sed 's/.*P0:[[:space:]]*//' | tr -d ' ')"
P1="$(grep -E "^[[:space:]]+P1:" "$TRACKER" | head -1 | sed 's/.*P1:[[:space:]]*//' | tr -d ' ')"
P2="$(grep -E "^[[:space:]]+P2:" "$TRACKER" | head -1 | sed 's/.*P2:[[:space:]]*//' | tr -d ' ')"
P3="$(grep -E "^[[:space:]]+P3:" "$TRACKER" | head -1 | sed 's/.*P3:[[:space:]]*//' | tr -d ' ')"

cat >&2 <<EOF
SHIP-PHASE-GATE-WARN (Slice 214 D50 Wave 2):

  Prompt-Phrase erkannt die Beta-Launch-Claim impliziert.
  Aktueller Phase-Tracker-Stand widerspricht "fertig"-Behauptung:

  Phase:           ${PHASE:-unbekannt}
  Letzter Run:     ${LAST_RUN:-nie}
  Sign-Off:        ${SIGNOFF:-never}
  Findings open:   P0=${P0:-?}, P1=${P1:-?}, P2=${P2:-?}, P3=${P3:-?}

  → "Beta-fertig" nur wenn:
    - last_signoff == PASS
    - findings_open.P0 == 0 UND findings_open.P1 ≤ akzeptabel

  Vor "fertig"-Behauptung:
    1. /auto-beta-ready status   (echter Stand)
    2. /auto-beta-ready signoff  (Phase D Sign-Off-Check)
    3. Erst dann "ready"-Claim erlaubt

  Diese Warnung blockt NICHTS. Self-Disziplin gegen "fertig zu früh".
  Slice 211 D50: "die Spec ist der Kompass; die Phase-Tracker ist der GPS".

  Hook-Quelle: .claude/hooks/ship-phase-gate.sh
  Tracker:     worklog/beta-phase.md
EOF

# WARN-only — kein BLOCK
exit 0
