# Slice 257 — Hardening-Bundle (F-4 + F-8 + D60-Hook)

**Status:** SPEC · **Größe:** S · **Slice-Type:** Tool+GHA+Hook · **Scope:** CTO · **Datum:** 2026-04-29

---

## 1. Problem Statement

Reviewer Slice 255 + Slice 256 Backlog hat 3 Process-Hardening-Items (alle XS auf eigene, zusammen S-Bundle):

- **F-4 (P2):** `nightly-audit.yml` aggregate-Step ignoriert `cron-health` failure → Auto-Issue-Title sagt "(none — but new audit-report files detected)" wenn nur cron-health failed. Reviewer-Find Slice 255.
- **F-8 (P3):** `scripts/rotate-secret.ts:55` baut RegExp aus `keyName` ohne Escape — Sonderzeichen (`.`, `*`, `+`, `?` etc.) im Key-Namen würden als Regex-Syntax interpretiert (theoretisch DoS oder False-Match, praktisch: alle aktuellen Keys safe, aber defensive Hygiene). Reviewer-Find Slice 255.
- **D60-Hook (P3):** D60 (Slice 255) etablierte Wave-Verify-Re-Switch-Pflicht für State-Switch-Slices, aber **Re-Visit-Trigger empfahl Hook-Implementation für Slice 256+**. Ohne Hook bleibt der Standard nur Text in workflow.md.

**Wer betroffen?** F-4 = CTO/Tooling-Sichtbarkeit (Auto-Issue-Triage). F-8 = Operations-Robustheit. D60-Hook = zukünftige Slices die State-Switch implementieren.

## 2. Lösungs-Design

3 unabhängige Tracks, in 1 Slice gebündelt weil alle XS und alle Hardening-Klasse:

- **Track A (F-4):** 2-Zeilen-Edit in `.github/workflows/nightly-audit.yml` aggregate-step + tools-array.
- **Track B (F-8):** Helper `escapeRegex()` in `rotate-secret.ts` + 2 Call-Sites umstellen.
- **Track C (D60):** `.claude/hooks/ship-verify-completeness-gate.sh` neu (WARN-only, analog `ship-spec-quality-gate.sh`) + Settings-Registrierung.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `.github/workflows/nightly-audit.yml` | EDIT | F-4 cron-health in aggregate + tools |
| `scripts/rotate-secret.ts` | EDIT | F-8 escapeRegex in 2 Call-Sites |
| `.claude/hooks/ship-verify-completeness-gate.sh` | NEU | D60 Hook-Implementation |
| `.claude/settings.json` | EDIT | Hook registrieren auf PreToolUse Bash |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Zu prüfen |
|------|-------|-----------|
| `.github/workflows/nightly-audit.yml` | Aggregate-Logic | Wo werden Step-Outcomes aggregiert (lines 218-237)? Wo ist tools-Array (line 250)? |
| `scripts/rotate-secret.ts` | RegExp-Konstruktion | Beide Call-Sites: line 55 (`readEnvVar`) + line 64 (`writeEnvVar`) |
| `.claude/hooks/ship-spec-quality-gate.sh` | Hook-Pattern-Vorlage | JSON-Stdin-Parsing, Skip-Logic, WARN-vs-BLOCK |
| `.claude/hooks/ship-cto-review-gate.sh` | Commit-Trigger-Pattern | Wie wird `git commit` als Trigger erkannt? |
| `.claude/settings.json` | Hook-Registrierung | Wo werden PreToolUse Bash hooks registriert? |
| `memory/decisions.md` D60 | State-Switch-Definition | Welche Slice-Types sind State-Switch? Welche Phasen? |

## 5. Pattern-References

- `errors-infra.md` "settings.json-Edit > 3 Hooks → IMPACT-Stage-Pflicht" (Slice 234) — bei 1 Hook kein IMPACT nötig, aber Trigger-Trigger-Latency-Bewusstsein behalten
- `errors-infra.md` "Heredoc-Backdoor in Commit-Gates" (Slice 145+146) — Hook MUSS heredoc-resistente Commit-Trigger-Detection haben (analog ship-cto-review-gate)
- `errors-infra.md` "grep `\\b` Word-Boundary broken bei JSON-escaped Heredoc" (Slice 146) — `[(:]`-Suffix ohne `\\b`-Anchor
- `decisions.md` D45 "Hooks > Text-Regeln" — Hook-First für Standards
- `decisions.md` D60 "Wave-Verify-Re-Switch-Pflicht" — die Source-of-Truth dieses Hook-Designs

## 6. Acceptance Criteria

```
AC-01: [F-4] cron-health failure in aggregate FAILURES list
  VERIFY: grep "cron_health" .github/workflows/nightly-audit.yml | wc -l
  EXPECTED: ≥ 4 matches (1 step-id + 1 in aggregate + 1 in tools-array + plus existing 1)
  FAIL IF: aggregate-step zaehlt cron_health.outcome nicht

AC-02: [F-4] tools-array enthält 'cron-health'
  VERIFY: grep "'cron-health'" .github/workflows/nightly-audit.yml
  EXPECTED: 1+ Treffer im tools-Array
  FAIL IF: nicht enthalten → Body-Section fehlt im Auto-Issue

AC-03: [F-8] escapeRegex existiert + wird genutzt
  VERIFY: grep -c "escapeRegex" scripts/rotate-secret.ts
  EXPECTED: ≥ 3 (1 Definition + 2 Call-Sites)
  FAIL IF: < 3

AC-04: [F-8] keine raw-`${key}` mehr in `new RegExp` direkt
  VERIFY: grep -n "new RegExp.*\\${key}" scripts/rotate-secret.ts
  EXPECTED: 0 raw-Treffer (alle escaped via escapeRegex)
  FAIL IF: ≥ 1 unescaped

AC-05: [D60-Hook] Hook-File existiert + executable
  VERIFY: ls -l .claude/hooks/ship-verify-completeness-gate.sh
  EXPECTED: File da, +x, shebang #!/usr/bin/env bash
  FAIL IF: missing oder non-executable

AC-06: [D60-Hook] Settings-Registrierung
  VERIFY: grep "ship-verify-completeness-gate" .claude/settings.json
  EXPECTED: 1 Treffer auf PreToolUse Bash
  FAIL IF: nicht registriert → Hook feuert nie

AC-07: [D60-Hook] Smoke-Test silent bei Idle-Slice
  VERIFY: echo '{"command":"git commit -m \"feat(test): x\""}' | bash .claude/hooks/ship-verify-completeness-gate.sh; echo $?
  EXPECTED: exit 0, kein stderr-Output (active.md ist idle)
  FAIL IF: BLOCK oder stderr-Output

AC-08: [D60-Hook] Smoke-Test WARN bei State-Switch-Slice ohne 3-Phasen-Proof
  VERIFY: Mock active.md mit slice 254 + spec mit "Liga-Switch" Title + Proof ohne Re-Switch-Section. Hook ausführen.
  EXPECTED: exit 0, stderr enthält D60-Warnung
  FAIL IF: kein WARN ODER BLOCK
```

## 7. Edge Cases Table

| # | Track | Case | Input/State | Expected | Mitigation |
|---|-------|------|-------------|----------|------------|
| 1 | F-4 | Cron-health step skipped (env-missing) | `outcome=skipped` | NICHT in FAILURES | Nur `=='failure'` matcht, skipped wird ignoriert |
| 2 | F-8 | Key-Name mit Punkten (z.B. `NEXT_PUBLIC.SUPABASE.URL`) | regex meta `.` | escape funktioniert, kein false-match | escapeRegex + Test |
| 3 | F-8 | Key-Name mit `[` (z.B. `KEY[0]`) | unbalanced bracket | regex compile-error pre-fix, post-fix safe | escapeRegex |
| 4 | D60-Hook | active.md fehlt | hook reads non-existent | exit 0 silent | `[ ! -f "$ACTIVE" ] && exit 0` |
| 5 | D60-Hook | Slice ist Audit-only (kein Code-Pfad) | spec ohne State-Switch-keyword | exit 0 silent | Title-Keyword-Detection |
| 6 | D60-Hook | Proof-File hat alle 3 Phasen aber andere Begriffe | "Phase 1: clean", "Phase 2: A→B" | grep matcht "Phase 1\|Phase 2\|Phase 3" → OK | Multiple-Pattern-Match |
| 7 | D60-Hook | Heredoc-Commit (`-m "$(cat <<EOF ... EOF)"`) | command-string komplex | Hook erkennt `feat(/fix(`-Prefix korrekt | `(feat\|fix\|refactor)[(:]`-Pattern, no `\b` |
| 8 | D60-Hook | Slice ohne separates Proof-File | proof: skipped | WARN sanft, kein BLOCK | exit 0 + stderr-warn |

## 8. Self-Verification Commands

```bash
# Pflicht
npx tsc --noEmit
pnpm exec vitest run scripts/rotate-secret.ts || echo "no test for rotate-secret"

# Track A — F-4
grep -c "cron-health\|cron_health" .github/workflows/nightly-audit.yml  # mind. 4

# Track B — F-8
grep -c "escapeRegex" scripts/rotate-secret.ts  # ≥ 3
grep -nE 'new RegExp\([^)]*\$\{key' scripts/rotate-secret.ts  # 0 raw-templates

# Track C — D60-Hook
ls -l .claude/hooks/ship-verify-completeness-gate.sh  # +x
echo '{"command":"git commit -m \"feat(test): x\""}' | bash .claude/hooks/ship-verify-completeness-gate.sh
grep ship-verify-completeness-gate .claude/settings.json  # ≥ 1

# Audits
pnpm run audit:wiring:check
pnpm run audit:type-truth
```

## 9. Open-Questions

**Pflicht-Klärung:** Keine.

**Autonom-Zone (CTO):**
- Hook-Detection: State-Switch-Slice via Title-Keyword-Match (Liga, Country, Tab, User, Locale, Theme, Switch, Toggle, Re-Switch). Konservatives Whitelist — false-negative besser als false-positive bei WARN-only.
- Phase-Detection im Proof-File: grep für ("fresh"|"forward"|"re-switch") OR ("Phase 1"|"Phase 2"|"Phase 3"). Lockere OR-Logik damit Variation in Proof-Style erlaubt bleibt.
- F-8 escapeRegex: Helper-Funktion oben in der Datei statt inline-replace per Call-Site (DRY).

**Nicht-Autonom:** Keine.

## 10. Proof-Plan

| Track | Artefakt | Format |
|-------|----------|--------|
| F-4 | `worklog/proofs/257-f4-aggregate-grep.txt` | grep-Output mit ≥4 cron-health Treffern |
| F-8 | `worklog/proofs/257-f8-escape-grep.txt` | grep-Output escapeRegex 3+ + raw-RegExp 0 |
| D60-Hook | `worklog/proofs/257-d60-hook-smoke.txt` | 2 Smoke-Test-Outputs (idle + State-Switch-WARN) |

## 11. Scope-Out

- **Reviewer 254 P2 #1 (Manual-GW-Override-per-Liga-Memory)** → eigener Slice 258 falls Anil das will. Bewusste UX-Trade-Off, keine Bug.
- **Slice 256 Live-Verify** → separater Run nach Vercel-Deploy-Settling.
- **F-4 Severity-Tuning (drift>=2 → drift>=3)** → post-Beta nach 5+ Wochen False-Positive-Frei (D52).

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped — 3 isolierte Tracks, kein Cross-Cutting auf src/) → BUILD → REVIEW (self-review D35 — XS-each-Track, Hardening-Klasse) → PROVE → LOG
```

## 13. Pre-Mortem

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | F-4 fix bricht aggregate-Output-Parsing in nachfolgenden Steps | LOW | mittel | aggregate-FAILURES ist append-string, jeder weitere `;` ok | YAML-Lint + Live-Run nightly |
| 2 | F-8 escapeRegex falsch implementiert (overescape) | LOW | niedrig | Standard-MDN-Pattern, getestet in pnpm rotate-secret --verify | Live --verify Run |
| 3 | D60-Hook macht Commit-Latency >100ms | LOW | niedrig | grep + sed only, no fs walks | hook-latency-bench |
| 4 | D60-Hook false-positive bei Audit-Slices | MED | niedrig (WARN-only) | Title-Keyword-Whitelist konservativ | Manuell tunen wenn nervig |
| 5 | Settings.json-Edit registriert Hook auf falsches Event | LOW | niedrig | Manueller Vergleich mit ship-cto-review-gate registration | Hook fires bei git commit |

---

## Compliance-Check

Keine User-facing Strings, kein Money-Path. Compliance-Check: N/A.

## Open Risiko

Slice ist 3-Track Hardening — Review-Aufwand klein, aber Settings.json-Edits bei kumulativen Hooks-Registrierungen (Slice 234 D-Pattern: ≥3 → IMPACT-Pflicht). Hier nur 1 Hook → unter dem Radar. Wenn dieser Hook später false-positive-spam macht: deactivate + tunen, kein BLOCK-Risk weil WARN-only.
