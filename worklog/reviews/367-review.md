# Review Slice 367 — E4 „Diamond Hands"-Cluster-Fix

**Verdict:** PASS (Reviewer-Agent, ~16 Min). Findings non-blocking.

## Findings
| # | Sev | Location | Issue | Fix |
|---|-----|----------|-------|-----|
| 1 | LOW (Produkt) | social.ts:441 | „ohne zu verkaufen" via created_at: Teil-Verkauf (qty 5→3) resettet created_at NICHT → Uhr läuft weiter trotz Teilverkauf. Nur Full-Sell auf qty=0 (Zombie-Trigger S025) resettet. | Bewusst großzügig; mit Anil klären (Description entschärfen „mind. 1 Card 30d gehalten" ODER updated_at-Reset). Kein Code-Blocker. |
| 2 | LOW (Test) | social.test.ts | Keine Regression-Tests für neue Hold-Logik (Buy heute→kein Unlock / 31d→Unlock). Genau diese Lücke ließ Original-Bug durch. | Follow-up: 2 Cases ergänzen. |
| 3 | INFO (Scope-Out) | mastery.ts:13/33/46 | DPC-Mastery-Leaderboard zeigt weiter geseedetes `hold_days`-Mock. Award-Pfad sauber entkoppelt. | Eigener Slice (E4 Mock→Pro). |
| 4 | INFO | scripts/add-i18n-keys-batch15.js | Historisches one-off-Script trägt „Diamond Hands". Kein Runtime-Reader. | Ignorieren. |

## Belege (Reviewer)
- **Rename vollständig** über 4 Live-Surfaces (de/tr messages, achievements.ts, DB achievement_definitions); Key `diamond_hands` durchgängig unverändert (kein FK-/Dedupe-Bruch in user_achievements). Alt-Migration 20260415132100 sauber durch späteren Timestamp überschrieben (kein Same-Day-Falle).
- **Logik:** created_at der ältesten Holding qty>0; Zombie-Delete-Trigger (S025) garantiert created_at = Position-Start; Buy-on-top behält created_at; Date-Math UTC-aware (kein TZ-Bug); null→0→kein Unlock; frischer Kauf <30→kein Award-on-buy. Original-Bug behoben.
- **Konfetti:** category!=='trading' Gate; 2. Pfad (ToastProvider `type==='celebration'`) geprüft — feuert NICHT im Trade/Buy-Pfad. feedback_no_confetti erfüllt.
- **Silent-Fail** `const{data}` ohne throw: stilkonsistent (alle 6 Lazy-Queries), fail-closed (Fehler→maxHoldDays=0→kein Unlock, money-near richtige Richtung). Akzeptabel.
- **Compliance:** „Treuer Sammler"/„Sadık Koleksiyoncu" = business.md-empfohlenes „Sammler/Koleksiyoncu"-Wording, keine Meme-/Securities-/Glücksspiel-Vokabel. Icon ⏳ entfernt Diamond-Assoziation. ✅

## Aktion Primary-Claude
- Finding #1+#2+#3 als Follow-up in handoff/findings notiert (kein Blocker).
- 2 Learnings ins Knowledge (gamification.md + ui-components.md) übernommen.
