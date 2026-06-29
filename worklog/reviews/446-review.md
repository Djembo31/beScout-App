# Slice 446 Review — knowledge:check TZ-Bug Fix

**verdict: PASS** (self-review, Ops-Lane — XS Hook-Fix, kein Money/Security/user-facing)

## Scope
1 Zeile in `scripts/audit-knowledge.ts:155` — `today` von UTC (`toISOString().slice(0,10)`) auf lokale Berechnung (`getFullYear/getMonth/getDate`).

## Checks
- **Korrektheit:** `getFullYear/getMonth/getDate` sind lokale Getter; `getMonth()+1` + `padStart(2,'0')` ergeben sauberes `YYYY-MM-DD`. ✓
- **Live verifiziert:** `npx tsx scripts/audit-knowledge.ts` → Report `knowledge-2026-06-29.md` (lokal, vorher -28), HARD 0. ✓
- **Scope-Disziplin:** nur die verhaltensrelevante HARD-Block-Vergleichsstelle gefixt; 13 weitere `toISOString().slice(0,10)` in scripts/ sind Report-Dateinamen (kosmetisch) → bewusst nicht angefasst, als Smell in errors-infra.md S446 gemeldet. ✓
- **Regression-Risiko:** `today` wird nur für Datums-Vergleich (Check 8) + stale-Check (Check 6, monthsBetween — 1-Tag-Diff irrelevant) + Report-Name genutzt. Lokale Berechnung ist strikt korrekter für ein +0200-Projekt, konsistent mit git/log/CLAUDE. Kein Pfad wird schlechter.
- **Knowledge-Flywheel:** Pattern → `errors-infra.md` S446. ✓

## Findings
keine.
