# Slice 375 Review — DPC-Mastery-Feature entfernen + Mock-Cron stoppen

**Reviewer:** reviewer-Agent (cold context) · **Datum:** 2026-06-25 · **time-spent:** ~7 min
**Verdict:** CONCERNS (mergeable) → **alle 7 Findings adressiert/dokumentiert → effektiv PASS**

## Reviewer-Kernurteil
Removal chirurgisch sauber: Prop-Kette über 7 Files lückenlos zurückgebaut, beide orphan-Files real gelöscht, Barrel bereinigt, Migration korrekt (idempotent, Reihenfolge cron→fn→column, echte Engine nachweislich unberührt, greenfield-safe). Keine Nicht-Mastery-Logik beschädigt (YourPosition totalValue/avgCost/pnl + TradingCardFrame Card-Render intakt). Sauber unterschieden zwischen Mock-Feature (hold_days-Cron, weg) und gleichnamigen echten Features (Airdrop `mastery_score`-Dimension, `mastery_level_up`-Notification, Tabelle — bleiben).

## Findings (7, alle LOW/NIT/INFO — kein Bug)
| # | Sev | Location | Issue | Status |
|---|-----|----------|-------|--------|
| 1 | LOW | PlayerContent.test.tsx:410 | `masteryData: null` Fixture-Rest (any-Key, tsc-unsichtbar) | ✅ behoben |
| 2 | LOW | TradingTab.test.tsx:216 | `mastery: null` Prop-Rest | ✅ behoben |
| 3 | LOW | keys.ts:308-312 | `qk.mastery` orphan (S267) | ✅ entfernt |
| 4 | LOW | QueryProvider.tsx:59 | `'mastery'` in USER_SCOPED_DOMAINS orphan | ✅ entfernt |
| 5 | NIT | TraderTab.tsx:102 | stale Kommentar | ✅ entfernt |
| 6 | NIT | smallServices.test.ts:3 | stale Header-Kommentar | ✅ entfernt |
| 7 | INFO | globals.css:592-662 | tote `.card-tier-*` CSS | ⏸ bewusst belassen (mit `card-holographic` Tier-3+-Gating verwoben → Entfernen riskiert anderes Feature; inert, da keine Klasse mehr gesetzt) |

## Kernlehre (Knowledge Capture)
**Removal-5.-Achse — ungetypte Test-Fixtures:** Die 4-Achsen-Removal-Regel (Code/DB/i18n/Tooling) braucht eine 5. Achse: `any`-Test-Fixtures + extra React-Props sind tsc-unsichtbar UND vom Self-Verify-grep (`| grep -v __tests__`) systematisch ausgeschlossen → bei Removal Symbol-grep MUSS `__tests__` einschließen. Plus: `qk.*`-Factory + `USER_SCOPED_DOMAINS` = eigene Removal-Achsen (S267). → codifiziert in errors-frontend.md.

## one-line
Senior merged das — sauberer, vollständiger Feature-Removal; nichts Funktionales betroffen, Engine reversibel erhalten.
