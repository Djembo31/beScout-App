# Slice 250 — Self-Review (D35)

**Datum:** 2026-04-28
**Slice-Type:** Doc/Test (XS)
**Verdict:** PASS

## Pattern-Wiederholung (D35)

Slice 250 ist Pattern-Wiederholung von:
- **Slice 218** — Test-Mock-Repair ClubContent.test.tsx
- **Slice 247** — Test-Mock-Repair PredictionsTab.test.tsx
- **Slice 248 Phase B Investigation** — Root-Cause-Discovery

Trivial Test-Adjustment (3 Edits in 1 file). CTO-Self-Review ausreichend laut D35.

## Findings

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| — | — | keine | — |

## Checkliste

- [x] beforeAll lädt botUserIds (mit Comment-Header für Why)
- [x] INV-16 skipt Bots + Counter + log
- [x] INV-33 skipt Bots + Counter + log
- [x] INV-19 Whitelist erweitert mit players_mv_history (Slice 197d Comment)
- [x] Lokaler Smoke 39/39 PASS (war 36/3 fail)
- [x] Comment-Header dokumentiert Slice 250 Why + Slice 194 refresh-wallets.ts Source
- [x] Spec hat 13 Sektionen XS-konform

## Reviewer-Risk-Catch

- ✅ **Bot-Filter via handle LIKE 'bot%'** — funktioniert für e2e/bots/ai/bot-generator.ts Pattern. Echte User mit "bot..."-Handle unwahrscheinlich (handles unique).
- ✅ **botUserIds load failure → fail-fast** — beforeAll wirft, alle Tests fail. Korrekt designed.
- ✅ **INV-19 Whitelist-Wachstum** — Comment dokumentiert pro entry, keine silent expansion.
- ⚠️ **CI skipt diese Tests sowieso** (skipIntegration=true wenn process.env.CI). Lokaler Run zeigt jetzt grün — pre-push-Hook (Slice 248) bleibt grün.
- ⚠️ **Bot-Wallets können in Future als production-issue verschleiert werden** — wenn refresh-wallets.ts ungewollt in Production läuft. Mitigation: Das Script ist in e2e/bots/ai/, nur lokal triggerbar; Production-deployment hat keinen Cron-Bezug.

## Verdict

**PASS** — XS Test-Adjustment, klare Pattern-Wiederholung, kein Risk für Money/Trading-Code, kein CEO-Scope. Slice 249 als Production-Drift-Investigation **obsolet**, Slice 250 ist die saubere Auflösung.
