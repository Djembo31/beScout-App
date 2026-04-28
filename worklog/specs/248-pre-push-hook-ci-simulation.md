# Slice 248 — Pre-Push-Hook lokale 4-Status-Check-Simulation

**Größe:** S
**Slice-Type:** Hook
**Datum:** 2026-04-28
**Bezug:** Slice 244 Phase 2 Lehre (Catch-22 enforce_admins=true) + docs/test.rtf #9 (Admin-Push-Bypass-Loch architektonisch besser schließen)

## 1.1 Problem-Statement

Branch-Protection mit `enforce_admins=true` ist nicht direct-push-kompatibel (Catch-22 in Slice 244 Phase 2 live demonstriert). BeScout-Workflow ist Solo-Dev direct-push-zu-main (242 Slice-Historie). Echte Sicherheit gegen ≥20-stille-Failures-Pattern braucht **pre-push-Layer**, nicht post-push-Gate.

**Evidenz aus Repo:**
- `.husky/` enthält nur `pre-commit` + `commit-msg`. **Kein `pre-push`-Hook.**
- Slice 244 Phase 2 Catch-22-Output: *"4 of 4 required status checks are expected"* + *"protected branch hook declined"*
- ≥20 push-Events Slice 226-245 mit roter CI ohne dass jemand merkt → silent-fail-Pattern

## 1.2 Lösungs-Design

**`.husky/pre-push` NEU** mit 2 lokalen CI-Layer-Simulationen die pre-commit nicht abdeckt:

| Step | Simuliert | Latenz | Why |
|------|-----------|--------|-----|
| 1. `pnpm exec vitest run` | CI test-job | ~10-30s | pre-commit macht KEIN vitest (zu langsam), pre-push reicht |
| 2. `pnpm exec next build \| npx tsx scripts/check-bundle-size.ts` | CI build-job + Bundle-Budget-Gate | ~60s | Bundle-Budget wäre Slice 246 Drift gefangen |

**Bewusst NICHT in pre-push:**
- `tsc --noEmit` — **bereits in pre-commit** (Slice 243)
- `audit:type-truth + stale + wiring:check` — **bereits in pre-commit** (Slice 243)
- `pnpm run lint` — **bereits in pre-commit via lint-staged**

**Total pre-push-Latenz:** ~70-90s. Bewusst-vor-Push (vor netzwerk-Operation), akzeptabel im Solo-Dev-Workflow.

**Bypass:** `git push --no-verify` (gleiche Mechanik wie pre-commit). Bewusst opt-out möglich, aber CI fängt es noch (Slice 244 Phase 2 4 contexts).

## 1.3 Betroffene Files

- `.husky/pre-push` (NEU, executable)
- `.claude/rules/errors-infra.md` (Knowledge-Capture: enforce_admins=true Catch-22-Lehre)

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `.husky/pre-commit` | Pattern-Reference Slice 243 | Wie ist Hook strukturiert (set -e, echo-banner)? |
| `.github/workflows/ci.yml` | CI-Job-Mirroring | Welche Steps machen build + test job? |
| `package.json` | npm-Scripts | Genauer Befehl für vitest + bundle-budget? |
| `scripts/check-bundle-size.ts` | Bundle-Budget-Mechanik | Erwartet stdin? exit-code? |

## 1.5 Pattern-References

- **Slice 243 pre-commit-Erweiterung** — gleiche Husky-Architektur, gleicher Comment-Header-Stil
- **D45** (Hooks > Text-Regeln) — Pre-Push als architektonische Enforcement
- **Slice 244 Lehre** — enforce_admins=true Catch-22 Code-Capture in errors-infra.md

## 1.6 Acceptance Criteria

```
AC-01: .husky/pre-push existiert + executable + Husky-Standard-Format
AC-02: Pre-push hat 2 Steps: vitest run + (next build | check-bundle-size)
AC-03: Echo-Banner-Prefix "[pre-push]" analog pre-commit
AC-04: Comment-Header dokumentiert Why (Slice 248) + welche Steps in pre-commit liegen
AC-05: Smoke: lokales `git push --dry-run` ODER manueller `bash .husky/pre-push` läuft alle Steps + exit 0
AC-06: Negative-Test: vitest-Failure simulieren → pre-push exit 1 → Push BLOCKED
AC-07: Total-Latenz <100s (gemessen)
AC-08: errors-infra.md Knowledge-Capture: enforce_admins=true Catch-22-Lehre dokumentiert
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| Vitest schlägt lokal fehl | Push BLOCKED → muss gefixt werden |
| Bundle-Budget-Drift | Push BLOCKED |
| Build hat tsc-Error die nicht in pre-commit gefangen wurde | Push BLOCKED + Lehre für tsc-pre-commit-Erweiterung |
| `--no-verify` bei legitimer Notbremse | Hook geskipped — CI fängt es |
| Push aber kein lokaler State-Change | Hook läuft trotzdem (10-30s pure-overhead) — akzeptabel |

## 1.8 Self-Verification Commands

```bash
# Manueller Smoke-Test (ohne push):
bash .husky/pre-push

# Latenz-Messung
time bash .husky/pre-push

# Negative-Test: temporär brechen Test/Build, dann Push versuchen
# (Push-Versuch wird system-blocked, also Hook isoliert testen)
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — S Hook-Refinement ohne CEO-Scope, ohne Money-Path.

**Autonom-Zone (CTO):**
- Reihenfolge: vitest zuerst (schneller), dann build (langsamer)
- Comment-Format analog pre-commit
- Knowledge-Capture-Sektion in errors-infra.md "Cross-Cutting / Operational"

## 1.10 Proof-Plan

- `worklog/proofs/248-pre-push-smoke.txt` — Live-Run pre-push + Latency + Negative-Test

## 1.11 Scope-Out

- **enforce_admins=true wieder einschalten** → bewusst nicht (Catch-22 unauflösbar bei direct-push)
- **PR-Workflow für alle Slices** → Solo-Dev-Anti-Pattern, nicht angemessen
- **`audit:orphan` in pre-push** → 66s zu langsam, designed-state-exit-1 wartet auf Slice 239

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: Hook-only) → BUILD → REVIEW (self-review D35: Pattern-Wiederholung Slice 243) → PROVE → LOG

## 1.13 Pre-Mortem (S optional)

- **Risiko:** pre-push 90s ist zu lang, Anil entwickelt push --no-verify-Gewohnheit. Mitigation: Latenz-Budget dokumentiert, bei Future-Drift Optimierungs-Slice.
- **Risiko:** vitest schlägt lokal aber CI grün (env-mismatch). Mitigation: vitest-config sollte CI-identisch sein. Wenn nicht: Test-Mock-Repair-Pattern.
- **Risiko:** Build cache von next macht erste Run sehr langsam. Mitigation: pnpm exec next build hat .next-Cache, repeats schnell.
