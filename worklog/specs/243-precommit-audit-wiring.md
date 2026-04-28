# Slice 243 — Pre-commit-hook Audit-Wiring

**Größe:** XS
**Slice-Type:** Hook
**Datum:** 2026-04-28
**Bezug:** docs/test.rtf #8 (Pre-commit-hook macht tsc + lint, NICHT audit:type-truth, NICHT audit:orphan) — strukturell offen seit Slice 233/234.

## 1.1 Problem-Statement

`.husky/pre-commit` läuft NUR `tsc --noEmit` + `lint-staged`. Drei neu-gebaute Audit-Tools sind in `nightly-audit.yml` verkabelt aber lokal pre-commit blind.

**Evidenz aus Repo:**
- `cat .husky/pre-commit` → 2 Steps (tsc + lint-staged), keine `audit:*`.
- `git status` zeigt: ich kann lokal `audit:type-truth` brechen → CI fängt es 24h später → push ist schon raus, Notion-Sync passiert, beta-phase.md potentiell stale.
- Anil-Quote: *"Du kannst lokal Tests brechen und committen — CI fängt es, aber Push ist schon raus, Notion-Sync passiert, Logs werden geschrieben."*

## 1.2 Lösungs-Design

**Pre-commit erweitern um 3 schnelle Audits** (alle <8s, alle exit 0 aktuell):
- `audit:type-truth` (7.4s) — D43 Static-Pattern-Detection (3 Bug-Klassen)
- `audit:stale` (7.2s) — D48 Audit-Stale-Catcher
- `audit:wiring:check` (7.4s) — D54 Tool-Wiring-Gate

**Bewusst ausgeschlossen:**
- `audit:orphan` (66s + aktuell exit 1 wegen 9 known-unused) — gehört Backlog/Slice 239 oder pre-push. Pre-commit darf nicht 60s+ blocken.
- `audit:silent-fail:check` (~10s) — bereits in CI verkabelt via `nightly-audit.yml`. Pre-commit = Faster-Feedback-Layer, nicht Doppel-Verkabelung.
- `audit:mutation-race:check` — Bash-Script, läuft in CI, ähnlich wie silent-fail.

**Architektur-Konsistenz:** Slice 234 D54 hat Wiring im CI (nightly + post-deploy + ci.yml). Pre-commit ist die fehlende lokale Speed-Gate-Schicht.

## 1.3 Betroffene Files

- `.husky/pre-commit` — 3 NEU Steps zwischen tsc und lint-staged

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `.husky/pre-commit` | Source-of-Truth aktueller Hook | Wie sind Steps strukturiert (set -e, echo-banner)? |
| `package.json` | Audit-npm-scripts | Welche `:check`-Modi existieren? |
| `scripts/wiring-check.ts` | Wiring-Audit-Tool | Was prüft `--check`? |

## 1.5 Pattern-References

- **D54** (Slice 234) — Build-without-Wire-Verbot. Pre-commit-Wiring der neuen Audits ist letzter offener Layer.
- **D45** (Hooks > Text-Regeln) — Architektonische Enforcement statt Memory.
- **Slice 232 Pattern** — Hard-BLOCK über `set -e`-Mechanik.
- **Slice 234 D54-Pattern** — analog zu `ship-tool-wiring-gate.sh` BLOCK exit 2.

## 1.6 Acceptance Criteria

```
AC-01: .husky/pre-commit hat 3 NEU Steps zwischen tsc und lint-staged (in dieser Reihenfolge: type-truth, stale, wiring:check).
AC-02: Jeder Step echo-banner-prefix `[pre-commit]` analog existing.
AC-03: Smoke `git commit --allow-empty -m "test"` läuft alle 5 Steps durch (tsc + 3 audits + lint-staged), exit 0.
AC-04: Negative-Test: temporär Risk-Pattern in src/ einfügen → audit:type-truth detected → exit 1 → Commit BLOCKED.
AC-05: Pre-commit-Total-Latenz <50s (gemessen).
AC-06: README/CLAUDE.md erwähnen die neuen Audits NICHT (Hook-Self-Documenting via echo).
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| Audit-Tool exit 1 (echte Drift) | `set -e` triggers → Commit BLOCKED → Anil/CTO sieht Output |
| Audit-Tool fehlt (npm script renamed) | `set -e` triggers exit 127 → Commit BLOCKED + clear error |
| Pre-commit-Latenz steigt schleichend | Slice 243-Proof dokumentiert Baseline ~30-40s; Anil kann später opt-out via `git commit --no-verify` (aber dann CI fängt) |

## 1.8 Self-Verification Commands

```bash
# Smoke - alle Steps grün
git commit --allow-empty -m "test slice 243 smoke" --dry-run 2>&1 | head -20
# Wird durch husky abgefangen, aber zeigt Steps

# Latenz-Messung
time bash .husky/pre-commit

# Negative-Test (manuell)
# 1. Risk-Pattern in src/ einbauen z.B. `data as { foo: string }` ohne Discriminator
# 2. git add + git commit → erwartet BLOCK
# 3. Pattern wieder entfernen
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung:** keine — XS-Hook-Refinement ohne CEO-Scope, ohne Money-Path.

**Autonom-Zone (CTO):**
- Reihenfolge der 3 Audit-Steps (gewählt: type-truth → stale → wiring:check, alphabetisch + von strikter zu lockerer)
- Echo-Banner-Format
- Ob audit:orphan jetzt mit aufgenommen wird → **NEIN** (Begründung Sektion 1.2)

## 1.10 Proof-Plan

- `worklog/proofs/243-precommit-smoke.txt` — Live-Run pre-commit-hook mit Latency-Output
- Negative-Test-Verifikation (Risk-Pattern temporär einbauen, BLOCK verifizieren, revert)

## 1.11 Scope-Out

- **`audit:orphan` in pre-commit** → Backlog (siehe oben)
- **pre-push-hook** ergänzen → Slice 243+1 falls nötig
- **Branch-Protection-Erweiterung** → Slice 244 (separate Slice)
- **deferred-Re-Eval-Hook** → Slice 245

## 1.12 Stage-Chain (geplant)

SPEC → IMPACT (skipped: Hook-only, kein Cross-Domain) → BUILD → REVIEW (self-review D35: Pattern-Wiederholung Slice 234 D54) → PROVE → LOG

## 1.13 Pre-Mortem (XS optional)

- **Risiko:** Audit-Tool-Speed-Drift, pre-commit wird unbenutzbar langsam → Mitigation: Slice 243-Proof dokumentiert Baseline ~30-40s; bei +50% in Future neue Slice für Optimierung.
- **Risiko:** False-Positive eines Audit-Tools blockt legitime Commits → Mitigation: D52-Pattern (iterative tightening) bereits 6× live appliziert, Audit-Heuristik hardened.
